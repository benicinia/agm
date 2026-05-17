import { useState } from 'preact/hooks'
import { downloadNLPModels } from '../services/nlpProcessor.js'
import { useLanguage } from '../utils/constants.js'

export default function ModelDownloader() {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const { t, language } = useLanguage()

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    
    try {
      // Simulate progress updates
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const success = await downloadNLPModels()
      
      clearInterval(interval)
      setProgress(100)
      
      if (!success) {
        setError(t.downloadError || 'Download failed')
      }
      
      // Reset after success
      setTimeout(() => {
        setDownloading(false)
        setProgress(0)
      }, 2000)
    } catch (err) {
      setError(err.message)
      setDownloading(false)
      setProgress(0)
    }
  }

  return (
    <div className="model-downloader">
      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="download-btn"
      >
        {downloading 
          ? `${t.downloading || 'Downloading'}... ${progress}%` 
          : t.downloadModels || 'Download AI Models'}
      </button>
      
      {downloading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <p className="help-text">
        {t.downloadHelp || 'Download models for offline use and faster processing'}
      </p>
    </div>
  )
}