import { useState, useEffect, useRef } from 'preact/hooks'
import { db } from '../services/database.js'
import { nlpProcessor } from '../services/nlpProcessor.js'
import { pdfAnalyzerF } from '../services/pdfAnalyzer.js'
import { teSsAna } from '../services/tess.js'
import { useLanguage } from '../utils/constants.js'


export function ChatUI(props) {
  const [state, setState] = useState({
    messages: [],
    inputText: '',
    isProcessing: false,
    isTyping: false,
    currentFile: null,
    showCancelFile: false,
    fileName: '',
    botResponding: false,
    responseStopped: false,
    stoppedContext: null,
    stoppedMessage: '',
    stoppedType: '',
    partialResponse: ''
  })
  
  const typingInterval = useRef(null)
  const currentTypingInterval = useRef(null)
  const promptForm = useRef(null)
  const fileInput = useRef(null)
  const prevSessionId = useRef(null)
  const suggestionText = useRef('')
 const messagesEndRef = useRef(null);
  useEffect(() => {
    loadSessionMessages()
    setupSuggestionListeners()
    
    return () => {
      if (typingInterval.current) {
        clearInterval(typingInterval.current)
      }
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, state.isTyping]);
  
  useEffect(() => {
    // Update body classes based on state
    if (state.botResponding) {
      document.body.classList.add("chats-active", "bot-responding")
    } else {
      document.body.classList.remove("bot-responding")
    }
    
    // FIX: Only add chats-active when there are messages
    if (state.messages.length > 0) {
      document.body.classList.add("chats-active")
    } else {
      document.body.classList.remove("chats-active")
    }

    // Re-setup suggestion listeners when messages change
    if (state.messages.length === 0) {
      setTimeout(() => setupSuggestionListeners(), 100)
    }
  }, [state.botResponding, state.messages])

  const setupSuggestionListeners = () => {
    setTimeout(() => {
      const suggestionItems = document.querySelectorAll('.suggestions-item')
      suggestionItems.forEach((item) => {
        // Remove any existing listeners by cloning
        const newItem = item.cloneNode(true)
        item.parentNode.replaceChild(newItem, item)
        
        newItem.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          handleSuggestionClick(newItem)
        })
      })
    }, 100)
  }

  const handleSuggestionClick = (suggestionItem) => {
    const textElement = suggestionItem.querySelector('.text')
    if (!textElement) return

    const text = textElement.textContent
    console.log('Suggestion clicked:', text)
    
    // Store the text in ref for submission
    suggestionText.current = text
    
    // Submit directly
    const mockEvent = {
      preventDefault: () => {},
      target: promptForm.current
    }
    
    // Clear input and submit
    setState(prev => ({ ...prev, inputText: '' }))
    handleSubmitDirect(text, mockEvent)
  }

  const handleSubmitDirect = async (text, e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    const { isProcessing } = state
    const { currentSessionId } = props
    
    if (!text.trim() || isProcessing) return

    console.log('Submitting suggestion:', text)

    if (!currentSessionId && props.onNewSession) {
      props.onNewSession()
      setTimeout(() => {
        sendMessage(text, 'user')
        setTimeout(() => generateAIResponse(text), 500)
      }, 100)
    } else {
      await sendMessage(text, 'user')
      setTimeout(() => generateAIResponse(text), 500)
    }
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

    console.log('Submitting message:', inputText)

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

  const generateAIResponseC = async (userMessage) => {
    setState(prev => ({ 
      ...prev,
      botResponding: true,
      stoppedContext: { userMessage, type: 'prompt' },
      stoppedType: 'prompt'
    }))
    
    try {
      const nlpResult = nlpProcessor.processMessage(userMessage)
      const response = nlpProcessor.generateContextualResponse(nlpResult)
      await typeMessage(response, 'bot')
    } catch (error) {
      console.error('NLP processing failed:', error)
      await typeMessage("I'm sorry, I encountered an error processing your request.", 'bot')
    }
  }
const generateAIResponse = async (userMessage) => {
    setState(prev => ({ 
      ...prev,
      botResponding: true,
      stoppedContext: { userMessage, type: 'prompt' },
      stoppedType: 'prompt'
    }))
    
    try {
      // Check if we're in a service flow
      if (state.currentService) {
        const isFile = false // This is text input
        const response = await nlpProcessor.processStepInput(
          state.currentService,
          state.currentStep,
          userMessage,
          language,
          isFile
        )
        
        // Update step if needed
        if (response.nextStep) {
          sessionStorage.setItem('currentStep', response.nextStep.toString())
          setState(prev => ({ ...prev, currentStep: response.nextStep }))
        }
        
        await typeMessage(response.text, 'bot')
        
        // Store actions for step UI
        if (response.actions && response.actions.length > 0) {
          setState(prev => ({ ...prev, stepActions: response.actions }))
        }
      } else {
        // Original NLP processing
        const nlpResult = nlpProcessor.processMessage(userMessage)
        
        // Check if this starts a service flow
        if (nlpResult.intents.includes('iftms') || nlpResult.intents.includes('renewDoc')) {
          const service = nlpResult.intents.includes('iftms') ? 'iftms' : 'renewDoc'
          sessionStorage.setItem('currentService', service)
          sessionStorage.setItem('currentStep', '1')
          
          setState(prev => ({
            ...prev,
            currentService: service,
            currentStep: 1,
            showStepUI: true
          }))
          
          const serviceResponse = nlpProcessor.startServiceFlow(service)
          await typeMessage(serviceResponse.text, 'bot')
          
          if (serviceResponse.actions) {
            setState(prev => ({ ...prev, stepActions: serviceResponse.actions }))
          }
        } else {
          const response = nlpProcessor.generateContextualResponse(nlpResult)
          await typeMessage(response, 'bot')
        }
      }
    } catch (error) {
      console.error('AI response generation failed:', error)
      await typeMessage("I'm sorry, I encountered an error processing your request.", 'bot')
    }
  }
  const typeMessage = async (text, type) => {
    setState(prev => ({ 
      ...prev,
      isTyping: true, 
      botResponding: true,
      stoppedMessage: text
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
    currentTypingInterval.current = setInterval(() => {
      if (index < text.length) {
        const newContent = text.substring(0, index + 1)
        updateLastMessage(newContent)
        setState(prev => ({ ...prev, partialResponse: newContent }))
        index++
      } else {
        finishTyping(text, type)
      }
    }, 20)
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
    const { stoppedContext, stoppedMessage, stoppedType, partialResponse } = state
    
    setState(prev => ({
      ...prev,
      responseStopped: false,
      botResponding: true
    }))

    if (stoppedType === 'file' && stoppedContext?.file) {
      await continueFileProcessing(stoppedContext.file, partialResponse || '')
    } else if (stoppedType === 'prompt' && stoppedContext?.userMessage) {
      await continuePromptResponse(stoppedContext.userMessage, partialResponse || '')
    }
  }

  const continueFileProcessing = async (file, partialContent = '') => {
    setState(prev => ({ 
      ...prev,
      botResponding: true,
      showCancelFile: true,
      fileName: file.name
    }))

    try {
      if (file.type === 'application/pdf') {
        const analysis = await pdfAnalyzerF.analyzeDocument(file)
        const remainingContent = getRemainingContent(analysis, partialContent)
        if (remainingContent) {
          await typeMessage(remainingContent, 'bot')
        } else {
          finishTyping('', 'bot')
        }
      } else if (file.type.startsWith('image/')) {
        if (!teSsAna.isInitializedT || !teSsAna.tesseractWorker) {
            await teSsAna.initializeTesseract()
        }
        const textT = await teSsAna.analyzeDocument(file)
        const remainingContent = getRemainingContent(textT, partialContent)
        if (remainingContent) {
          await typeMessage(remainingContent, 'bot')
        } else {
          finishTyping('', 'bot')
        }
      }
    } catch (error) {
      await typeMessage(`Error analyzing document: ${error.message}`, 'bot')
    }
  }

  const continuePromptResponse = async (userMessage, partialContent = '') => {
    try {
      const nlpResult = nlpProcessor.processMessage(userMessage)
      const fullResponse = nlpProcessor.generateContextualResponse(nlpResult)
      
      const remainingContent = getRemainingContent(fullResponse, partialContent)
      if (remainingContent) {
        await typeMessage(remainingContent, 'bot')
      } else {
        finishTyping('', 'bot')
      }
    } catch (error) {
      console.error('NLP processing failed:', error)
      await typeMessage("I'm sorry, I encountered an error processing your request.", 'bot')
    }
  }

  const getRemainingContent = (fullContent, partialContent) => {
    if (!partialContent) return fullContent
    
    const cleanPartial = partialContent.replace(/<[^>]*>/g, '')
    const cleanFull = fullContent.replace(/<[^>]*>/g, '')
    
    if (cleanFull.endsWith(cleanPartial)) {
      return ''
    }
    
    const partialIndex = cleanFull.indexOf(cleanPartial)
    if (partialIndex !== -1) {
      const remainingIndex = partialIndex + cleanPartial.length
      return fullContent.slice(remainingIndex)
    }
    
    return fullContent
  }

  const finishTyping = (text, type) => {
    if (currentTypingInterval.current) {
      clearInterval(currentTypingInterval.current)
      currentTypingInterval.current = null
    }
    
    setState(prev => ({ 
      ...prev,
      isProcessing: false, 
      isTyping: false,
      botResponding: false,
      responseStopped: false,
      stoppedContext: null,
      stoppedMessage: '',
      partialResponse: ''
    }))
    
    saveFinalMessage(text, type)
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
      botResponding: true,
      stoppedContext: { file, type: 'file' },
      stoppedType: 'file'
    }))

    try {
      await sendMessage(`Uploading ${file.name} for analysis...`, 'user')
      if (file.type === 'application/pdf') {
        const analysis = await pdfAnalyzerF.analyzeDocument(file)
        displayAnalysisResults(analysis)
      } else if (file.type.startsWith('image/')) {
        if (!teSsAna.isInitializedT || !teSsAna.tesseractWorker) {
            await teSsAna.initializeTesseract()
        }
        const textT = await teSsAna.analyzeDocument(file)
        console.log(textT)
        displayAnalysisResults(textT)
      } else {
        throw new Error('Unsupported file type')
      }
      
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
// Update the handleFileSelect function in ChatUI.jsx
const handleFileSelect = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  setState(prev => ({ 
    ...prev,
    currentFile: file, 
    isProcessing: true,
    showCancelFile: true,
    fileName: file.name,
    botResponding: true,
    stoppedContext: { file, type: 'file' },
    stoppedType: 'file'
  }))

  try {
    await sendMessage(`Uploading ${file.name}...`, 'user')
    
    if (file.type === 'application/pdf') {
      const analysis = await pdfAnalyzerF.analyzeDocument(file)
      displayAnalysisResults(analysis)
    } else if (file.type.startsWith('image/')) {
      // Always use Tesseract.js now
      if (!teSsAna.isInitializedT || !teSsAna.tesseractWorker) {
        await teSsAna.initializeTesseract()
      }
      const textT = await teSsAna.analyzeDocument(file)
      displayAnalysisResults(textT)
    } else {
      throw new Error('Unsupported file type. Please use PDF or image files.')
    }
    
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
 // Add this new render function for step UI
  const renderStepUI = () => {
    if (!state.showStepUI || !state.currentService) return null
    
    const serviceName = state.currentService === 'iftms' ? 'IFTMS' : 'License Renewal'
    
    return (
      <div class="service-flow-ui">
        <div class="step-header">
          <div class="step-indicator">
            <div class="step-line">
              {[1, 2, 3, 4].map(stepNum => (
                <div 
                  key={stepNum} 
                  class={`step-dot ${state.currentStep >= stepNum ? 'active' : ''} ${state.currentStep === stepNum ? 'current' : ''}`}
                >
                  {stepNum}
                </div>
              ))}
            </div>
            <div class="step-labels">
              <span>Verify</span>
              <span>Documents</span>
              <span>Payment</span>
              <span>Complete</span>
            </div>
          </div>
          
          <div class="service-info">
            <h3>{serviceName}</h3>
            <span class="current-step">Step {state.currentStep}/4</span>
          </div>
        </div>
        
        {state.stepActions.length > 0 && (
          <div class="step-action-buttons">
            {state.stepActions.map((action, index) => (
              <button 
                key={index}
                class="step-action-btn"
                onClick={() => handleStepAction(action)}
                disabled={state.isProcessing || state.botResponding}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
  const displayAnalysisResults = (analysis) => {
    const resultsHTML = `
      <div class="analysis-results">
        <h4>📊 Document Analysis Complete</h4>
        <div class="result-section">
          <p><strong>Document Type:</strong> <span class="doc-type ${analysis.typeClass}">${analysis.documentType}</span></p>
          <p><strong>Confidence:</strong> ${Math.round(analysis.confidence * 100)}%</p>
          <p><strong>Pages/Words:</strong> ${analysis.pages} pages, ${analysis.wordCount} words</p>
        </div>
        <div class="result-section">
          <h5>Summary</h5>
          ${analysis.summary}
        </div>
        ${analysis.topics && analysis.topics.length > 0 ? `
        <div class="result-section">
          <h5>Key Topics</h5>
          <div class="topics-list">
            ${analysis.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `
    
    typeMessage(resultsHTML, 'bot')
  }

  const triggerFileInput = () => {
    fileInput.current.click()
  }

  const renderSuggestions = () => {
    const suggestions = [
      'academic paper review',
      'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት',
      'Verify government documents',
      'Analyze legal documents'
    ]

    return (
      <ul class="suggestions">
        {suggestions.map((text, index) => (
          <li key={index} class="suggestions-item">
            <p class="text">{text}</p>
            <span class="icon material-symbols-rounded">
              {index === 0 ? 'draw' : index === 1 ? '💰' : index === 2 ? 'explore' : 'code_blocks'}
            </span>
          </li>
        ))}
      </ul>
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
      {state.showStepUI && renderStepUI()}
      
      {state.messages.length === 0 && !state.showStepUI && renderSuggestions()}
      
      <div class="chats-container" ref={messagesEndRef}>
        {state.messages.map((message, index) => (
          <div key={index} class={`message ${message.type}-message`}>
            {message.type === 'bot' && (
              <img class="avatar" src=".img/1752692028961-removebg-preview.png" alt="AI Assistant" />
            )}
            <div class="message-content">
              <div class="message-text" dangerouslySetInnerHTML={{ __html: message.content }} />
            </div>
            {message.type === 'bot' && (
              <div class="message-actions">
                <button class="copy-btn material-symbols-rounded" 
                  onClick={() => navigator.clipboard.writeText(message.content.replace(/<[^>]*>/g, ''))}>
                  content_copy
                </button>
              </div>
            )}
          </div>
        ))}
        
        {state.isTyping && (
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
        
        {state.responseStopped && (
          <div class="message info-message">
            <div class="message-content">
              <div class="continue-prompt">
                <p>Response was stopped. Would you like to continue?</p>
                <button 
                  class="continue-btn"
                  onClick={state.continueResponse}
                >
                  <span class="material-symbols-rounded">play_arrow</span>
                  Continue Response
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {(state.showCancelFile || state.botResponding) && (
        <div class="file-upload-wrapper active">
          <div class="file-info">
            <span class="file-name">
              {state.fileName || 'Processing...'}
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
              placeholder="Ask about document analysis..." 
              class="prompt-input" 
              value={state.inputText}
              onInput={handleInputChange}
              required 
              disabled={state.isProcessing || state.botResponding}
            />
            <div class="prompt-actions">
              {/* This should show when bot is responding */}
              {(state.botResponding && !state.responseStopped) ? (
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
                    disabled={state.isProcessing || state.botResponding}
                  >
                    attach_file
                  </button>
                  <button 
                    type="submit" 
                    class="material-symbols-rounded" 
                    disabled={state.isProcessing || state.botResponding || !state.inputText.trim()}
                  >
                    arrow_upward
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
        <p class="disclaimer-text">Document analysis powered by AI - may occasionally produce errors</p>
      </div>
    </div>
  )
}