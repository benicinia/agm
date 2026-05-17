//import * as pdfjsLib from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'


import nlp from 'compromise'
import { pipeline } from '@xenova/transformers';
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
 // awaitingOTP = sessionStorage.getItem('otp') === 'true'
 // iSbizValid = sessionStorage.getItem('licenseValidated') === 'true'
  initialized = true
    await initNLPProcessor()
  setupIntentPatterns()
  setupStepResponses()
  console.log('✅ NLP Processor initialized')
}


export async function chat(msg, file) {
  
  // Process file based on service
  if (file) {
    if (file.type.startsWith('image/')) {
                console.log('🖼️ Image file detected, initializing OCR...');
               
                return teSsAnaC.analyzeDocument(file)
            } else if (file.type === 'application/pdf') {
               // throw new Error('PDF processing handled by external PDF.js implementation');
                return pdfAnalyzerF.analyzeDocument(file)
            } else {
                throw new Error('Unsupported file type. Please use image files (JPEG, PNG, etc.)');
            }
  } else if (msg) {
    // Check if it's a business license number
    if (isBusinessLicenseNumber(msg)) {
      // Auto-advance to next step
     // const currentStep = parseInt(sessionStorage.getItem('currentStep')) || 1
      const currentStep = 1
     const nextStep = 2
      
      // Update session storage
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('licenseValidated', 'true')
      
      // Send continuation message to processMessage
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
    } 
    // Check if it's a vehicle chassis number
    else if (isVehicleChassisNumber(msg)) {
      // Auto-advance to next step
      const currentStep = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = currentStep + 1
      
      // Update session storage
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('isLibreValidated', 'true')
      console.log(isVehicleChassisNumber(msg))
      // Send continuation message to processMessage
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
    }
    else if (isNationalId(msg)) {
      // Auto-advance to next step
      const currentStep = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = 3 + 1
      
      // Update session storage
      sessionStorage.setItem('currentStep', nextStep.toString())
      sessionStorage.setItem('isDriverValidated', 'true')
      console.log(isNationalId(msg))
      // Send continuation message to processMessage
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
    }
    // Regular message processing
    else {
      return await processMessage(msg, null, false, false)
    }
  }
}

// Process message
export async function processMessage(message,text, isFile,isImg) {

  // Allocate a pipeline for sentiment-analysis
/*let pipe = await pipeline('sentiment-analysis');
let out = await pipe('I love transformers!');
console.log(out)*/
  if (isFile) {
   const rslt = await extractLicenseNumber(text)
   
  iSbizValid=true
    console.log(rslt,text)
  } if(isImg) {
 sessionStorage.setItem('isLibreV',true)
 } else if(text){
 
    
   
  }
        //db.saveServiceStats(message) // Uncomment if needed
        
 //await extractTextFromPDF(message)
// console.log(message)
  
  
  // Update session storage
 // sessionStorage.setItem('otp', awaitingOTP)
 // sessionStorage.setItem('licenseValidated', iSbizValid)
 //  sessionStorage.setItem('isLibreValidated', isLibreValidated)
  // FUCKING CHECK FOR CONTINUATION MESSAGES FIRST
  if (isContinuationMessage(message)) {
    console.log('🔄 CONTINUATION MESSAGE DETECTED:', message)
    
    // Extract step number from message
    const stepMatch = message.match(/step\s*(\d+)/i)
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : 
                      (parseInt(sessionStorage.getItem('currentStep')) || 1)
    
    // Update current step
    currentStep = stepNumber
    sessionStorage.setItem('currentStep', stepNumber.toString())
    
    // Get the current service
    const currentService = sessionStorage.getItem('currentService') || 'iftms'
    
    // Generate response for that step
    const stepR = await processStepInput([currentService], currentStep, 'neutral', '', localStorage.getItem('agig-language') || 'en', false)
    
    return {
      text: stepR.text,
      html: generateContinuationHTML(stepR, currentStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true,
      responseType: 'continuation',
      stepData: stepR
    }
  }
  
  // Check if this is an action button - DO NOT PROCESS WITH NLP
  if (isActionButtonText(message)) {
    console.log('🔘 ACTION BUTTON DETECTED:', message)
    return handleActionButton(message)
  }
  
  // Check if this is a resume button
  if (isResumeButton(message)) {
    console.log('▶️ RESUME BUTTON DETECTED:', message)
    return {
      text: "Continuing from where we left off...",
      html: `<div class="continue-message">Continuing from where we left off...</div>`,
      isStructured: false,
      responseType: 'continue'
    }
  }
if (isBusinessLicenseNumber(message)) {
  awaitingBusinessLicense=false
  iSbizValid=true
 return  handleActionButton('verify and continue')
}

if (isVehicleChassisNumber) {
  awaitingVehicleInfo=false
  isLibreValidated=true
  console.log(isVehicleChassisNumber(message))
  return  handleActionButton('Upload Driver Documents')
}
  // Normal message processing with NLP
  
    const doc = nlp(message)
  const intents = extractIntents(doc)
  const entities = extractEntities(doc) 
  const sentiment = analyzeSentiment(doc)
  currentStep=sessionStorage.getItem('currentStep')
  // Store the primary intent (take first one if array)
  const primaryIntent = Array.isArray(intents) && intents.length > 0 ? intents[0] : 'general'
  
  // Update current intent if changed
  if (currentIntent !== primaryIntent) {
    currentIntent = primaryIntent
    sessionStorage.setItem('currentIntent', currentIntent)
    
    // Reset step when intent changes
    if (!isFile && currentIntent === 'iftms') {
      currentStep = 1
      sessionStorage.setItem('currentStep', currentStep)
      
    //  sessionStorage.setItem('currentIntent', currentIntent)
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
  
  // IFTMS-specific flow
  if (currentIntent === 'iftms') {
    // Check IFTMS status from session storage
   const licenseValidated = sessionStorage.setItem('licenseValidated',iSbizValid) 
    
    const isDriverValidatd = sessionStorage.getItem('isDriverValidated',isDriverValidated) === 'true'
    const isLibreValidatd = sessionStorage.getItem('isLibreValidated') === 'true'
    const user = sessionStorage.getItem('user')
    
    if (!isIftmsInit && !awaitingBusinessLicense) {
      isIftmsInit = true
      awaitingBusinessLicense=true
      currentStep = 1
      sessionStorage.setItem('currentStep', currentStep)
    }
    
    // Update step based on progress
    if (awaitingBusinessLicense==false && iSbizValid && !isLibreValidatd) {
      if (currentStep < 2) {
        currentStep = 1
        sessionStorage.setItem('currentStep', currentStep)
        isLibreValidated=false
        awaitingVehicleInfo = true
        
      }
    }
    if (iSbizValid && awaitingVehicleInfo==true) {
      if (currentStep < 3) {
        currentStep = 3
       // isLibreValidated=true
        sessionStorage.setItem('currentStep', currentStep)
       // awaitingBusinessLicense = false
       // awaitingVehicleInfo = false
       // awaitingDriverInfo=true
        
      }
    }
    if (isDriverValidatd && !isInsValidated) {
      if (currentStep < 4) {
        currentStep = 4
        isDriverValidated=true
        isLibreValidated=true
        sessionStorage.setItem('currentStep', currentStep)
        awaitingBusinessLicense = false
        awaitingVehicleInfo = false
        awaitingDriverInfo=false
        
      }
    }
    // Generate IFTMS response
    const iftmsResponse = await getIftmsResponse(currentIntent, currentStep, sentiment, message, localStorage.getItem('agig-language') || 'en', isFile)
    
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
    // Non-IFTMS flow - use YOUR original search logic
    const responseType = determineResponseType(intents)
    
    // YOUR FUCKING ORIGINAL LOGIC: Check if we have search summary for unclear intents
    // BUT only if it's NOT an action button or continuation
    if (responseType && (intents.length === 0 || intents.includes('general'))) {
      return generateSearchBasedResponse(responseType, message, localStorage.getItem('agig-language') || 'en')
    }
    
    return generateContextualResponse({
      intents: Array.isArray(intents) ? intents : [intents],
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