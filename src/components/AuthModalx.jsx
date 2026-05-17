import { useState } from 'preact/hooks'
import { useLanguage } from '../utils/constants.js'

export default function AuthModalX({ onClose, onLogin, language }) {
  const [licenseNumber, setLicenseNumber] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const { t } = useLanguage()

  const handleLicenseSubmit = async (e) => {
    e.preventDefault()
    if (!licenseNumber.trim()) return

    // Simulate API call to verify business license
    try {
      const userData = {
        id: 1,
        name: "Demo Business",
        licenseNumber: licenseNumber,
        verified: true
      }
      onLogin(userData)
    } catch (error) {
      alert(t.verificationError)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    
    // Simulate PDF processing and license extraction
    setTimeout(() => {
      const extractedLicense = "0068699863" // Mock extracted license
      setLicenseNumber(extractedLicense)
      setIsUploading(false)
    }, 2000)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{t.faydaVerification}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleLicenseSubmit} className="auth-form">
          <div className="form-group">
            <label>{t.enterFAN}</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={t.faydaPlaceholder}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.orUploadDocument}</label>
            <label className="file-upload-btn large">
              {isUploading ? t.processing : t.chooseFile}
              <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <button 
            type="submit" 
            disabled={!licenseNumber.trim() || isUploading}
            className="submit-btn"
          >
            {isUploading ? t.verifying : t.verifyfayda}
          </button>
        </form>
      </div>
    </div>
  )
}