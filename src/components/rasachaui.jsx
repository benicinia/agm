import { useState, useEffect, useRef } from 'preact/hooks'
import { db } from '../services/database.js'
import { rasaClient } from '../services/rasaClient.js' // Import RASA client
import { useLanguage } from '../utils/constants.js'
import AuthModalX from './AuthModalx.jsx'

export function ChatUI(props) {
  const [user, setUser] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const { language, setLanguage, t } = useLanguage()
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
    partialResponse: '',
    rasaConnected: false // Track RASA connection
  })
  
  const currentTypingInterval = useRef(null)
  const promptForm = useRef(null)
  const fileInput = useRef(null)
  const prevSessionId = useRef(null)
  const chatContainerRef = useRef(null)

  // Initialize RASA on component mount
  useEffect(() => {
    const initializeRASA = async () => {
      console.log('🔄 Initializing RASA connection...')
      const connected = await rasaClient.init()
      setState(prev => ({ ...prev, rasaConnected: connected }))
      
      if (connected) {
        console.log('✅ RASA connected successfully')
      } else {
        console.warn('⚠️ RASA not connected, using fallback mode')
      }
    }
    
    initializeRASA()
    loadSessionMessages()
    setupSuggestionListeners()
    
    return () => {
      if (currentTypingInterval.current) {
        clearInterval(currentTypingInterval.current)
      }
      document.body.classList.remove("chats-active", "bot-responding")
    }
  }, [])

  // Update generateAIResponse function to use RASA
  const generateAIResponse = async (userMessage) => {
    setState(prev => ({ 
      ...prev,
      botResponding: true,
      isProcessing: true
    }))
    
    try {
      // Use RASA client instead of nlpProcessor
      const rasaResponse = await rasaClient.processMessage(userMessage)
      
      // Type out the response
      await typeMessage(rasaResponse.html || rasaResponse.text, 'bot', rasaResponse)
      
    } catch (error) {
      console.error('RASA processing failed:', error)
      await typeMessage("I'm sorry, I encountered an error processing your request.", 'bot')
    } finally {
      setState(prev => ({ 
        ...prev,
        isProcessing: false,
        botResponding: false
      }))
    }
  }

  // Update handleFileSelect to use RASA
  const handleFileSelect = async (e) => {
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
      
      // Determine document type based on current step
      const currentStep = sessionStorage.getItem('currentStep') || '1'
      const currentService = sessionStorage.getItem('currentService') || 'iftms'
      
      let documentType = 'Document'
      if (currentService === 'iftms') {
        if (currentStep === '1') documentType = 'Business License'
        else if (currentStep === '2') documentType = 'Vehicle Document'
        else if (currentStep === '3') documentType = 'Driver Document'
      }
      
      // Process file with RASA
      const rasaResponse = await rasaClient.processFileUpload(file, documentType, currentStep)
      
      // Type out the response
      await typeMessage(rasaResponse.html || rasaResponse.text, 'bot', rasaResponse)
      
    } catch (error) {
      await typeMessage(`Error processing document: ${error.message}`, 'bot')
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

  // Update typeMessage to handle RASA responses
  const typeMessage = async (content, type, rasaResponse = null) => {
    setState(prev => ({ 
      ...prev,
      isTyping: true, 
      botResponding: true
    }))
    
    const message = {
      type,
      content: '',
      timestamp: new Date().toISOString(),
      sessionId: props.currentSessionId,
      rasaResponse // Store RASA response data
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
        finishTyping(content, type, rasaResponse)
      }
    }, 20)
  }

  const finishTyping = (content, type, rasaResponse) => {
    if (currentTypingInterval.current) {
      clearInterval(currentTypingInterval.current)
      currentTypingInterval.current = null
    }
    
    // If RASA response has session data, update storage
    if (rasaResponse && rasaResponse.sessionData) {
      Object.entries(rasaResponse.sessionData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          sessionStorage.setItem(key, value.toString())
        } else if (typeof value === 'object') {
          sessionStorage.setItem(key, JSON.stringify(value))
        } else {
          sessionStorage.setItem(key, value)
        }
      })
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

  // Add RASA status indicator to your render
  const renderRasaStatus = () => {
    if (!state.rasaConnected) {
      return (
        <div class="rasa-status offline">
          <span class="status-dot"></span>
          <span class="status-text">AI Assistant (Offline Mode)</span>
        </div>
      )
    }
    
    return (
      <div class="rasa-status online">
        <span class="status-dot"></span>
        <span class="status-text">AI Assistant (Connected)</span>
      </div>
    )
  }

  // Update JSX to include status
  return (
    <div class="chat-ui">
      {showAuth && (
        <AuthModalX 
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
          language={language}
        />
      )}
      
      {/* RASA Status Indicator */}
      {renderRasaStatus()}
      
      {/* Rest of your component remains the same... */}
    </div>
  )
}