//import * as pdfjsLib from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'


import nlp from 'compromise'
import { pipeline } from '@huggingface/transformers';
import { apiHandler } from './API'
//import { processUserInputX } from './iftmsX.js'
//import { extractTextFromPDF } from './pdfAna.js'
import { db } from './database.js'
import { teSsAna } from "./tess.js"
import { teSsAnaC } from "./tessC.js"
import { pdfAnalyzerF } from './pdfAnalyzer.js'

import { pdfAnalyzerD } from '../services/pdfAnalyzer2.js'
import { generateSearchBasedResponse, simulateSearchResults } from './duck.js'
import {isActionButtonText,
  setupIntentPatterns,
  processStepInput,
  generateContinuationHTML,
  isContinuationMessage,
  handleBusinessLicenseInput,
  extractIntents,
  isResumeButton,
  extractEntities,
  extractTextFromPDF,
  extractLicenseNumber,
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
  handleActionButton,
  isBusinessLicenseNumber,
  analyzeDocumentContent, 
  validateNationalIdDetailed,
  isVehicleChassisNumber,
  isNationalId} from "./nlpP.js";
// Set up PDF.js worker

// State variables
let initialized = false
let currentIntent = null
let currentStep = null
let awaitingBusinessLicense = null
let awaitingVehicleInfo = null
let awaitingInsInfo = null
let isLibreValidated=null;
let awaitingDriverInfo=null;
let awaitingOTP = false
let isDriverValidated=null;
let iSbizValid = null
let isInsValidated=null
let isIftmsInit = false
 let ocrBackend=true;
let intentPatterns = {}
let stepResponses = {}
// Initialize NLP Processor
// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker



export async function initNLPProcessor() {
  if (initialized) return
  
  console.log('🔄 Initializing NLP Processor...')
  
  // CRITICAL FIX: Call setupIntentPatterns and setupStepResponses
  setupIntentPatterns()  // This populates intentPatterns from nlpP.js
  setupStepResponses()    // This populates stepResponses from nlpP.js
  
  // Also need to import the populated patterns from nlpP.js
  // Since setupIntentPatterns modifies the imported object, we need to 
  // make sure we're using the same reference
  
  initialized = true
  console.log('✅ NLP Processor initialized')
  console.log('📋 Intent patterns loaded:', Object.keys(intentPatterns))
}

// Helper to ensure patterns are loaded
function ensureInitialized() {
  if (!initialized) {
    initNLPProcessor()
  }
}
// Add at the top with other imports
import { InferenceSession } from 'onnxruntime-web'

// Add these variables
let embeddingSession = null
let retrievalSession = null

// Add this function
export async function loadModels(mdbrModelBuffer, colbertModelBuffer) {
  try {
    console.log('🔄 Loading AI models into NLP processor...')
    
    // Load embedding model (mdbr-leaf-mt)
    if (mdbrModelBuffer) {
      embeddingSession = await InferenceSession.create(mdbrModelBuffer)
      console.log('✅ Embedding model loaded')
    }
    
    // Load retrieval model (ColBERT)
    if (colbertModelBuffer) {
      retrievalSession = await InferenceSession.create(colbertModelBuffer)
      console.log('✅ Retrieval model loaded')
    }
    
    return true
  } catch (error) {
    console.error('❌ Failed to load models:', error)
    return false
  }
}

// Add this function for embeddings
export async function getEmbedding(text) {
  if (!embeddingSession) {
    console.warn('Embedding model not loaded')
    return null
  }
  
  try {
    // Create input tensor
    const inputData = new Float32Array(768) // Adjust size based on model
    const inputTensor = new InferenceSession.Tensor('float32', inputData, [1, 768])
    
    // Run inference
    const results = await embeddingSession.run({ input: inputTensor })
    return results.output.data
  } catch (error) {
    console.error('Failed to get embedding:', error)
    return null
  }
}
export async function chat(msg, file) {
  ensureInitialized()  // Make sure patterns are loaded
  
  // Process file based on service
  if (file) {
    if (file.type.startsWith('image/')) {
      console.log('🖼️ Image file detected, initializing OCR...');
      /* if (!teSsAna.isInitializedT || !teSsAna.tesseractWorker) {
                  await teSsAna.initializeTesseract()
              }*/
      const result = await teSsAnaC.analyzeDocument(file);
      if (result.detectedDocument['Insurance Certificate']) {
        
      } else if (result.detectedDocument['Vehicle Registration Document']) {
        if(awaitingVehicleInfo) {
      const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = currentStepVal + 1
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('isLibreValidated', 'true')
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
      }
      }
      return teSsAnaC.analyzeDocument(file)
    } else if (file.type === 'application/pdf') {
      return await pdfAnalyzerF.analyzeDocument(file)
    } else {
      throw new Error('Unsupported file type. Please use image files (JPEG, PNG, etc.)');
    }
  } else if (msg && typeof msg === 'string') {
    
    // DEBUG: Log what we're checking
    console.log('🔍 Checking message for intent patterns:', msg)
    
    // Check if it's a business license number
    if (isBusinessLicenseNumber(msg)) {
      console.log('✅ Business license detected')
      if(awaitingBusinessLicense) {
      
      const nextStep = 2
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('licenseValidated', 'true')
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
      } else{
      return await processMessage(`continue to step ${currentStep}`, null, false, false)} }
    // Check if it's a vehicle chassis number
    else if (isVehicleChassisNumber(msg)) {
      console.log('✅ Vehicle chassis detected')
      if(awaitingVehicleInfo) {
      const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = currentStepVal + 1
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('isLibreValidated', 'true')
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
      }else{
      return await processMessage(`continue to step ${currentStep}`, null, false, false)} }
    else if (isNationalId(msg).isValid) {
      console.log('✅ National ID detected')
      const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = currentStepVal + 1
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('isDriverValidated', 'true')
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
    }
    // Regular message processing - THIS WILL CHECK INTENTS
    else {
      console.log('📝 Processing regular message for intents:', msg)
      return await processMessage(msg, null, false, false)
    }
  }
}

// Process message
export async function processMessage(message, text, isFile, isImg) {
  ensureInitialized()  // Make sure patterns are loaded
  
  // Update session storage
  if (isFile) {
    const rslt = await extractLicenseNumber(text)
    iSbizValid = true
    console.log(rslt, text)
  } 
  if (isImg) {
    sessionStorage.setItem('isLibreV', true)
  }
  
  // CHECK FOR CONTINUATION MESSAGES FIRST
  if (message && isContinuationMessage(message)) {
    console.log('🔄 CONTINUATION MESSAGE DETECTED:', message)
    
    const stepMatch = message.match(/step\s*(\d+)/i)
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : 
                      (parseInt(sessionStorage.getItem('currentStep')) || 1)
    
    currentStep = stepNumber
    sessionStorage.setItem('currentStep', stepNumber.toString())
    
    const currentService = sessionStorage.getItem('currentService') || 'iftms'
    
    const stepR = await processStepInput([currentService], currentStep, 'neutral', '', 
                  localStorage.getItem('agig-language') || 'en', false)
    
    return {
      text: stepR.text,
      html: generateContinuationHTML(stepR, currentStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true,
      responseType: 'continuation',
      stepData: stepR
    }
  }
  
  // Check if this is an action button
  if (message && isActionButtonText(message)) {
    console.log('🔘 ACTION BUTTON DETECTED:', message)
    return handleActionButton(message)
  }
  
  // Check if this is a resume button
  if (message && isResumeButton(message)) {
    console.log('▶️ RESUME BUTTON DETECTED:', message)
    return {
      text: "Continuing from where we left off...",
      html: `<div class="continue-message">Continuing from where we left off...</div>`,
      isStructured: false,
      responseType: 'continue'
    }
  }
  
  // Handle business license validation
  if (message && isBusinessLicenseNumber(message)) {
    awaitingBusinessLicense = false
    iSbizValid = true
    return handleActionButton('verify and continue')
  }
  
  // Handle vehicle chassis validation
  if (message && isVehicleChassisNumber(message)) {
    awaitingVehicleInfo = false
    isLibreValidated = true
    console.log(isVehicleChassisNumber(message))
    return handleActionButton('Upload Driver Documents')
  }
  
 
 // Normal message processing with NLP
 if (message) {
   console.log('🔍 Processing message with NLP:', message)
   
   const doc = nlp(message)
   
   // NEW: Get structured intents with priority levels
   const intentResult = extractIntents(doc)
   const entities = extractEntities(doc)
   const sentiment = analyzeSentiment(doc)
   
   console.log('🎯 Intent result:', {
     primary: intentResult.primary,
     secondary: intentResult.secondary,
     tertiary: intentResult.tertiary,
     main: intentResult.main,
     isPrimary: intentResult.isPrimary
   })
   
   currentStep = sessionStorage.getItem('currentStep')
   
   // Get the existing service intent (if any)
   const existingServiceIntent = sessionStorage.getItem('currentIntent') || 
                                 sessionStorage.getItem('intnt') || 
                                 'general'
   
   let primaryIntent = intentResult.main
   
   // CRITICAL: Don't switch service for secondary/tertiary intents
   if (intentResult.isSecondary || intentResult.isTertiary) {
     // Keep existing service intent
     primaryIntent = existingServiceIntent
     console.log(`💬 Secondary/tertiary intent detected - keeping existing service: ${primaryIntent}`)
   } else if (intentResult.isPrimary) {
     // Only switch service for primary intents
     console.log(`🎯 Primary intent detected - switching to: ${primaryIntent}`)
   } else {
     // No clear intent, keep existing
     primaryIntent = existingServiceIntent
   }
   
   // Update current intent if changed AND it's a primary intent
   if (currentIntent !== primaryIntent && intentResult.isPrimary) {
     console.log(`🔄 Intent changed from ${currentIntent} to ${primaryIntent}`)
     currentIntent = primaryIntent
     sessionStorage.setItem('currentIntent', currentIntent)
     sessionStorage.setItem('currentService', currentIntent)
     
     // Reset step when intent changes to iftms (only for primary)
     if (primaryIntent === 'iftms') {
       currentStep = 1
       sessionStorage.setItem('currentStep', currentStep)
       isIftmsInit = true
       awaitingOTP = false
       awaitingBusinessLicense = true
     }
   }
   
   // Get current step from session storage
   const storedStep = sessionStorage.getItem('currentStep')
   if (storedStep) {
     currentStep = parseInt(storedStep)
   }
   
   // Handle different intent types
   if (intentResult.isSecondary) {
     // Handle secondary intents (greeting, thanks, help) without changing service
     const secondaryIntent = intentResult.secondary[0]
     
     switch(secondaryIntent) {
       case 'greeting':
         return {
           text: getGreetingResponse(sentiment),
           html: `<div class="greeting-response">${getGreetingResponse(sentiment)}</div>`,
           isStructured: false,
           responseType: 'greeting'
         }
       case 'thanks':
         return {
           text: getThanksResponse(),
           html: `<div class="thanks-response">${getThanksResponse()}</div>`,
           isStructured: false,
           responseType: 'thanks'
         }
       case 'help':
         return {
           text: getHelpResponse(),
           html: getHelpResponse(),
           isStructured: true,
           responseType: 'help'
         }
       default:
         // Continue to normal flow
         break
     }
   }
    
    // IFTMS-specific flow
    if (currentIntent === 'iftms') {
      console.log('🚛 IFTMS flow active, step:', currentStep)
      
      const licenseValidated = sessionStorage.getItem('licenseValidated') === 'true'
      const isDriverValidated = sessionStorage.getItem('isDriverValidated') === 'true'
      const isLibreValidated = sessionStorage.getItem('isLibreValidated') === 'true'
      
      if (!isIftmsInit && !awaitingBusinessLicense) {
        isIftmsInit = true
        awaitingBusinessLicense = true
        currentStep = 1
        sessionStorage.setItem('currentStep', currentStep)
      }
      
      // Update step based on progress
      if (!awaitingBusinessLicense && iSbizValid && !isLibreValidated) {
        if (currentStep < 2) {
          currentStep = 2
          sessionStorage.setItem('currentStep', currentStep)
          awaitingVehicleInfo = true
        }
      }
      
      if (iSbizValid && awaitingVehicleInfo) {
        if (currentStep < 3) {
          currentStep = 3
          sessionStorage.setItem('currentStep', currentStep)
        }
      }
      
      if (isDriverValidated && !isInsValidated) {
        if (currentStep < 4) {
          currentStep = 4
          sessionStorage.setItem('currentStep', currentStep)
          awaitingBusinessLicense = false
          awaitingVehicleInfo = false
          awaitingDriverInfo = false
        }
      }
      
      // Generate IFTMS response
      const iftmsResponse = await getIftmsResponse(currentIntent, currentStep, sentiment, message, 
                            localStorage.getItem('agig-language') || 'en', isFile)
      
      return generateContextualResponse({
        currentStep: currentStep,
        intents: [currentIntent],
        sentiment: sentiment,
        processedText: message,
        awaitingInput: true,
        language: localStorage.getItem('agig-language') || 'en',
        shouldUploadFile: false,
        responseType: 'iftms',
        customResponse: iftmsResponse
      })
    } else {
      // Non-IFTMS flow
      const responseType = determineResponseType(intentResult.all)
      
      if (responseType && (intentResult.all.length === 0 || intentResult.all.includes('general'))) {
        return generateSearchBasedResponse(responseType, message, localStorage.getItem('agig-language') || 'en')
      }
      
      return generateContextualResponse({
        intents: Array.isArray(intentResult) ? intentResult : [intentResult],
        currentStep: null,
        entities: entities,
        sentiment: sentiment,
        processedText: message,
        shouldUploadFile: false,
        responseType: responseType,
        awaitingInput: false
      })
    }
  }
  
  // Default fallback
  return {
    text: "How can I help you?",
    html: "<div>How can I help you?</div>",
    isStructured: false,
    responseType: 'default'
  }
}
// Export as nlpProcessor object for backward compatibility
export const nlpProcessor = {
  init: initNLPProcessor,

  chat,
  processMessage,
  
  //handleBusinessLicenseInput,
  //extractIntents,
 // extractEntities,
  //extractTextFromPDF,
  //analyzeSentiment,
  //shouldRequestFileUpload,
  //determineResponseType
  //generateContextualResponse,
 // setupStepResponses,
  //getIftmsResponse,
  //getGreetingResponse,
  //getHelpResponse,
  //getThanksResponse,
  //getGeneralResponse,
  //addSentimentTone,
  //isBusinessLicenseNumber,
  //analyzeDocumentContent
}