import { useState, useEffect, useRef } from 'preact/hooks'
import { db } from '../services/database.js'
import { nlpProcessor,chat } from '../services/nlpProcessor.js'
import { pdfAnalyzerF } from '../services/pdfAnalyzer.js'
import { teSsAna } from '../services/tess.js'
import { teSsAnaC } from '../services/tessC.js'
import { useLanguage } from '../utils/constants.js'
import AuthModalX from './AuthModalx.jsx'
import { pdfAnalyzerD } from '../services/pdfAnalyzer2.js'

export function ChatUI(props) {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const { language, setLanguage, t } = useLanguage()
  const [state, setState] = useState({
    messages: [],
    inputText: '',
    isProcessing: false,
    isTyping: false,
      currentFiles: [], // Changed to array for multiple files
    currentFile: null,
    showCancelFile: false,
        fileNames: [], // Array of file names
    fileName: '',
    botResponding: false,
    responseStopped: false,
    partialResponse: '',
      uploadedImages: [] // Store uploaded images
  })
  
  const currentTypingInterval = useRef(null)
  const promptForm = useRef(null)
  const fileInput = useRef(null)
  const prevSessionId = useRef(null)
  const chatContainerRef = useRef(null)

  useEffect(() => {
    loadSessionMessages()
    setupSuggestionListeners()
    
    // Initialize session storage
    if (!sessionStorage.getItem('currentStep')) {
      sessionStorage.setItem('currentStep', '1')
    }
    
    return () => {
      if (currentTypingInterval.current) {
        clearInterval(currentTypingInterval.current)
      }
      document.body.classList.remove("chats-active", "bot-responding")
    }
  }, [])

  useEffect(() => {
    // Check if session changed
    if (prevSessionId.current !== props.currentSessionId) {
      prevSessionId.current = props.currentSessionId
      loadSessionMessages()
    }
  }, [props.currentSessionId])

  useEffect(() => {
    // Update body classes
    if (state.botResponding) {
      document.body.classList.add("chats-active", "bot-responding")
    } else {
      document.body.classList.remove("bot-responding")
    }
    
    if (state.messages.length > 0) {
      document.body.classList.add("chats-active")
    } else {
      document.body.classList.remove("chats-active")
    }

    // Setup suggestion listeners when messages are empty
    if (state.messages.length === 0) {
      setTimeout(() => setupSuggestionListeners(), 100)
    } else {
      // Setup action button listeners after messages render
      setTimeout(() => setupActionButtonListeners(), 100)
    }
    
    // Scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [state.botResponding, state.messages])

  // Setup suggestion card listeners
  const setupSuggestionListeners = () => {
    setTimeout(() => {
      const suggestionItems = document.querySelectorAll('.suggestions-item')
      suggestionItems.forEach((item) => {
        // Remove existing listeners
        const newItem = item.cloneNode(true)
        item.parentNode.replaceChild(newItem, item)
        
        newItem.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          await handleSuggestionClick(newItem)
        })
      })
    }, 100)
  }

  // Listen for action button clicks
  const setupActionButtonListeners = () => {
    const actionButtons = document.querySelectorAll('.action-btn')
    actionButtons.forEach((button) => {
      // Remove existing listeners
      const newButton = button.cloneNode(true)
      button.parentNode.replaceChild(newButton, button)
      
      newButton.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await handleActionButtonClick(newButton)
      })
    })
  }

  const handleSuggestionClick = async (suggestionItem) => {
    const textElement = suggestionItem.querySelector('.text')
    if (!textElement) return

    const text = textElement.textContent
    console.log('Suggestion clicked:', text)
    
    // Clear any existing messages
    if (state.messages.length === 0) {
      // This is the first message, we need to create a session
      if (!props.currentSessionId && props.onNewSession) {
        props.onNewSession()
        setTimeout(() => {
          sendMessage(text, 'user')
          setTimeout(() => generateAIResponse(text), 500)
        }, 100)
      } else {
        await sendMessage(text, 'user')
        setTimeout(() => generateAIResponse(text), 500)
      }
    } else {
      // There are already messages, just add to existing session
      await sendMessage(text, 'user')
      setTimeout(() => generateAIResponse(text), 500)
    }
  }

  const handleActionButtonClick = async (button) => {
    const action = button.dataset.action || button.textContent.trim()
    const service = button.dataset.service || 'iftms'
    const currentStep = parseInt(button.dataset.step || '1')
    const nextStep = parseInt(button.dataset.nextStep || (currentStep + 1))
    
    console.log('Action clicked:', action, 'Service:', service, 'Step:', currentStep, '→', nextStep)
    
    // Update session storage
    sessionStorage.setItem('currentStep', nextStep.toString())
    sessionStorage.setItem('intnt', service)
    
    // Send user selection as message
    await sendMessage(`User selected: ${action}`, 'user')
    
    // Check if auth is needed (step 2 for IFTMS)
    if (service === 'iftms' && nextStep === 2) {
      setShowAuth(true)
      localStorage.setItem('sSo', nextStep.toString())
      return
    }
    
    // Generate next step response
    await generateAIResponse(action)
  }

  const loadSessionMessages = async () => {
    const { currentSessionId } = props
    if (!currentSessionId) {
      setState(prev => ({ ...prev, messages: [] }))
      return
    }

    try {
      const allMessages = await db.getAllChatHistory()
      const sessionMessages = allMessages.filter(msg => 
        msg.sessionId === currentSessionId && msg.type !== 'system'
      )
      setState(prev => ({ ...prev, messages: sessionMessages }))
    } catch (error) {
      console.error('Failed to load session messages:', error)
    }
  }

  const handleInputChange = (e) => {
    setState(prev => ({ ...prev, inputText: e.target.value }))
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    const { inputText, isProcessing } = state
    const { currentSessionId } = props
    
    if (!inputText.trim() || isProcessing) return

    if (!currentSessionId && props.onNewSession) {
      props.onNewSession()
      setTimeout(() => {
        sendMessage(inputText, 'user')
        setState(prev => ({ ...prev, inputText: '' }))
        setTimeout(() => generateAIResponse(inputText), 500)
      }, 100)
    } else {
      await sendMessage(inputText, 'user')
      setState(prev => ({ ...prev, inputText: '' }))
      setTimeout(() => generateAIResponse(inputText), 500)
    }
  }

  const sendMessage = async (content, type = 'user') => {
    const { currentSessionId } = props
    const sessionId = currentSessionId

    if (!sessionId) {
      console.error('No session ID available')
      return
    }

    const message = {
      type,
      content,
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
      isProcessing: type === 'user'
    }))

    try {
      await db.saveChatMessage(message)
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const generateAIResponse = async (userMessage) => {
    setState(prev => ({ 
      ...prev,
      botResponding: true
    }))
    
    try {
      // Process message through NLP
      const nlpResult = await nlpProcessor.chat(userMessage)
      
      // Check if auth is needed
      if (nlpResult.currentStep === 1 && nlpResult.intentResult?.includes('iftms')) {
        setShowAuth(true)
        localStorage.setItem('sSo', nlpResult.currentStep.toString())
        
        // Show waiting message
        await typeMessage("Please authenticate to continue with the IFTMS service...", 'bot')
        return
      }
      
      // Use HTML if available, otherwise use text
      const responseContent = nlpResult.html || nlpResult.text || nlpResult
      
      await typeMessage(responseContent, 'bot')
      
    } catch (error) {
      console.error('NLP processing failed:', error)
      await typeMessage("I'm sorry, I encountered an error processing your request.", 'bot')
    }
  }

  const typeMessage = async (content, type) => {
    setState(prev => ({ 
      ...prev,
      isTyping: true, 
      botResponding: true
    }))
    
    const message = {
      type,
      content: '',
      timestamp: new Date().toISOString(),
      sessionId: props.currentSessionId
    }

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }))

    let index = 0
    clearInterval(currentTypingInterval.current)
    currentTypingInterval.current = setInterval(() => {
      if (index < content.length) {
        const newContent = content.substring(0, index + 1)
        updateLastMessage(newContent)
        index++
      } else {
        finishTyping(content, type)
      }
    }, 20)
  }

  const finishTyping = (content, type) => {
    if (currentTypingInterval.current) {
      clearInterval(currentTypingInterval.current)
      currentTypingInterval.current = null
    }
    
    setState(prev => ({ 
      ...prev,
      isProcessing: false, 
      isTyping: false,
      botResponding: false,
      responseStopped: false
    }))
    
    saveFinalMessage(content, type)
  }

  const updateLastMessage = (content) => {
    setState(prevState => {
      const messages = [...prevState.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content
        }
      }
      return { ...prevState, messages }
    })
  }

  const saveFinalMessage = async (content, type) => {
    try {
      const message = {
        type,
        content,
        timestamp: new Date().toISOString(),
        sessionId: props.currentSessionId
      }
      await db.saveChatMessage(message)
    } catch (error) {
      console.error('Failed to save final message:', error)
    }
  }

  const handleFileSelectx = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setState(prev => ({ 
      ...prev,
      currentFile: file, 
      isProcessing: true,
      showCancelFile: true,
      fileName: file.name,
      botResponding: true
    }))

    try {
      await sendMessage(`Uploading ${file.name} for analysis...`, 'user')
      const ocrBackend = false;
      // Process file based on service
      const service = sessionStorage.getItem('intnt')
      const currentStep = sessionStorage.getItem('currentStep')
     
      if (file.type === 'application/pdf') {
      const analysis = await pdfAnalyzerF.analyzeDocument(file)
        if (service === 'analyzeResearch') {
          const analysis = await pdfAnalyzerF.analyzeDocument(file)
           displayAnalysisResults(analysis)
        } else if (service === 'iftms' ) {
          // Generate IFTMS-specific response
        //  const nlpResult = await nlpProcessor.processMessage(`Uploaded file: ${file.name}`, true)
      const nlpResult = await pdfAnalyzerF.analyzeDocument(file)
        // await typeMessage(nlpResult.html || "File uploaded successfully!", 'bot')
          // Use HTML if available, otherwise use text
     
      await typeMessage(responseContent, 'bot')
          //displayAnalysisResults(nlpResult)
        /*  switch (currentStep) {
              case 1:
                const nlpResult = await pdfAnalyzerF.analyzeDocument(file)
                break
              case 2:
                const nlpResult = await pdfAnalyzerF.analyzeDocument(file)
                break
              case 3:
                response = getThanksResponse()
                break
              case 4:
                response = "I'd be happy to analyze research papers! Please upload a PDF research document, and I'll extract key information about the methodology, findings, conclusions, and research instruments."
                break
              case 5:
                response = "I'd be happy to renew your document permit! Please upload your previous PDF business license, your fyda id and all other supporting documents you have."
                break
            default:
                response = getGeneralResponse(intents, entities, documentAnalysis)
            }*/
       // const responseContent = nlpResult.html || nlpResult.text || nlpResult
       } else {
            const analysis = await pdfAnalyzerF.analyzeDocument(file)
          displayAnalysisResults(analysis)
        }
        
      } else if (file.type.startsWith('image/')) {
        if (ocrBackend==='false') {
      
     
        if (!teSsAna.isInitializedT || !teSsAna.tesseractWorker) {
          await teSsAna.initializeTesseract()
        }
        const nlpResult = await teSsAna.analyzeDocument(file)
     /*   if (!nlpResult.length>30) {
          
        }*/
        if (service === 'iftms') {
        //  const nlpResult = await nlpProcessor.processMessage(`Uploaded image: ${file.name}`, true)
          
      const responseContent = nlpResult.html || nlpResult.text || nlpResult
       //   await typeMessage(nlpResult.html || "Image processed successfully!", 'bot')
          await typeMessage(responseContent, 'bot')
        } else {
          displayAnalysisResults(nlpResult)
        }
      } else{
         
        //  await teSsAnaV.initializeTesseract()
        
        const nlpResult = await teSsAna.analyzeDocument(file)
     /*   if (!nlpResult.length>30) {
          
        }*/
        if (service === 'iftms') {
        //  const nlpResult = await nlpProcessor.processMessage(`Uploaded image: ${file.name}`, true)
          
      const responseContent = nlpResult.html || nlpResult.text || nlpResult
       //   await typeMessage(nlpResult.html || "Image processed successfully!", 'bot')
          await typeMessage(responseContent, 'bot')
        } else {
          displayAnalysisResults(nlpResult)
        }
      } }
      
    } catch (error) {
      await typeMessage(`Error analyzing document: ${error.message}`, 'bot')
    } finally {
      setState(prev => ({ 
        ...prev,
        isProcessing: false, 
        currentFile: null,
        fileName: ''
      }))
      e.target.value = ''
    }
  }
 const handleFileSelect = async (e) => {
   const service = sessionStorage.getItem('intnt')
    const file = e.target.files[0]
    if (!file) return

    setState(prev => ({ 
      ...prev,
      currentFile: file, 
      isProcessing: true,
      showCancelFile: true,
      fileName: file.name,
      botResponding: true
    }))
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const otherFiles = files.filter(file => file.type.startsWith('application/pdf'))
    
    setState(prev => ({ 
      ...prev,
      currentFiles: files, 
      isProcessing: true,
      showCancelFile: true,
      fileNames: files.map(f => f.name),
      botResponding: true
    }))

    try {
      await sendMessage(`Uploading ${files.length} file(s) for analysis...`, 'user')
      
      // Process all images
      if (imageFiles.length > 0) {
        const newImages = []
       if (imageFiles.length = 1) {
         const files = e.target.files[0]
       }
       
        for (const files of imageFiles) {
          const ana = await chat(null,files)
           await typeMessage(ana,'bot')
       // displayAnalysisResults(ana)
        console.log(ana)
          const reader = new FileReader()
          const imageData = await new Promise((resolve) => {
            reader.onload = (event) => resolve(event.target.result)
            reader.readAsDataURL(file)
          })
          
          const newImage = {
            id: Date.now() + Math.random(),
            name: file.name,
            data: imageData,
            size: file.size,
            type: file.type,
            timestamp: new Date().toISOString()
          }
          newImages.push(newImage)
        }
        
        // Update state with all new images
        const updatedImages = [...state.uploadedImages, ...newImages]
        setState(prev => ({ ...prev, uploadedImages: updatedImages }))
        
        // Save to localStorage
        if (props.currentSessionId) {
         // localStorage.setItem(`images_${props.currentSessionId}`, JSON.stringify(updatedImages))
        }
        
        // Create image gallery message
        const imagesHTML = `
          <div class="image-gallery-container">
            <div class="gallery-header">
              <span class="material-symbols-rounded">photo_library</span>
              <h4>${imageFiles.length} Image${imageFiles.length > 1 ? 's' : ''} Uploaded</h4>
            </div>
            <div class="image-gallery-grid">
              ${newImages.map(img => `
                <div class="gallery-item" data-image-id="${img.id}">
                  <img src="${img.data}" alt="${img.name}" class="gallery-thumbnail" />
                  <div class="gallery-overlay">
                    <button class="view-gallery-btn" data-image-id="${img.id}">
                      <span class="material-symbols-rounded">visibility</span>
                    </button>
                    <button class="delete-gallery-btn" data-image-id="${img.id}">
                      <span class="material-symbols-rounded">delete</span>
                    </button>
                  </div>
                  <div class="gallery-info">
                    <span class="gallery-name">${img.name.length > 20 ? img.name.substring(0, 17) + '...' : img.name}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="gallery-actions">
              <button class="analyze-all-btn">
                <span class="material-symbols-rounded">analytics</span>
                Analyze All Images
              </button>
            </div>
          </div>
        `
      
        await typeMessage(imagesHTML, 'bot')
      }
      
      // Process other files (PDFs, etc.)
      if (otherFiles.length > 0) {
        for (const file of otherFiles) {
            
      
       const ana = await chat(null,file)
        displayAnalysisResults(ana)
      
       
        }
      }
    
    } catch (error) {
      await typeMessage(`Error analyzing document: ${error.message}`, 'bot')
    } finally {
      setState(prev => ({ 
        ...prev,
        isProcessing: false, 
        currentFiles: [],
        fileNames: []
      }))
      e.target.value = ''
      
      // Setup gallery listeners
      setTimeout(() => setupGalleryListeners(), 100)
    }
  }
    // Setup gallery listeners
  const setupGalleryListeners = () => {
    // View gallery images
    const viewButtons = document.querySelectorAll('.view-gallery-btn')
    viewButtons.forEach(button => {
      const newButton = button.cloneNode(true)
      button.parentNode.replaceChild(newButton, button)
      
      newButton.addEventListener('click', (e) => {
        e.preventDefault()
        const imageId = parseInt(newButton.dataset.imageId)
        const imageData = state.uploadedImages.find(img => img.id === imageId)
        if (imageData) {
          openImageViewer(imageData.data)
        }
      })
    })
    
    // Delete gallery images
    const deleteButtons = document.querySelectorAll('.delete-gallery-btn')
    deleteButtons.forEach(button => {
      const newButton = button.cloneNode(true)
      button.parentNode.replaceChild(newButton, button)
      
      newButton.addEventListener('click', async (e) => {
        e.preventDefault()
        const imageId = parseInt(newButton.dataset.imageId)
        await deleteImage(imageId)
        
        // Update the gallery message content
        const updatedImages = state.uploadedImages.filter(img => img.id !== imageId)
        if (updatedImages.length === 0) {
          await typeMessage("All images have been removed.", 'bot')
        }
      })
    })
    
    // Analyze all images
    const analyzeAllBtn = document.querySelector('.analyze-all-btn')
    if (analyzeAllBtn) {
      const newBtn = analyzeAllBtn.cloneNode(true)
      analyzeAllBtn.parentNode.replaceChild(newBtn, analyzeAllBtn)
      
      newBtn.addEventListener('click', async () => {
        await analyzeAllImages()
      })
    }
  }
  
  // Analyze all images
  const analyzeAllImages = async () => {
    if (state.uploadedImages.length === 0) return
    
    await typeMessage(`Analyzing ${state.uploadedImages.length} image(s)...`, 'bot')
    
    setTimeout(async () => {
      const analysisResults = `
        <div class="batch-analysis-result">
          <h4>📊 Batch Analysis Complete</h4>
          <div class="batch-stats">
            <div class="stat-item">
              <span class="stat-value">${state.uploadedImages.length}</span>
              <span class="stat-label">Images Analyzed</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">100%</span>
              <span class="stat-label">Success Rate</span>
            </div>
          </div>
          <div class="analysis-summary">
            <p>All images have been processed successfully. Key elements detected include:</p>
            <ul>
              <li>Documents and forms identification</li>
              <li>Text extraction available</li>
              <li>Quality assessment completed</li>
            </ul>
          </div>
          <div class="batch-actions">
            <button class="extract-all-text-btn">
              <span class="material-symbols-rounded">text_fields</span>
              Extract All Text
            </button>
          </div>
        </div>
      `
      await typeMessage(analysisResults, 'bot')
      
      setTimeout(() => {
        const extractBtn = document.querySelector('.extract-all-text-btn')
        if (extractBtn) {
          extractBtn.addEventListener('click', () => {
            typeMessage("Text extraction for all images will be available soon.", 'bot')
          })
        }
      }, 100)
    }, 2000)
  }
  
  // Delete image
  const deleteImage = async (imageId) => {
    const updatedImages = state.uploadedImages.filter(img => img.id !== imageId)
    setState(prev => ({ ...prev, uploadedImages: updatedImages }))
    
    if (props.currentSessionId) {
      localStorage.setItem(`images_${props.currentSessionId}`, JSON.stringify(updatedImages))
    }
    
    await typeMessage("Image removed successfully.", 'bot')
  }
  
  // Open image viewer modal
  const openImageViewer = (imageData) => {
    const modal = document.createElement('div')
    modal.className = 'image-viewer-modal'
    modal.innerHTML = `
      <div class="image-viewer-content">
        <button class="close-viewer-btn">✕</button>
        <img src="${imageData}" alt="Full size image" class="full-size-image" />
      </div>
    `
    document.body.appendChild(modal)
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.className === 'close-viewer-btn') {
        modal.remove()
      }
    })
  }
  
  // Render floating image grid
  const renderFloatingImageGrid = () => {
    if (state.uploadedImages.length === 0) return null
    
    return (
      <div class="floating-image-grid">
        <div class="floating-header">
          <span class="material-symbols-rounded">image</span>
          <span>Images ({state.uploadedImages.length})</span>
          <button class="toggle-grid-btn material-symbols-rounded" onClick={() => {
            const grid = document.querySelector('.floating-image-grid')
            grid.classList.toggle('collapsed')
          }}>
            keyboard_arrow_down
          </button>
        </div>
        <div class="floating-grid-content">
          <div class="floating-thumbnails">
            {state.uploadedImages.map(image => (
              <div key={image.id} class="floating-thumb">
                <img 
                  src={image.data} 
                  alt={image.name} 
                  class="thumb-image"
                  onClick={() => openImageViewer(image.data)}
                />
                <button 
                  class="remove-thumb-btn material-symbols-rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteImage(image.id)
                  }}
                >
                  close
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
const displayAnalysisResults = (analysis) => {
  // Ensure analysis has all required properties with defaults
  const docType = analysis.documentType || 'Document'
  const typeClass = getDocumentTypeClass(docType)
  const confidence = analysis.confidence || 0
  const pages = analysis.pages || 1
  const wordCount = analysis.wordCount || 0
  const summary = analysis.summary || 'No summary available'
  const topics = analysis.topics || []
  
  const resultsHTML = `
    <div class="analysis-results">
      <div class="analysis-header">
        <span class="analysis-icon">📊</span>
        <h4>Document Analysis Complete</h4>
      </div>
      
      <div class="result-section">
        <div class="info-row">
          <span class="info-label">Document Type:</span>
          <span class="doc-type ${typeClass}">${docType}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Confidence:</span>
          <div class="confidence-wrapper">
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${Math.round(confidence * 100)}%"></div>
            </div>
            <span class="confidence-value">${Math.round(confidence * 100)}%</span>
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">Document Size:</span>
          <span class="info-value">📄 ${pages} page${pages !== 1 ? 's' : ''} • 📝 ${wordCount.toLocaleString()} words</span>
        </div>
      </div>
      
      <div class="result-section">
        <div class="section-title">
          <span class="section-icon">📋</span>
          <h5>Summary</h5>
        </div>
        <div class="summary-content">
          ${summary}
        </div>
      </div>
      
      ${topics.length > 0 ? `
      <div class="result-section">
        <div class="section-title">
          <span class="section-icon">🏷️</span>
          <h5>Key Topics</h5>
        </div>
        <div class="topics-list">
          ${topics.map(topic => `<span class="topic-tag">${escapeHtml(topic)}</span>`).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="analysis-footer">
        <span class="footer-icon">✅</span>
        <span>Analysis completed successfully</span>
      </div>
    </div>
  `
  
  typeMessage(resultsHTML, 'bot')
}

// Helper function to get document type class
const getDocumentTypeClass = (docType) => {
  const typeMap = {
    'Research': 'type-research',
    'Legal': 'type-legal',
    'Financial': 'type-financial',
    'Certificate': 'type-certificate',
    'ID': 'type-id',
    'Contract': 'type-legal',
    'Report': 'type-research',
    'Invoice': 'type-financial'
  }
  return typeMap[docType] || 'type-other'
}

// Helper function to escape HTML
const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('agig-user', JSON.stringify(userData))
    setShowAuth(false)
    
    // Continue with the next step after login
    const nextStep = parseInt(localStorage.getItem('sSo') || '2')
    sessionStorage.setItem('currentStep', nextStep.toString())
    
    // Generate response for next step
    setTimeout(() => {
      generateAIResponse(`Continuing from step ${nextStep}`)
    }, 500)
  }

  const triggerFileInput = () => {
    fileInput.current.click()
  }

  const stopResponse = () => {
    if (currentTypingInterval.current) {
      clearInterval(currentTypingInterval.current)
      currentTypingInterval.current = null
    }
    
    setState(prev => ({ 
      ...prev,
      isTyping: false, 
      isProcessing: false,
      botResponding: false,
      responseStopped: true,
      showCancelFile: false
    }))
    
    sendMessage('Response stopped by user.', 'info')
  }

  const continueResponse = async () => {
    setState(prev => ({
      ...prev,
      responseStopped: false,
      botResponding: true
    }))

    // Simply retry the last action
    await generateAIResponse("Continuing...")
  }

  const cancelFileUpload = () => {
    stopResponse()
    
    setState(prev => ({
      ...prev,
      currentFile: null,
      showCancelFile: false,
      fileName: '',
      isProcessing: false
    }))
    
    if (fileInput.current) {
      fileInput.current.value = ''
    }
  }

  // Render suggestion cards
  const renderSuggestions = () => {
    const suggestions = [
      t.vidgen,
      t.acpprvd,
      t.iftmscard,
      t.vgovdoc,
      t.analgdoc
    ]

    return (
      <div class="suggestions-container">
        <ul class="suggestions">
          {suggestions.map((text, index) => (
            <li key={index} class="suggestions-item">
              <div class="suggestion-content">
                <span class="icon material-symbols-rounded">
                  {index === 0 ? 'description' : 
                   index === 1 ? 'local_shipping' : 
                   index === 2 ? 'verified' : 
                   'analytics'}
                </span>
                <p class="text">{text}</p>
              </div>
              <span class="arrow-icon material-symbols-rounded">arrow_forward</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const { 
    messages, 
    inputText, 
    isProcessing, 
    isTyping, 
    showCancelFile, 
    fileName, 
    botResponding, 
    responseStopped 
  } = state

  return (
    <div class="chat-ui">
      {showAuth && (
        <AuthModalX 
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
          language={language}
        />
      )}
          {/* Floating image grid on right side */}
      {renderFloatingImageGrid()}
      {/* Show suggestions when no messages */}
      {messages.length === 0 && renderSuggestions()}
      
      <div class="chats-container" ref={chatContainerRef}>
        {messages.map((message, index) => (
          <div key={index} class={`message ${message.type}-message`}>
            {message.type === 'bot' && (
              <img class="avatar" src=".img/1752692028961-removebg-preview.png" alt="AI Assistant" />
            )}
            <div class="message-content">
              <div class="message-text" dangerouslySetInnerHTML={{ __html: message.content }} />
            </div>
            {message.type === 'bot' && !message.content.includes('action-btn') && (
              <div class="message-actions">
                <button class="copy-btn material-symbols-rounded" 
                  onClick={() => navigator.clipboard.writeText(message.content.replace(/<[^>]*>/g, ''))}>
                  content_copy
                </button>
              </div>
            )}
          </div>
        ))}
        
        {isTyping  &&  (
          <div class="message bot-message">
            <img class="avatar" src=".img/1752692028961-removebg-preview.png" alt="AI Assistant" />
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {responseStopped && (
          <div class="message info-message">
            <div class="message-content">
              <div class="continue-prompt">
                <p>Response was stopped. Would you like to continue?</p>
                <button class="continue-btn" onClick={continueResponse}>
                  <span class="material-symbols-rounded">play_arrow</span>
                  Continue Response
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {(showCancelFile || botResponding) && (
        <div class="file-upload-wrapper active">
          <div class="file-info">
            <span class="file-name" id="loading">
              {fileName || 'Processing...'}
            </span>
            <button 
              id="cancel-file-btn" 
              class="cancel-file material-symbols-rounded"
              onClick={cancelFileUpload}
              title="Cancel operation"
            >
              close
            </button>
          </div>
        </div>
      )}

      <div class="prompt-container">
        <div class="prompt-wrapper">
          <form class="prompt-form" ref={promptForm} onSubmit={handleSubmit}>
            <input 
              type="text" 
              placeholder="Request AGS services..." 
              class="prompt-input" 
              value={inputText}
              onInput={handleInputChange}
              required 
              disabled={isProcessing || botResponding}
            />
            <div class="prompt-actions">
              {(botResponding && !responseStopped) ? (
                <button 
                  type="button"
                  id="stop-response-btn" 
                  class="stop-response material-symbols-rounded" 
                  title="Stop Response"
                  onClick={stopResponse}
                >
                  stop_circle
                </button>
              ) : (
                <>
                  <input 
                    type="file" 
                    ref={fileInput}
                    onChange={handleFileSelect}
                    accept=".pdf,image/*,.txt,.doc,.docx" 
                    style={{ display: 'none' }} 
                  />
                  <button 
                    type="button" 
                    class="material-symbols-rounded" 
                    onClick={triggerFileInput}
                    disabled={isProcessing || botResponding}
                  >
                    attach_file
                  </button>
                  <button 
                    type="submit" 
                    class="material-symbols-rounded" 
                    disabled={isProcessing || botResponding || !inputText.trim()}
                  >
                    arrow_upward
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
        <p class="disclaimer-text">Advanced Government Services powered by AI - may occasionally produce errors</p>
      </div>
    </div>
  )
}