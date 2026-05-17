import nlp from 'compromise'
import { apiHandler } from './API'
import {  processUserInput, initializeNLP } from './iftms.js'
export class NLPProcessor {
  constructor() {
    this.initialized = false
    this.nlp = nlp // Use the imported compromise directly
    this.awaitingBusinessLicense = false
    this.currentIntent = null
    this.setupIntentPatterns()
  }

  async init() {
    if (this.initialized) return
    
    console.log('🔄 Initializing NLP Processor...')
    
    // No need to load compromise dynamically anymore since we imported it
    this.initialized = true
    console.log('✅ NLP Processor initialized')
  }

  // Remove the loadCompromise method entirely since we're importing directly
  // async loadCompromise() { ... }

  setupIntentPatterns() {
    this.intentPatterns = {
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

  processMessage(message) {
    const currentIntent = sessionStorage.getItem('intnt')
    const confirmIntent = sessionStorage.getItem('cnfmintnt')
     const iSbizValid = sessionStorage.getItem('licenseValidated')
     const iSregd =localStorage.getItem('user')
      
    // Use this.nlp directly (the imported compromise)
    const doc = this.nlp(message)
    const intents = this.extractIntents(doc)
    const entities = this.extractEntities(doc) 
    const sentiment = this.analyzeSentiment(doc)
     if (this.awaitingBusinessLicense && sessionStorage.getItem('intnt') === 'iftms') {
      return {
        intents: ['iftmsBusinessLicense'],
        entities: { licenseInput: [message] },
        sentiment: 'neutral',
        processedText: message,
        shouldUploadFile: false,
        responseType: 'businessLicenseInput',
        awaitingInput: false
      }
    } else { 
    return {
      intents,
      entities,
      sentiment,
      processedText: doc.out('text'),
      shouldUploadFile: this.shouldRequestFileUpload(intents),
      responseType: this.determineResponseType(intents)
    }}
  }
 async handleBusinessLicenseInput(message, sessionId) {
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

  extractIntents(doc) {
    const intents = []
    const text = doc.text().toLowerCase()

    // Check against predefined patterns
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (text.includes(pattern)) {
          intents.push(intent)
          sessionStorage.setItem('intnt',intent)
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

  extractEntities(doc) {
    const entities = {
      documentTypes: this.extractDocumentTypes(doc),
      fileTypes: this.extractFileTypes(doc),
      actions: this.extractActions(doc),
      topics: this.extractTopics(doc)
    }

    return entities
  }

  extractDocumentTypes(doc) {
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

  extractFileTypes(doc) {
    const fileTypes = []
    const text = doc.text().toLowerCase()

    if (text.includes('pdf') || doc.has('.pdf')) fileTypes.push('pdf')
    if (text.includes('image') || doc.has('jpg|jpeg|png|gif')) fileTypes.push('image')
    if (text.includes('word') || doc.has('doc|docx')) fileTypes.push('word')
    if (text.includes('text') || doc.has('.txt')) fileTypes.push('text')

    return fileTypes
  }

  extractActions(doc) {
    const actions = []
    
    if (doc.has('analyze|review|check')) actions.push('analyze')
    if (doc.has('classify|identify|what type')) actions.push('classify')
    if (doc.has('summarize|brief|overview')) actions.push('summarize')
    if (doc.has('extract|find|get')) actions.push('extract')
    if (doc.has('verify|validate|authenticate')) actions.push('verify')
    if (doc.has('renew|update|edisat|permit|certificate')) actions.push('renew')

    return actions
  }

  extractTopics(doc) {
    // Extract nouns as potential topics
    const nouns = doc.nouns().out('array')
    const adjectives = doc.adjectives().out('array')
    
    // Filter out common words and keep relevant topics
    const commonWords = ['document', 'file', 'paper', 'thing', 'stuff', 'what']
    return [...nouns, ...adjectives]
      .filter(word => word.length > 3 && !commonWords.includes(word.toLowerCase()))
      .slice(0, 5)
  }

  analyzeSentiment(doc) {
    const positive = doc.match('#Positive').length
    const negative = doc.match('#Negative').length
    const neutral = doc.match('#Neutral').length

    if (positive > negative && positive > neutral) return 'positive'
    if (negative > positive && negative > neutral) return 'negative'
    return 'neutral'
  }

  shouldRequestFileUpload(intents) {
    const uploadIntents = [
      'analyzeResearch', 'analyzeLegal', 'analyzeGovernment', 'renewDoc','iftms',
      'analyzeFinancial', 'classifyDocument', 'analyzeDocument'
    ]
    
    return uploadIntents.some(intent => intents.includes(intent))
  }

  determineResponseType(intents) {
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
    if ((intents.includes('iftmsk')) && (intents.includes('businessLicenseInput'))) return 'iftmsbusinessLicenseInput'
    
    return 'general'
  }

  // Enhanced response generation based on NLP analysis
  generateContextualResponse(nlpResult, documentAnalysis = null) {
    const { intents, entities, sentiment, responseType } = nlpResult

    let response = ''

    switch (responseType) {
      case 'greeting':
        response = this.getGreetingResponse(sentiment)
        break
      case 'help':
        response = this.getHelpResponse()
        break
      case 'thanks':
        response = this.getThanksResponse()
        break
      case 'researchAnalysis':
        response = "I'd be happy to analyze research papers! Please upload a PDF research document, and I'll extract key information about the methodology, findings, conclusions, and research instruments."
        break
      case 'renewDoc':
        response = "I'd be happy to renew your document permit! Please upload your previous PDF business license, your fyda id and all other supporting documents you have."
        break
      case 'iftms':
        
        response =  "this.getIftmsResponse()"
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
        response = this.getGeneralResponse(intents, entities, documentAnalysis)
    }

    // Add sentiment-aware phrasing
    response = this.addSentimentTone(response, sentiment)

    return response
  }
 
  async getIftmsResponse() {
  
   const licenseValidated = sessionStorage.getItem('licenseValidated')
    const iSRegd =localStorage.getItem('currentUser')
        if ( iSRegd && !licenseValidated) {
          this.awaitingBusinessLicense = true
     return "እንኳን ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት በደህና መጡ! \n\n your business license is not verified yet please provide your Business License Number in the format: **14/668/5068/2004** or upload your business license cerificate."
  // return await processUserInput('iftmsbusinessLicenseInput', 1, 'en', false)
        }
   
    if (!iSRegd) {
      
       return 'norgd'
    } 
    if (licenseValidated === 'true') {
      return "Great! Your business license is validated. Please upload your business license certificate document for final verification."
    } else {
     this.awaitingBusinessLicense = true
      return "እንኳን ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት በደህና መጡ! \n\n your business license is not verified yet please provide your Business License Number in the format: **14/668/5068/2004** or upload your business license cerificate."
    }
  }
  getGreetingResponse(sentiment) {
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

  getHelpResponse() {
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

  getThanksResponse() {
    const thanks = [
      "You're welcome! Happy to help with your document analysis. 😊",
      "Glad I could assist! Let me know if you need help with any other documents.",
      "You're welcome! Feel free to upload more documents for analysis anytime."
    ]
    return thanks[Math.floor(Math.random() * thanks.length)]
  }

  getGeneralResponse(intents, entities, documentAnalysis) {
    if (documentAnalysis) {
      return this.getDocumentSpecificResponse(documentAnalysis, entities)
    }

    if (intents.length > 0) {
      return "I understand you're interested in document analysis! Please upload a document or tell me more specifically what you'd like me to analyze."
    }

    return "I'm here to help you analyze documents! You can upload research papers, legal documents, government IDs, financial records, or ask me to classify any document type."
  }

  getDocumentSpecificResponse(analysis, entities) {
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

  addSentimentTone(response, sentiment) {
    if (sentiment === 'positive') {
      return response.replace(/\./g, '!').replace(/I'm/g, "I'm absolutely")
    } else if (sentiment === 'negative') {
      return response.replace(/\!/g, '.').replace(/great/g, 'able to')
    }
    return response
  }
 isBusinessLicenseNumber(text) {
    const licenseRegex = /\b\d{2}\/\d{4}\/\d{4}\/\d{4}\b/
    return licenseRegex.test(text)
  }
  // Advanced document content analysis using Compromise
  analyzeDocumentContent(text) {
    const doc = this.nlp(text)
    
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
}

export const nlpProcessor = new NLPProcessor()