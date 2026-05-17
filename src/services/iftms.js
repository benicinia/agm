import nlp from 'compromise'
import { apiHandler } from './API'
//import { nlpProcessori } from './iftms.js'
import { processUserInputX } from './iftmsX.js'
import { extractTextFromPDF } from './pdfAna.js'
import { db } from './database.js'

// State variables
let initialized = false
let awaitingBusinessLicense = null
let awaitingVehicleInfo = null
let currentIntent = null
let currentStep = null
let currentService = null
let awaitingOTP = null
let iSbizValid = null
let isIftmsInit = null
let intentPatterns = {}
let stepResponses = {}

// Initialize NLP Processor
export async function initNLPProcessor() {
  if (initialized) return
  
  console.log('🔄 Initializing NLP Processor...')
  awaitingOTP = sessionStorage.getItem('opt')
  iSbizValid = sessionStorage.getItem('licenseValidated')
  initialized = true
  console.log('✅ NLP Processor initialized')
}

// Setup intent patterns
export function setupIntentPatterns() {
  intentPatterns = {
    // Document analysis intents
    analyzeResearch: [
      'Analyze a research paper',
      'analyze a research paper',
      'research document analysis', 
      'academic paper review',
      'study paper analysis',
      'scientific paper'
    ],
    analyzeLegal: [
      'analyze legal document',
      'review contract',
      'legal agreement analysis',
      'contract review',
      'legal doc'
    ],
    analyzeGovernment: [
      'verify government document',
      'government id analysis',
      'business license check',
      'national id verification',
      'fayda id analysis',
      'renew certificate'
    ],
    analyzeFinancial: [
      'analyze financial document',
      'invoice review',
      'receipt analysis',
      'bank statement check',
      'financial statement'
    ],
    classifyDocument: [
      'what type of document is this',
      'classify this document',
      'document classification', 
      'what kind of document'
    ],
    iftms: [
      'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት',
      'Ministry of Transport and Logistics',
      'ትራንስፖርት እና ሎጂስቲክስ',
      'Integrated Freight Transport management system',
      'MOTL',
      'IFTMS',
      'ministry of transport and logistics',
      'freight transport registration and renewal',
    ],
    renewDoc: [
      'renew driver license',
      'update trading license', 
      'renew business permit',
      'renew business license certificate',
      'update business license renewal',
      'business license cancelation',
      'renew trading licence',
      'business registration certificate',
      'update business license',
    ],
    // Question types
    summaryRequest: [
      'summarize',
      'give me a summary',
      'brief overview',
      'main points'
    ],
    keywordRequest: [
      'keywords', 
      'key terms',
      'important words',
      'main topics'
    ],
    structureRequest: [
      'structure',
      'how is this organized',
      'document layout', 
      'sections'
    ],
    
    // General intents
    greeting: [
      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'
    ],
    help: [
      'help', 'what can you do', 'capabilities', 'features'
    ],
    thanks: [
      'thank you', 'thanks', 'appreciate it', 'gracias'
    ]
  }
}

// Process message
export async function processMessage(message) {
  await initNLPProcessor()
  setupIntentPatterns()
  
  db.saveServiceStats(message)
  sessionStorage.setItem('otp', awaitingOTP)
  sessionStorage.setItem('licenseValidated', iSbizValid)
  const currentIntentStorage = sessionStorage.getItem('intnt')
  const confirmIntent = sessionStorage.getItem('cnfmintnt')
  const iSregd = sessionStorage.getItem('user')
  
  const doc = nlp(message)
  const intents = extractIntents(doc)
  const entities = extractEntities(doc) 
  const sentiment = analyzeSentiment(doc)
  
  if (currentIntent !== intents) {
    sessionStorage.setItem('intnt', intents)
    currentIntent = intents
  }
  
  if (sessionStorage.getItem('intnt') === 'iftms') {
    if (!isIftmsInit) {
      currentStep = 0
      sessionStorage.setItem('currentStep', currentStep)
      awaitingOTP = true
    }
    
    if (isIftmsInit && !iSbizValid) {
      awaitingOTP = false
      awaitingBusinessLicense = true
      currentStep = 1
    }
    
    if (iSbizValid && !awaitingVehicleInfo) {
      awaitingVehicleInfo = true
      awaitingBusinessLicense = false
      currentStep = 2
    }
    
    return {
      currentStep: currentStep,
      intents: intents,
      entities: { licenseInput: [message] },
      sentiment: 'neutral',
      processedText: message,
      shouldUploadFile: false,
      responseType: determineResponseType(intents),
      awaitingInput: false
    }
  } else {
    return {
      intents,
      entities,
      sentiment,
      processedText: doc.out('text'),
      shouldUploadFile: shouldRequestFileUpload(intents),
      responseType: determineResponseType(intents)
    }
  }
}

// Handle business license input
export async function handleBusinessLicenseInput(message, sessionId) {
  const cleanMessage = message.trim()
  
  // Check if it's a valid business license number format
  if (apiHandler.isValidLicenseFormat(cleanMessage)) {
    try {
      // Validate with etrade API
      const validationResult = await apiHandler.validateBusinessLicense(cleanMessage)
      
      if (validationResult.isValid) {
        // Store license info in session storage
        sessionStorage.setItem('businessLicense', cleanMessage)
        sessionStorage.setItem('businessData', JSON.stringify(validationResult.businessData))
        sessionStorage.setItem('licenseValidated', 'true')
        
        return {
          success: true,
          message: `✅ Business License **${cleanMessage}** validated successfully!`,
          businessData: validationResult.businessData,
          nextStep: 'Please upload your business license certificate document for verification.'
        }
      } else {
        return {
          success: false,
          message: `❌ Invalid business license number. Please check the number and try again.`,
          error: validationResult.error
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Error validating business license: ${error.message}. Please try again.`,
        error: error.message
      }
    }
  } else {
    return {
      success: false,
      message: '❌ Invalid format. Please provide business license number in format: **14/668/5068/2004**'
    }
  }
}

// Extract intents
export function extractIntents(doc) {
  const intents = []
  const text = doc.text().toLowerCase()

  // Check against predefined patterns
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        intents.push(intent)
        sessionStorage.setItem('intnt', intent)
        sessionStorage.setItem('currentService', intent)
        sessionStorage.setItem('currentStep', '1')
        break
      }
    }
  }

  // NLP-based intent extraction
  if (doc.has('analyze|review|check|verify|authorize|submit')) {
    if (!intents.length) intents.push('analyzeDocument')
  }

  if (doc.has('what #Adjective? type of document')) {
    intents.push('classifyDocument')
  }

  if (doc.has('research paper|research|academic|scientific|paper study')) {
    if (!intents.includes('analyzeResearch')) {
      intents.push('analyzeResearch')
    }
  }

  if (doc.has('legal|contract|agreement|clause')) {
    if (!intents.includes('analyzeLegal')) {
      intents.push('analyzeLegal')
    }
  }

  if (doc.has('motl|license|permit|freight|iftms')) {
    if (!intents.includes('businessLicenseInput')) {
      intents.push('businessLicenseInput')
    }
  }
  
  if (doc.has('government|license|permit|id|verification')) {
    if (!intents.includes('analyzeGovernment')) {
      intents.push('analyzeGovernment')
    }
  }

  if (doc.has('renew|renewal|permit|registration|ብቃት|ማረጋገጫ|bussiness|driving|trading|mining|building|certification|update|license|authorization')) {
    if (!intents.includes('renewDoc')) {
      intents.push('renewDoc')
    }
  }

  if (doc.has('iftms|motl|freight|logistics|transport|ministry') || doc.has('renew|renewal|permit|registration|ብቃት|ማረጋገጫ|bussiness|driving|trading|mining|building|certification|update|license|authorization')) {
    if (!intents.includes('iftms')) {
      intents.push('iftms')
    }
  }

  if (doc.has('financial|invoice|receipt|payment|bank')) {
    if (!intents.includes('analyzeFinancial')) {
      intents.push('analyzeFinancial')
    }
  }

  return [...new Set(intents)] // Remove duplicates
}

// Extract entities
export function extractEntities(doc) {
  const entities = {
    documentTypes: extractDocumentTypes(doc),
    fileTypes: extractFileTypes(doc),
    actions: extractActions(doc),
    topics: extractTopics(doc)
  }

  return entities
}

// Extract document types
export function extractDocumentTypes(doc) {
  const types = []
  const text = doc.text().toLowerCase()

  const documentTypeKeywords = {
    research: ['research paper', 'academic paper', 'scientific paper', 'thesis', 'dissertation'],
    iftms: ['libre', 'insurance', 'gps', 'driver license', 'bolo'],
    legal: ['contract', 'agreement', 'legal document', 'nda', 'non-disclosure'],
    government: ['id card', 'license', 'permit', 'registration certificate','registration slip', 'passport', 'fayda'],
    financial: ['invoice', 'receipt', 'statement', 'bill', 'financial document'],
    general: ['document', 'file', 'pdf', 'paper']
  }

  for (const [type, keywords] of Object.entries(documentTypeKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      types.push(type)
    }
  }

  return types
}

// Extract file types
export function extractFileTypes(doc) {
  const fileTypes = []
  const text = doc.text().toLowerCase()

  if (text.includes('pdf') || doc.has('.pdf')) fileTypes.push('pdf')
  if (text.includes('image') || doc.has('jpg|jpeg|png|gif')) fileTypes.push('image')
  if (text.includes('word') || doc.has('doc|docx')) fileTypes.push('word')
  if (text.includes('text') || doc.has('.txt')) fileTypes.push('text')

  return fileTypes
}

// Extract actions
export function extractActions(doc) {
  const actions = []
  
  if (doc.has('analyze|review|check')) actions.push('analyze')
  if (doc.has('classify|identify|what type')) actions.push('classify')
  if (doc.has('summarize|brief|overview')) actions.push('summarize')
  if (doc.has('extract|find|get')) actions.push('extract')
  if (doc.has('verify|validate|authenticate')) actions.push('verify')
  if (doc.has('renew|update|edisat|permit|certificate')) actions.push('renew')

  return actions
}

// Extract topics
export function extractTopics(doc) {
  // Extract nouns as potential topics
  const nouns = doc.nouns().out('array')
  const adjectives = doc.adjectives().out('array')
  
  // Filter out common words and keep relevant topics
  const commonWords = ['document', 'file', 'paper', 'thing', 'stuff', 'what']
  return [...nouns, ...adjectives]
    .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
    .slice(0, 5)
}

// Analyze sentiment
export function analyzeSentiment(doc) {
  const positive = doc.match('#Positive').length
  const negative = doc.match('#Negative').length
  const neutral = doc.match('#Neutral').length

  if (positive > negative && positive > neutral) return 'positive'
  if (negative > positive && negative > neutral) return 'negative'
  return 'neutral'
}

// Should request file upload
export function shouldRequestFileUpload(intents) {
  const uploadIntents = [
    'analyzeResearch', 'analyzeLegal', 'analyzeGovernment', 'renewDoc','iftms',
    'analyzeFinancial', 'classifyDocument', 'analyzeDocument'
  ]
  
  return uploadIntents.some(intent => intents.includes(intent))
}

// Determine response type
export function determineResponseType(intents) {
  if (intents.includes('greeting')) return 'greeting'
  if (intents.includes('help')) return 'help'
  if (intents.includes('thanks')) return 'thanks'
  if (intents.includes('analyzeResearch')) return 'researchAnalysis'
  if (intents.includes('analyzeLegal')) return 'legalAnalysis'
  if (intents.includes('analyzeGovernment')) return 'governmentAnalysis'
  if (intents.includes('analyzeFinancial')) return 'financialAnalysis'
  if (intents.includes('classifyDocument')) return 'classification'
  if (intents.includes('renewDoc')) return 'renewDoc'
  if (intents.includes('iftms')) return 'iftms'
  if ((intents.includes('iftms')) && (intents.includes('businessLicenseInput'))) return 'iftmsbusinessLicenseInput'
  
  return 'general'
}

// Generate contextual response
export async function generateContextualResponse(nlpResult, documentAnalysis = null) {
  const { intents, entities, sentiment, responseType } = nlpResult
  const isFileContent = extractTextFromPDF(documentAnalysis)
  sessionStorage.setItem('currentService', currentIntent)
  const currentStep = sessionStorage.getItem('currentStep', currentStep)
  const language = localStorage.getItem('agig-language')
  let response = ''

  switch (responseType) {
    case 'greeting':
      response = getGreetingResponse(sentiment)
      break
    case 'help':
      response = getHelpResponse()
      break
    case 'thanks':
      response = getThanksResponse()
      break
    case 'researchAnalysis':
      response = "I'd be happy to analyze research papers! Please upload a PDF research document, and I'll extract key information about the methodology, findings, conclusions, and research instruments."
      break
    case 'renewDoc':
      response = "I'd be happy to renew your document permit! Please upload your previous PDF business license, your fyda id and all other supporting documents you have."
      break
    case 'iftms':
      response = await getIftmsResponse(intents, currentStep, language, isFileContent)
      break
    case 'legalAnalysis':
      response = "I can analyze legal documents like contracts and agreements. Upload your legal document, and I'll identify key clauses, parties involved, obligations, and important dates."
      break
    case 'governmentAnalysis':
      response = "I specialize in government document verification. Upload documents like IDs, licenses, or permits, and I'll help verify their structure and identify key information."
      break
    case 'financialAnalysis':
      response = "I can analyze financial documents including invoices, receipts, and statements. Upload your financial document for amount verification, date analysis, and pattern recognition."
      break
    case 'classification':
      response = "I can classify documents by type! Upload any document, and I'll identify whether it's a research paper, legal document, government ID, financial record, or general document."
      break
    default:
      response = getGeneralResponse(intents, entities, documentAnalysis)
  }

  // Add sentiment-aware phrasing
  response = addSentimentTone(response, sentiment)

  return response
}

// Setup step responses
export function setupStepResponses() {
  stepResponses = {
    iftms: {
      1: {
        en: "Welcome to Integrated Freight Transport Management System! Let's start by verifying your business license. Please enter your business license number (format: 14/668/5068/2004) or upload your business license certificate.",
        am: "ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት እንኳን በደህና መጡ! የንግድ ፈቃድዎን በማረጋገጥ እንጀምር። እባክዎ የንግድ ፈቃድ ቁጥርዎን (ቅርጸት: 14/668/5068/2004) ያስገቡ ወይም የንግድ ፈቃድ ሰርተፊኬትዎን ይስቀሉ።",
        actions: ['Upload Business License', 'Enter License Manually']
      },
      2: {
        en: "Great! Business license verified. Now let's add your freight vehicle information. Please upload vehicle registration documents or provide vehicle details.",
        am: "ጥሩ! የንግድ ፈቃድ ተረጋግጧል። አሁን የጭነት ተሽከርካሪዎን መረጃ እንጨምር። እባክዎ የተሽከርካሪ ምዝገባ ሰነዶች ይስቀሉ ወይም የተሽከርካሪ ዝርዝሮችን ያቅርቡ።",
        actions: ['Upload Vehicle Documents', 'Add Another Vehicle']
      },
      3: {
        en: "Vehicle information recorded. Now we need driver information. Please upload driver's license and national ID.",
        am: "የተሽከርካሪ መረጃ ተመዝግቧል። አሁን የሹፌር መረጃ ያስፈልገናል። እባክዎ የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነዶ ይስቀሉ።",
        actions: ['Upload Driver Documents', 'Complete']
      },
      4: {
        en: "All information verified! Your freight transport license has been approved for 1 year. Download your license certificate below.",
        am: "ሁሉም መረጃዎች ተረጋግጠዋል! የጭነት መጓጓዣ ፈቃድዎ ለ1 ዓመት ተሰጥቷል። የፈቃድ ሰርተፊኬትዎን ከዚህ በታች ያውርዱ።",
        actions: ['Download License', 'Start New Application']
      }
    },
    renewDoc: {
      1: {
        en: "Welcome to Business License Renewal service! Let's start by verifying your existing license. Please enter your current business license number or upload your license certificate.",
        am: "ወደ የንግድ ፈቃድ እድሳት አገልግሎት እንኳን በደህና መጡ! ያለዎትን ፈቃድ በማረጋገጥ እንጀምር። እባክዎ የአሁኑ የንግድ ፈቃድ ቁጥርዎን ያስገቡ ወይም የፈቃድ ሰርተፊኬትዎን ይስቀሉ።",
        actions: ['Upload License', 'Enter License Number']
      },
      2: {
        en: "License verified. Please upload your latest tax clearance certificate and other required documents.",
        am: "ፈቃድ ተረጋግጧል። እባክዎ የቅርብ ጊዜ የታክስ ማጽዳት ሰርተፊኬትዎን እና ሌሎች የሚያስፈልጉ ሰነዶችን ይስቀሉ።",
        actions: ['Upload Tax Certificate', 'Upload Other Documents']
      },
      3: {
        en: "Documents received. Please make the payment for license renewal. Total amount: 5,000 ETB.",
        am: "ሰነዶች ተቀብለዋል። እባክዎ ለፈቃድ እድሳት ክፍያ ያድርጉ። አጠቃላይ መጠን: 5,000 ብር።",
        actions: ['Make Payment', 'Upload Payment Receipt']
      },
      4: {
        en: "Payment confirmed! Your business license has been renewed successfully. Download your new license certificate.",
        am: "ክፍያ ተረጋግጧል! የንግድ ፈቃድዎ በተሳካ ሁኔታ ተዘምኗል። አዲሱን የፈቃድ ሰርተፊኬትዎን ያውርዱ።",
        actions: ['Download New License', 'Print Certificate']
      }
    },
    analyzeResearch: {
      1: {
        en: "Welcome to Business License Renewal service! Let's start by verifying your existing license. Please enter your current business license number or upload your license certificate.",
        am: "ወደ የንግድ ፈቃድ እድሳት አገልግሎት እንኳን በደህና መጡ! ያለዎትን ፈቃድ በማረጋገጥ እንጀምር። እባክዎ የአሁኑ የንግድ ፈቃድ ቁጥርዎን ያስገቡ ወይም የፈቃድ ሰርተፊኬትዎን ይስቀሉ።",
        actions: ['Upload License', 'Enter License Number']
      },
      2: {
        en: "License verified. Please upload your latest tax clearance certificate and other required documents.",
        am: "ፈቃድ ተረጋግጧል። እባክዎ የቅርብ ጊዜ የታክስ ማጽዳት ሰርተፊኬትዎን እና ሌሎች የሚያስፈልጉ ሰነዶችን ይስቀሉ።",
        actions: ['Upload Tax Certificate', 'Upload Other Documents']
      },
      3: {
        en: "Documents received. Please make the payment for license renewal. Total amount: 5,000 ETB.",
        am: "ሰነዶች ተቀብለዋል። እባክዎ ለፈቃድ እድሳት ክፍያ ያድርጉ። አጠቃላይ መጠን: 5,000 ብር።",
        actions: ['Make Payment', 'Upload Payment Receipt']
      },
      4: {
        en: "Payment confirmed! Your business license has been renewed successfully. Download your new license certificate.",
        am: "ክፍያ ተረጋግጧል! የንግድ ፈቃድዎ በተሳካ ሁኔታ ተዘምኗል። አዲሱን የፈቃድ ሰርተፊኬትዎን ያውርዱ።",
        actions: ['Download New License', 'Print Certificate']
      }
    }
  }
}

// Get IFTMS response
export async function getIftmsResponse(intents, currentStep, language, isFileContent = false) {
  const intntNow = currentIntent
  
  return (
    `<div className="chat-messages">
      <div className="message sender">
        <div className="message-content">
          <p>hi there cherenet argaw ${intents}</p>
          <div className="message-actions">
            <button className="action-btn">
              next${currentStep}
            </button>
          </div>
        </div>
        <span className="timestamp">
          11:11
        </span>
      </div>
    <div />
  </div>`
  )
}

// Get greeting response
export function getGreetingResponse(sentiment) {
  const greetings = {
    positive: [
      "Hello! 😊 Great to see you! How can I help you today?",
      "Hi there! 👋 Wonderful day for free fast government services! What would you like me to help with?",
      "Greetings! 🌟 Excited to assist you with your ጉዳዮች today!"
    ],
    neutral: [
      "Hello! How can I assist you with something?",
      "Hi there! What service would you like me to utiize?",
      "Greetings! I'm here to help with online public services."
    ],
    negative: [
      "Hello. I'm here to help with your document analysis needs.",
      "Hi. Let me know how I can assist with document analysis.",
      "Greetings. How can I help you analyze documents today?"
    ]
  }

  const options = greetings[sentiment] || greetings.neutral
  return options[Math.floor(Math.random() * options.length)]
}

// Get help response
export function getHelpResponse() {
  return `
    <div class="help-response">
      <h4>📚 Document Analysis Capabilities:</h4>
      <ul>
        <li>🔬 <strong>Research Papers</strong> - Methodology analysis, findings extraction</li>
        <li>⚖️ <strong>Legal Documents</strong> - Clause identification, party analysis</li>
        <li>🏛️ <strong>Government IDs</strong> - Verification, structure analysis</li>
        <li>💰 <strong>Financial Documents</strong> - Amount verification, pattern recognition</li>
        <li>📊 <strong>Document Autentication</strong> - Automatic type identification</li>
      </ul>
      <p>Just ask me to analyze a specific type of document or upload a file directly!</p>
    </div>
  `
}

// Get thanks response
export function getThanksResponse() {
  const thanks = [
    "You're welcome! Happy to help with your document analysis. 😊",
    "Glad I could assist! Let me know if you need help with any other documents.",
    "You're welcome! Feel free to upload more documents for analysis anytime."
  ]
  return thanks[Math.floor(Math.random() * thanks.length)]
}

// Get general response
export function getGeneralResponse(intents, entities, documentAnalysis) {
  if (documentAnalysis) {
    return getDocumentSpecificResponse(documentAnalysis, entities)
  }

  if (intents.length > 0) {
    return "I understand you're interested in document analysis! Please upload a document or tell me more specifically what you'd like me to analyze."
  }

  return "I'm here to help you analyze documents! You can upload research papers, legal documents, government IDs, financial records, or ask me to classify any document type."
}

// Get document specific response
export function getDocumentSpecificResponse(analysis, entities) {
  const { documentType, topics, confidence } = analysis
  
  let response = `Based on your current ${documentType.toLowerCase()}, `
  
  if (entities.actions.includes('summarize')) {
    response += `I can provide a detailed summary of the key points and findings. `
  }
  
  if (entities.actions.includes('extract')) {
    response += `I can extract specific information like dates, names, or key terms. `
  }
  
  if (topics && topics.length > 0) {
    response += `I've identified main topics like ${topics.slice(0, 3).join(', ')}. `
  }
  
  response += `The analysis confidence is ${Math.round(confidence * 100)}%. What specific aspect would you like to explore?`
  
  return response
}

// Add sentiment tone
export function addSentimentTone(response, sentiment) {
  if (sentiment === 'positive') {
    return response.replace(/\./g, '!').replace(/I'm/g, "I'm absolutely")
  } else if (sentiment === 'negative') {
    return response.replace(/\!/g, '.').replace(/great/g, 'able to')
  }
  return response
}

// Check if text is business license number
export function isBusinessLicenseNumber(text) {
  const licenseRegex = /\b\d{2}\/\d{4}\/\d{4}\/\d{4}\b/
  return licenseRegex.test(text)
}

// Analyze document content
export function analyzeDocumentContent(text) {
  const doc = nlp(text)
  
  return {
    sentences: doc.sentences().length,
    paragraphs: text.split('\n\n').length,
    wordCount: doc.terms().length,
    averageSentenceLength: doc.terms().length / doc.sentences().length,
    
    // Extract key phrases (noun phrases)
    keyPhrases: doc.nouns().out('array')
      .filter(phrase => phrase.split(' ').length > 1)
      .slice(0, 10),
    
    // People and organizations
    people: doc.people().out('array'),
    organizations: doc.organizations().out('array'),
    places: doc.places().out('array'),
    
    // Dates and numbers
    dates: doc.dates().out('array'),
    numbers: doc.values().out('array'),
    
    // Document structure indicators
    hasHeadings: doc.has('#TitleCase').length > 5,
    hasLists: doc.has('^#Cardinal').length > 3,
    hasQuestions: doc.has('?').length > 0
  }
}

// Export as nlpProcessor object for backward compatibility
export const nlpProcessor = {
  init: initNLPProcessor,
  processMessage,
  handleBusinessLicenseInput,
  extractIntents,
  extractEntities,
  analyzeSentiment,
  shouldRequestFileUpload,
  determineResponseType,
  generateContextualResponse,
  setupStepResponses,
  getIftmsResponse,
  getGreetingResponse,
  getHelpResponse,
  getThanksResponse,
  getGeneralResponse,
  addSentimentTone,
  isBusinessLicenseNumber,
  analyzeDocumentContent
}