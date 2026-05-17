// utils/constants.js - NEW FILE
import { useState, useEffect } from 'preact/hooks'

const translations = {
  en: {
    welcome: 'Welcome to AGIG',
    welcomeDescription: 'Advanced Government services',
    welcomeMessage: 'Hello! How can I help you today?',
    loadingModels: 'Loading AI models...',
    uploadDocument: 'Upload Document',
    typeMessage: 'Type your message...',
    send: 'Send',
    
    // Step titles for services
    iftms: 'Integrated Freight Transport',
    renewDoc: 'Business License Renewal',
    
    // Common actions
    verify: 'Verify',
    upload: 'Upload',
    continue: 'Continue',
    download: 'Download'
  },
  am: {
    welcome: 'እንኳን ወደ AGIG በደህና መጡ',
    welcomeDescription: 'የላቀ የመንግስት አገልግሎቶች',
    welcomeMessage: 'ሰላም! ዛሬ እንዴት ልረዳዎት እችላለሁ?',
    loadingModels: 'AI ሞዴሎች በመጫን ላይ...',
    uploadDocument: 'ሰነድ ይስቀሉ',
    typeMessage: 'መልእክትዎን ይፃፉ...',
    send: 'ላክ',
    
    // Step titles for services
    iftms: 'የተቀናጀ ጭነት ትራንስፖርት',
    renewDoc: 'የንግድ ፈቃድ እድሳት',
    
    // Common actions
    verify: 'አረጋግጥ',
    upload: 'ስቀል',
    continue: 'ቀጥል',
    download: 'አውርድ'
  }
}

export function useLanguage() {
  const [language, setLanguage] = useState('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('agig-language')
    if (savedLang) {
      setLanguage(savedLang)
    }
  }, [])

  const updateLanguage = (lang) => {
    setLanguage(lang)
    localStorage.setItem('agig-language', lang)
  }

  return {
    language,
    setLanguage: updateLanguage,
    t: translations[language]
  }
}