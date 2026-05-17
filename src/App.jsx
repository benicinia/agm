import { useState, useEffect, useRef } from 'preact/hooks'
import { ChatUI } from './components/ChatUI.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { AuthModal } from './components/AuthModal.jsx'
import { modelDownloader } from './services/modelDownloader.js'
import { loadModels } from './services/nlpProcessor.js'
import { db } from './services/database.js'
import { nlpProcessor } from './services/nlpProcessor.js'
import { pdfAnalyzerF } from './services/pdfAnalyzer.js'
import { pdfAnalyzerD } from './services/pdfAnalyzer2.js'
import { teSsAna } from './services/tess.js'
import { auth } from './services/auth.js'
import { pwa } from './services/pwa.js'
import { googleSearch } from './services/duck.js'
import { useLanguage } from './utils/constants.js'

export function App() {
  const [initialized, setInitialized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [ocrStatus, setOcrStatus] = useState('idle')
  const { language, setLanguage, t } = useLanguage()
  
  // Model download states
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({})
  const [downloadError, setDownloadError] = useState(null)
  
  const authPollInterval = useRef(null)

  useEffect(() => {
    initializeApp()
    loadSessions()
    
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

 const downloadAndLoadModels = async () => {
  setIsDownloading(true)
  setDownloadError(null)
  
  try {
    // First detect if we're on Android
    const isAndroid = await modelDownloader.detectPlatform()
    
    if (!isAndroid) {
      console.log('💻 Running on browser/PC - models not required')
      setIsDownloading(false)
      return true
    }
    
    console.log('🤖 Android detected - downloading models...')
    
    // Download models (only happens on Android)
    await modelDownloader.downloadAllModels((modelKey, percent, loaded, total, completed, totalModels) => {
      setDownloadProgress(prev => ({
        ...prev,
        [modelKey]: percent
      }))
    })
    
    // Load models into NLP
    const mdbrModel = await modelDownloader.loadModel('mdbr-leaf-mt')
    const colbertModel = await modelDownloader.loadModel('colbert')
    
    if (mdbrModel && colbertModel && typeof loadModels === 'function') {
      await loadModels(mdbrModel, colbertModel)
      console.log('✅ Models loaded into NLP processor')
    }
    
    return true
    
  } catch (error) {
    console.error('Model download failed:', error)
    setDownloadError(error.message)
    return false
  } finally {
    setIsDownloading(false)
  }
}

  const initializeOCR = async () => {
    try {
      setOcrStatus('loading')
      await teSsAna.init()
      await teSsAna.initializeTesseract()
      setOcrStatus('ready')
    } catch (error) {
      console.error('OCR initialization failed:', error)
      setOcrStatus('error')
    }
  }

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting AGIG App...')
      
      // Download and load models for Android
      await downloadAndLoadModels()
      
      await db.init()
      console.log('✅ Database initialized')
      
      await nlpProcessor.init()
      console.log('✅ NLP Processor initialized')
      
      await pdfAnalyzerF.init()
      await pdfAnalyzerD.init()
      await initializeOCR()
      await googleSearch.init()
      await pwa.init()
      
      if (auth && auth.init) {
        auth.init()
      }
      
      setInitialized(true)
      console.log('🎉 AGIG initialized successfully!')
      
    } catch (error) {
      console.error('App initialization failed:', error)
      setInitialized(true)
    }
  }

  // Download screen for Android
  if (isDownloading) {
    const mdbrProgress = downloadProgress['mdbr-leaf-mt'] || 0
    const colbertProgress = downloadProgress['colbert'] || 0
    const totalProgress = (mdbrProgress + colbertProgress) / 2
    
    return (
      <div class="download-screen">
        <div class="download-card">
          <div class="download-icon">📱</div>
          <h2>Preparing AGIG for Android</h2>
          <p>Downloading AI models for offline use...</p>
          
          <div class="model-progress">
            <div class="model-row">
              <div class="model-name">mdbr-leaf-mt (Q8)</div>
              <div class="model-size">~66 MB</div>
              <div class="model-percent">{Math.round(mdbrProgress)}%</div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${mdbrProgress}%` }}></div>
            </div>
          </div>
          
          <div class="model-progress">
            <div class="model-row">
              <div class="model-name">Retrieval ColBERT Q8</div>
              <div class="model-size">~4.2 MB</div>
              <div class="model-percent">{Math.round(colbertProgress)}%</div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${colbertProgress}%` }}></div>
            </div>
          </div>
          
          <div class="total-progress">
            <div class="total-label">Total Progress</div>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${totalProgress}%` }}></div>
            </div>
          </div>
          
          <p class="download-note">Models will be saved permanently</p>
        </div>
      </div>
    )
  }

  if (downloadError) {
    return (
      <div class="download-screen error">
        <div class="download-card">
          <div class="error-icon">⚠️</div>
          <h2>Download Failed</h2>
          <p>{downloadError}</p>
          <button onClick={() => window.location.reload()} class="retry-btn">
            Retry Download
          </button>
        </div>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div class="loading-screen">
        <div class="spinner"></div>
        <p>Initializing AGIG...</p>
        {ocrStatus === 'loading' && <p>Loading OCR engine...</p>}
      </div>
    )
  }

  return (
    <div class="app">
      <header class="header-bar">
        <div class="header-content">
          <button class="logo-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <img src="/.img/1752692028961-removebg-preview.png" alt="AGIG" class="logo" />
            <span class="app-name">AGIG</span>
          </button>
          
          <button class="new-chat-header-btn" onClick={() => {
            const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            setCurrentSessionId(newSessionId)
          }}>
            <span>+</span>
            <span>New Chat</span>
          </button>
        </div>
      </header>

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentSessionId={currentSessionId}
        onSessionChange={setCurrentSessionId}
        onNewChat={() => {
          const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
          setCurrentSessionId(newSessionId)
        }}
        sessions={sessions}
        language={language}
        setLanguage={setLanguage}
        t={t}
        auth={auth}
        onAuthClick={() => setAuthModalOpen(!authModalOpen)}
        isAuthenticated={auth.getIsAuthenticated?.() || false}
      />

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => {
          setTimeout(() => checkAuthState(), 500)
          setAuthModalOpen(false)
        }}
      />

      <div class="container">
        <header class="app-header">
          <h1 class="heading">AGIG PWA</h1>
          <h4 class="sub-heading">
            {auth.getIsAuthenticated?.() ? 'Welcome back!' : 'Your AI Document Assistant'}
          </h4>
        </header>
       
        <ChatUI 
          currentSessionId={currentSessionId} 
          onNewSession={() => {
            const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            setCurrentSessionId(newSessionId)
          }}
          ocrEngine={teSsAna}
          language={language}
        />
      </div>
    </div>
  )
}