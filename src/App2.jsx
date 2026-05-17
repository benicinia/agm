// App.jsx
import { useState, useEffect, useRef } from 'preact/hooks'
import { ChatUI } from './components/ChatUI.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { AuthModal } from './components/AuthModal.jsx'

import { db } from './services/database.js'
import { nlpProcessor, onWorkerProgress } from './services/nlpProcessor.js'
import { pdfAnalyzerF } from './services/pdfAnalyzer.js'
import { pdfAnalyzerD } from './services/pdfAnalyzer2.js'
import { teSsAna } from './services/tess.js'
import { auth } from './services/auth.js'
import { pwa } from './services/pwa.js'
import { googleSearch, initGOOGLEsearch } from './services/duck.js'
import { useLanguage } from './utils/constants.js'
import AuthModalX from './components/AuthModalx.jsx'
import { isNativePlatform, getModelDownloadStatus, startModelDownload } from './services/modelManager.js'

export function App() {
  
  const [initialized, setInitialized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [ocrStatus, setOcrStatus] = useState('idle')
  const [currentStep, setCurrentStep] = useState(1)
  const [user, setUser] = useState(null)
  const { language, setLanguage, t } = useLanguage()
  
  // Model download states
  const [modelDownloadStatus, setModelDownloadStatus] = useState({
    isDownloading: false,
    currentModel: '',
    progress: 0,
    status: 'pending', // 'pending', 'downloading', 'ready', 'error'
    error: null
  })
  
  const authPollInterval = useRef(null)

  useEffect(() => {
    initializeApp()
    loadSessions()
    
    // Listen to worker progress events
    onWorkerProgress((data) => {
      console.log('Worker progress:', data)
      setModelDownloadStatus(prev => ({
        ...prev,
        currentModel: data.model || prev.currentModel,
        progress: data.progress || prev.progress,
        status: data.status === 'ready' ? 'ready' : 'downloading'
      }))
    })
    
    authPollInterval.current = setInterval(() => {
      checkAuthState()
    }, 1000)

    return () => {
      if (authPollInterval.current) {
        clearInterval(authPollInterval.current)
      }
      if (teSsAna.destroy) teSsAna.destroy()
    }
  }, [])

  const initializeOCR = async () => {
    try {
      setOcrStatus('loading')
      console.log('🔄 Initializing Tesseract.js OCR...')
      
      await teSsAna.init()
      await teSsAna.initializeTesseract()
      console.log('✅ Tesseract.js OCR initialized')
      setOcrStatus('ready')
    } catch (error) {
      console.error('❌ OCR initialization failed:', error)
      setOcrStatus('error')
    }
  }

  const initG = async () => {
    try {
      googleSearch()
      initGOOGLEsearch()
      console.log('✅ google search initialized')
    } catch (error) {
      console.error('❌ Google search initialization failed:', error)
    }
  }

  // Check if models are already downloaded on Android
  const checkModelStatus = async () => {
    if (isNativePlatform()) {
      console.log('📱 Running on Android - checking model download status...')
      const status = await getModelDownloadStatus()
      
      if (status.allDownloaded) {
        console.log('✅ Models already downloaded on device')
        setModelDownloadStatus(prev => ({
          ...prev,
          status: 'ready',
          progress: 100
        }))
        return true
      } else {
        console.log('📥 Models need to be downloaded')
        return false
      }
    } else {
      console.log('🌐 Running in browser - will use cached models')
      return true // Browser uses CDN, no pre-download needed
    }
  }

  // Download models on Android with progress tracking
  const downloadModelsIfNeeded = async () => {
    if (!isNativePlatform()) {
      console.log('🌐 Browser mode - skipping download, will load from CDN')
      return true
    }

    setModelDownloadStatus({
      isDownloading: true,
      currentModel: 'Checking...',
      progress: 0,
      status: 'downloading',
      error: null
    })

    try {
      const result = await startModelDownload((progressEvent) => {
        setModelDownloadStatus(prev => ({
          ...prev,
          currentModel: progressEvent.modelId,
          progress: progressEvent.progress * 100,
          status: 'downloading'
        }))
        console.log(`📥 Downloading ${progressEvent.modelId}: ${(progressEvent.progress * 100).toFixed(1)}%`)
      })

      if (result.success) {
        setModelDownloadStatus({
          isDownloading: false,
          currentModel: '',
          progress: 100,
          status: 'ready',
          error: null
        })
        console.log('✅ All models downloaded successfully')
        return true
      } else {
        throw new Error(result.error || 'Download failed')
      }
    } catch (error) {
      console.error('❌ Model download failed:', error)
      setModelDownloadStatus({
        isDownloading: false,
        currentModel: '',
        progress: 0,
        status: 'error',
        error: error.message
      })
      return false
    }
  }

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting DocAnalyzer App Initialization...')
      
      // Step 1: Initialize database
      await db.init()
      console.log('✅ Database initialized')
      
      // Step 2: Check and download models (Android only)
      const modelsReady = await checkModelStatus()
      
      if (isNativePlatform() && !modelsReady) {
        // Show download UI and wait for user or auto-start download
        console.log('📥 Starting model download...')
        const downloadSuccess = await downloadModelsIfNeeded()
        
        if (!downloadSuccess) {
          console.warn('⚠️ Model download failed, continuing with limited functionality')
          // Still continue but warn user
        }
      }
      
      // Step 3: Initialize NLP processor (will load models from device or CDN)
      console.log('🔄 Initializing NLP Processor...')
      
      // Set a timeout for NLP initialization to prevent infinite waiting
      const nlpPromise = nlpProcessor.init()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('NLP initialization timeout')), 120000) // 2 minute timeout
      )
      
      try {
        await Promise.race([nlpPromise, timeoutPromise])
        console.log('✅ NLP Processor initialized')
      } catch (error) {
        console.error('⚠️ NLP initialization issue:', error)
        // Continue even if NLP fails - app will use fallback responses
      }
      
      // Step 4: Initialize other services in parallel
      await Promise.allSettled([
        pdfAnalyzerF.init(),
        pdfAnalyzerD.init(),
        initializeOCR(),
        initG(),
        pwa.init()
      ])
      
      console.log('✅ PDF Analyzers initialized')
      console.log('✅ OCR initialized')
      console.log('✅ Google search initialized')
      console.log('✅ PWA initialized')
      
      if (auth && auth.init) {
        auth.init()
        console.log('✅ Auth initialized')
      }
      
      setInitialized(true)
      console.log('🎉 DocAnalyzer PWA initialized successfully!')
      
    } catch (error) {
      console.error('💥 App initialization failed:', error)
      setInitialized(true) // Continue even if some services fail
    }
  }

  useEffect(() => {
    // Re-initialize App when language changes (but don't re-download models)
    if (initialized) {
      console.log('Language changed, reinitializing services...')
      nlpProcessor.init().catch(console.error)
    }
  }, [language])

  const checkAuthState = () => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      const isAuthenticated = !!savedUser
      const currentUser = savedUser ? JSON.parse(savedUser) : null
      
      updateAuthUI(isAuthenticated, currentUser)
      
    } catch (error) {
      console.error('Error checking auth state:', error)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('agig-user', JSON.stringify(userData))
    setShowAuth(false)
  }

  const updateAuthUI = (isAuthenticated, currentUser) => {
    const authBtn = document.querySelector('.auth-btn')
    if (authBtn) {
      const authText = authBtn.querySelector('.auth-text')
      const authIcon = authBtn.querySelector('.material-symbols-rounded')
      
      if (authText && authIcon) {
        if (isAuthenticated && currentUser) {
          authText.textContent = currentUser.name || 'My Account'
        } else {
          authText.textContent = 'Sign In'
          authIcon.textContent = 'account_circle'
        }
      }
    }
  }

  const loadSessions = async () => {
    try {
      const history = await db.getChatHistory(200)
      const groupedSessions = groupMessagesBySession(history)
      setSessions(groupedSessions)
      
      if (groupedSessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(groupedSessions[0].sessionId)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const groupMessagesBySession = (messages) => {
    const sessionsMap = new Map()
    
    messages.forEach(message => {
      const sessionId = message.sessionId || 'default'
      
      if (!sessionsMap.has(sessionId)) {
        sessionsMap.set(sessionId, {
          sessionId,
          messages: [],
          timestamp: message.timestamp,
          preview: '',
          messageCount: 0
        })
      }
      
      const session = sessionsMap.get(sessionId)
      session.messages.push(message)
      session.messageCount++
      
      if (new Date(message.timestamp) > new Date(session.timestamp)) {
        session.timestamp = message.timestamp
      }
      
      if (!session.preview && message.type === 'user') {
        session.preview = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
      }
    })
    
    return Array.from(sessionsMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  const startNewChat = () => {
    const newSessionId = generateSessionId()
    setCurrentSessionId(newSessionId)
    saveSessionStart(newSessionId)
  }

  const saveSessionStart = async (sessionId) => {
    try {
      await db.saveChatMessage({
        type: 'system',
        content: 'SESSION_START',
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      })
      await loadSessions()
    } catch (error) {
      console.error('Failed to save session start:', error)
    }
  }

  const setCurrentSession = (sessionId) => {
    setCurrentSessionId(sessionId)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const toggleAuthModal = () => {
    console.log('Toggle auth modal clicked')
    setAuthModalOpen(!authModalOpen)
  }

  const handleAuthSuccess = () => {
    console.log('Auth success, closing modal')
    setTimeout(() => {
      checkAuthState()
    }, 500)
    setAuthModalOpen(false)
  }

  // Render loading screen with model download progress
  if (!initialized) {
    return (
      <div class="loading-screen">
        <div class="spinner"></div>
        <p>Initializing AGIG...</p>
        
        {/* Model download progress for Android */}
        {isNativePlatform() && modelDownloadStatus.status === 'downloading' && (
          <div class="model-download-progress">
            <p>Downloading AI Models to Device Storage...</p>
            <p class="current-model">{modelDownloadStatus.currentModel}</p>
            <div class="progress-bar">
              <div 
                class="progress" 
                style={{ width: `${modelDownloadStatus.progress}%` }}
              />
            </div>
            <p class="progress-text">{Math.round(modelDownloadStatus.progress)}%</p>
            <p class="info-text">This is a one-time download. Models will be stored on your device.</p>
          </div>
        )}
        
        {/* Model ready message */}
        {isNativePlatform() && modelDownloadStatus.status === 'ready' && (
          <div class="model-ready">
            <p>✅ AI Models Ready</p>
            <p>Loading application...</p>
          </div>
        )}
        
        {/* Model error message */}
        {isNativePlatform() && modelDownloadStatus.status === 'error' && (
          <div class="model-error">
            <p>❌ Failed to download AI models</p>
            <p class="error-text">{modelDownloadStatus.error}</p>
            <button 
              onClick={() => window.location.reload()}
              class="retry-button"
            >
              Retry Download
            </button>
            <p class="info-text">The app will continue with limited functionality.</p>
          </div>
        )}
        
        {/* Regular loading indicators */}
        {ocrStatus === 'loading' && !modelDownloadStatus.isDownloading && (
          <div class="ocr-loading">
            <p>Loading services...</p>
            <div class="progress-bar">
              <div class="progress"></div>
            </div>
          </div>
        )}
        
        {ocrStatus === 'error' && (
          <p class="error-text">OCR failed, using text-only mode</p>
        )}
        
        {/* Browser mode cache message */}
        {!isNativePlatform() && (
          <div class="browser-mode-info">
            <p>🌐 Browser Mode - Models will load from CDN</p>
            <p class="info-text">First load may take a moment</p>
          </div>
        )}
      </div>
    )
  }

  const ufoto='.img/logo_only.png'
  
  return (
    <div class="app">
      <header class="header-bar">
        <div class="header-content">
          <button class="logo-btn" onClick={toggleSidebar}>
            <img src="/.img/1752692028961-removebg-preview.png" alt="DocAnalyzer Logo" class="logo" />
            <span class="app-name">AGIG</span>
          </button>
          <div class="header-actions">
            {/* Model status indicator for Android */}
            {isNativePlatform() && modelDownloadStatus.status === 'ready' && (
              <div class="model-status ready" title="AI Models Ready">
                <span class="material-symbols-rounded">check_circle</span>
              </div>
            )}
            
            {/* Language Selector */}
            <select 
              class="language-selector" 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="am">አማርኛ</option>
            </select>
            
            <button class="auth-btn" onClick={() => {
              if (auth.getIsAuthenticated()) {
                auth.signOut()
              } else {
                toggleAuthModal()
                setShowAuth(true)
              }
            }}>
              <span class="material-symbols-rounded">
                {auth.getIsAuthenticated() ? <img src="/.img/1752692028961-removebg-preview.png" alt="DocAnalyzer Logo" class="logo" /> : 'account_circle'}
              </span>
              <span class="auth-text">
                {auth.getIsAuthenticated() ? 'Sign Out' : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={closeSidebar}
        currentSessionId={currentSessionId}
        onSessionChange={setCurrentSession}
        onNewChat={startNewChat}
        sessions={sessions}
      />

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={toggleAuthModal}
        onAuthSuccess={handleAuthSuccess}
      />

      <div class="container">
        <header class="app-header">
          <h1 class="heading">AGIG PWA</h1>
          <h4 class="sub-heading">
            {auth.getIsAuthenticated() ? t.welcomeMessage : t.welcomeDescription}
          </h4>
        </header>
       
      
        <ChatUI 
          currentSessionId={currentSessionId} 
          onNewSession={startNewChat}
          ocrEngine={teSsAna}
          language={language}
        />
      </div>
    </div>
  )
}