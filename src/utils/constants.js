import { useState, useEffect } from 'preact/hooks'

const translations = {
  en: {
    faydaPlaceholder: 'eg ፦ 68912471268',
    vidgen:'generate advertizement video from photos',
           acpprvd:'academic paper review',
      vgovdoc:'Verify government documents',
      analgdoc:'Analyze legal documents',
    iftmscard:'integrated freight management service',
      welcome: 'Welcome to AGIS',
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
    download: 'Download',
     loadingModels: 'Loading AI models...',
    welcome: 'Welcome to AGIG Services',
    welcomeDescription: 'Get your freight transport license through our AI assistant',
    getStarted: 'Get Started',
    logout: 'Logout',
    applicationProgress: 'Application Progress',
    step1Title: 'Business Verification',
    step1Desc: 'Verify your business license',
    step2Title: 'Vehicle Information',
    step2Desc: 'Add freight vehicles and documents',
    step3Title: 'Driver Information',
    step3Desc: 'Add driver details and documents',
    step4Title: 'License Approval',
    step4Desc: 'Receive your transport license',
    welcomeMessage: 'Hello! I\'m here to help you get advanced government services. Let\'s started.. ',
    errorMessage: 'Sorry, I encountered an error. Please try again.',
    fileError: 'Error processing file. Please try again.',
    uploadDocument: 'Upload Document',
    typeMessage: 'Type your message...',
    send: 'Send',
    step: 'Step',
    login:'login',
    businessVerification: 'Business Verification',
    faydaVerification: 'fayda id Verification',
    enterLicenseNumber: 'Enter Business License Number',
    enterFAN:'የፋይዳ ቁጥርዎን ያስገቡ',
    licensePlaceholder: 'e.g., BL123456789',
    orUploadDocument: 'Or Upload License Certificate',
    chooseFile: 'Choose File',
    processing: 'Processing...',
    verifying: 'Verifying...',
    verifyBusiness: 'Verify Business',
    verifyfayda: 'Verify fayda id',
    verificationError: 'Verification failed. Please try again.',
    uploadedFile: 'Uploaded file'
  },
  am: {
    faydaVerification: 'ፋይዳ መታወቂያ ማረጋገጫ',
  verifyfayda: 'ፋይዳ መታወቂያ አረጋግጥ',
    vidgen:'የማስታወቂያ ቪዲዮ ከፎቶ ፍጠር',
      acpprvd:'የጥናትና ምርምር ጽሁፍ ግምገማ ',
      vgovdoc:'የሰነዶች ማረጋገጫ',
      analgdoc:'ህግ ነክ ጽሁፎችን መገምገም ማርቀቅ',
      iftmscard:'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት',
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
    download: 'አውርድ',

    welcome: 'እንኳን ወደ የላቀ የመንግስት መስመር ላይ አገልግሎቶች በደህና መጡ',
     loadingModels: 'AI ሞዴሎች በመጫን ላይ...',
    welcomeDescription: 'የጭነት መጓጓዣ ፈቃድዎን በAI ረዳትነት ያግኙ',
    getStarted: 'ጀምር',
    logout: 'ውጣ',
    applicationProgress: 'የማመልከቻ ሂደት',
    step1Title: 'የንግድ ማረጋገጫ',
    step1Desc: 'የንግድ ፈቃድዎን ያረጋግጡ',
    step2Title: 'የተሽከርካሪ መረጃ',
    step2Desc: 'ጭነት ተሽከርካሪዎችን እና ሰነዶችን ያክሉ',
    step3Title: 'የሹፌር መረጃ',
    step3Desc: 'የሹፌር ዝርዝሮችን እና ሰነዶችን ያክሉ',
    step4Title: 'የፈቃድ ማረጋገጫ',
    step4Desc: 'የመጓጓዣ ፈቃድዎን ይቀበሉ',
    welcomeMessage: 'ሰላም! የጭነት መጓጓዣ ፈቃድዎን ለማግኘት እዚህ አለሁ። ንግድዎን በማረጋገጥ እንጀምር።',
    errorMessage: 'ይቅርታ፣ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።',
    fileError: 'ፋይልን በማቀነባበር ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።',
    uploadDocument: 'ሰነድ ይስቀሉ',
    typeMessage: 'መልእክትዎን ይፃፉ...',
    send: 'ላክ',
    step: 'ደረጃ',
    login:'ይግቡ',
    businessVerification: 'የንግድ ማረጋገጫ',
    enterLicenseNumber: 'የንግድ ፈቃድ ቁጥር ያስገቡ',
    enterFAN:'enter Fayda ID number',
    licensePlaceholder: 'ለምሳሌ፦ BL123456789',
    faydaPlaceholder: 'ለምሳሌ፦ 68912471268',
    orUploadDocument: 'ወይም የፈቃድ ሰርተፊኬት ይስቀሉ',
    chooseFile: 'ፋይል ምረጥ',
    processing: 'በማቀነባበር ላይ...',
    verifying: 'በማረጋገጥ ላይ...',
    verifyBusiness: 'ንግድ አረጋግጥ',
    verificationError: 'ማረጋገጫ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
    uploadedFile: 'የተሰቀለ ፋይል'
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