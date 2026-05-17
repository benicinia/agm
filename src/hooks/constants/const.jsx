import { useLanguage } from '../utils/constants.js'

export default function Sidebar({ user, currentStep, onLogout, language, setLanguage }) {
  const { t } = useLanguage()

  const steps = [
    { number: 1, title: t.step1Title, description: t.step1Desc },
    { number: 2, title: t.step2Title, description: t.step2Desc },
    { number: 3, title: t.step3Title, description: t.step3Desc },
    { number: 4, title: t.step4Title, description: t.step4Desc }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>AGIG</h2>
        <div className="language-selector">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="lang-select"
          >
            <option value="en">English</option>
            <option value="am">አማርኛ</option>
          </select>
        </div>
      </div>

      {user && (
        <div className="user-info">
          <p>{t.welcome}, {user.name}</p>
          <button onClick={onLogout} className="logout-btn">
            {t.logout}
          </button>
        </div>
      )}

      <div className="progress-section">
        <h3>{t.applicationProgress}</h3>
        <div className="steps">
          {steps.map(step => (
            <div 
              key={step.number} 
              className={`step ${currentStep >= step.number ? 'active' : ''} ${currentStep === step.number ? 'current' : ''}`}
            >
              <div className="step-number">{step.number}</div>
              <div className="step-content">
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}