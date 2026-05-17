import { useState, useEffect } from 'preact/hooks'
import { db } from '../services/database.js'
import { useLanguage } from '../utils/constants.js'
export function Sidebar({ isOpen, onClose, currentSessionId, onSessionChange, onNewChat, sessions: propSessions,currentStep }) {
  const [sessions, setSessions] = useState([])
 const { t } = useLanguage()
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
  }, [isOpen])

  useEffect(() => {
    if (propSessions) {
      setSessions(propSessions)
    }
  }, [propSessions])
 const intnt = sessionStorage.getItem('intnt')
  const loadChatHistory = async () => {
    try {
      const history = await db.getChatHistory(200)
      const groupedSessions = groupMessagesBySession(history)
      setSessions(groupedSessions)
    } catch (error) {
      console.error('Failed to load chat history:', error)
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

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60 * 1000) return 'Just now'
    else if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`
    else if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
    else return date.toLocaleDateString()
  }

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat()
    }
    if (onClose) {
      onClose()
    }
  }

  const handleSessionClick = (sessionId) => {
    if (onSessionChange) {
      onSessionChange(sessionId)
    }
    if (onClose) {
      onClose()
    }
  }
const steps = [
    { number: 1, title: t.step1Title, description: t.step1Desc },
    { number: 2, title: t.step2Title, description: t.step2Desc },
    { number: 3, title: t.step3Title, description: t.step3Desc },
    { number: 4, title: t.step4Title, description: t.step4Desc }
  ]
  return (
    <div>
      <div class={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div class={`sidebar ${isOpen ? 'open' : ''}`}>
        <div class="sidebar-header">
          <h3>Chat History</h3>
          <button class="close-btn material-symbols-rounded" onClick={onClose}>close</button>
        </div>
        <div class="sidebar-content">
          {intnt === 'iftms' ?  (
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
      </div>):(
              <div><button class="new-chat-btn" onClick={handleNewChat}>
            <span class="material-symbols-rounded">add</span>
            Start New Chat 
          </button>
          <div class="chat-history-list">
            {sessions.length === 0 ? (
              <div class="no-chats">No chat history yet</div>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.sessionId}
                  class={`chat-session-item ${currentSessionId === session.sessionId ? 'active' : ''}`}
                  onClick={() => handleSessionClick(session.sessionId)}
                >
                  <div class="session-preview">{session.preview || 'New Chat'}</div>
                  <div class="session-meta">
                    <span class="session-date">{formatDate(session.timestamp)}</span>
                    {session.messageCount > 0 && (
                      <span style={'display:none'} class="message-count">{session.messageCount} messages</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div></div>
            ) }
          
        </div>
      </div>
    </div>
  )
}