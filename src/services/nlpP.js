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
import { pdfAnalyzerF } from './pdfAnalyzer.js'
import { generateSearchBasedResponse, simulateSearchResults } from './duck.js'
import { intentPatternsx } from "./intnts.js";
import { ministriesFed } from "./data.js";
// Set up PDF.js worker

// State variables
let initialized = false
let currentIntent = null
let currentStep = 0
//let awaitingBusinessLicense = false
let awaitingVehicleInfo = false
let isLibreValidated=null;
let awaitingDriverInfo=null;
let awaitingOTP = false
let isDriverValidated=null;
//let iSbizValid = false
let isInsValidated=null
let isIftmsInit = false
let arePhotosUp = false
let numPhotos = 3
let intentPatterns = {}
let stepResponses = {}
let awaitingPhotoUpload=null
let themeChosen =null
let chosenTheme = null
// Initialize NLP Processor
// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
export async function initNLPProcessor() {
  if (initialized) return
  
  console.log('🔄 Initializing NLP Processor...')
 // awaitingOTP = sessionStorage.getItem('otp') === 'true'
 // iSbizValid = sessionStorage.getItem('licenseValidated') === 'true'
  initialized = true
  console.log('✅ NLP Processor initialized')
}

// Setup intent patterns
export function setupGovPatterns() {
  govPatterns = ministriesFed
  /*intentPatterns = {
    // Document analysis intents
    generateVideo:['create video clip',
      'video ad',
      'ቪዲዮ ፍጠር',
      'slide show'
      
    ],
    analyzeResearch: [
      'Analyze a research paper',
      'የጥናትና ምርምር',
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
      'የሰነዶች ማረጋገጫ',
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
      'integrated freight management service',
      'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት',
      'Ministry of Transport and Logistics',
      'ትራንስፖርት እና ሎጂስቲክስ',
      'Integrated Freight Transport management system',
      'MOTL',
      'IFTMS',
      'iftms',
      'ministry of transport and logistics',
      'freight transport registration and renewal',
      'start iftms application',
     ' I want to apply for freight license',
      'new transport license',
       'begin iftms process',
       'የጭነት ፈቃድ ማመልከት እፈልጋለሁ',
      'iftms አመልካች መጀመር',
       'transport license application',
       'freight management system'
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
    affirm:[
      
       'yes',
       'yeah',
       'correct',
       'thats right',
       'okay',
       'አዎ',
       'በትክክል',
       'ልክ ነው',
       'eshi',
       'awo',
       'ok',
       'ይቻላል'

    ],
    deny:[
'no',
       'nope',
       'not yet',
       'wrong',
       'አይ',
      ' አልሆነም',
      'ገና አይደለም',
      'embi'
    ],
    out_of_scope:
    [
     'whats the weather',
       'tell me a joke',
       'who are you',
       'what time is it',
       'play music',
      'order food'
    ],
    structureRequest: [
      'structure',
      'how is this organized',
      'document layout', 
      'sections'
    ],
    status:[
       ' application status',
      'where am I in the process',
     'check my application',
      'whats my status',
     ' የኔ ሁኔታ ምንድን ነው',
      'ማመልከቻዬ ወዴት ደርሷል'
    ],
    // General intents
    greeting: [
      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'
    ],
    help: [
      'help', 'what can you do', 'capabilities', 'features','what can you do',
      ' how does this work','show me options','እገዛ','ምን ማድረግ እችላለሁ','እርዳኝ','embi alegn','እምቢ አለኝ',
      'አስቸገረኝ','ይቻላል እንዴ'
    ],
    thanks: [
      'thank you','አመሰግናለሁ', 'thanks', 'appreciate it', 'gracias'
    ]
  }*/
}
export function setupIntentPatterns() {
  intentPatterns = intentPatternsx
  /*intentPatterns = {
    // Document analysis intents
    generateVideo:['create video clip',
      'video ad',
      'ቪዲዮ ፍጠር',
      'slide show'
      
    ],
    analyzeResearch: [
      'Analyze a research paper',
      'የጥናትና ምርምር',
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
      'የሰነዶች ማረጋገጫ',
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
      'integrated freight management service',
      'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት',
      'Ministry of Transport and Logistics',
      'ትራንስፖርት እና ሎጂስቲክስ',
      'Integrated Freight Transport management system',
      'MOTL',
      'IFTMS',
      'iftms',
      'ministry of transport and logistics',
      'freight transport registration and renewal',
      'start iftms application',
     ' I want to apply for freight license',
      'new transport license',
       'begin iftms process',
       'የጭነት ፈቃድ ማመልከት እፈልጋለሁ',
      'iftms አመልካች መጀመር',
       'transport license application',
       'freight management system'
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
    affirm:[
      
       'yes',
       'yeah',
       'correct',
       'thats right',
       'okay',
       'አዎ',
       'በትክክል',
       'ልክ ነው',
       'eshi',
       'awo',
       'ok',
       'ይቻላል'

    ],
    deny:[
'no',
       'nope',
       'not yet',
       'wrong',
       'አይ',
      ' አልሆነም',
      'ገና አይደለም',
      'embi'
    ],
    out_of_scope:
    [
     'whats the weather',
       'tell me a joke',
       'who are you',
       'what time is it',
       'play music',
      'order food'
    ],
    structureRequest: [
      'structure',
      'how is this organized',
      'document layout', 
      'sections'
    ],
    status:[
       ' application status',
      'where am I in the process',
     'check my application',
      'whats my status',
     ' የኔ ሁኔታ ምንድን ነው',
      'ማመልከቻዬ ወዴት ደርሷል'
    ],
    // General intents
    greeting: [
      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'
    ],
    help: [
      'help', 'what can you do', 'capabilities', 'features','what can you do',
      ' how does this work','show me options','እገዛ','ምን ማድረግ እችላለሁ','እርዳኝ','embi alegn','እምቢ አለኝ',
      'አስቸገረኝ','ይቻላል እንዴ'
    ],
    thanks: [
      'thank you','አመሰግናለሁ', 'thanks', 'appreciate it', 'gracias'
    ]
  }*/
}
export async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    
    fileReader.onload = async function() {
      try {
        const typedArray = new Uint8Array(this.result)
        const pdf = await pdfjsLib.getDocument(typedArray).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map(item => item.str).join(' ')
          fullText += pageText + '\n'
        }

        resolve(fullText)
      } catch (error) {
        reject(error)
      }
    }

    fileReader.onerror = reject
    fileReader.readAsArrayBuffer(file)
  })
}
// Check if text is a continuation message
export function isContinuationMessage(text) {
  const lowerText = text.toLowerCase() 
  return lowerText.includes('continuing from') || 
         lowerText.includes('continuing...') ||
         lowerText.includes('continue from') ||
         lowerText.includes('ወደ ቀጣዩ ደረጃ') || 
         lowerText.includes('resume from') ||
         lowerText.includes('step') && (lowerText.includes('continue') || lowerText.includes('resume'))
}

// Check if text is an action button text
export function isActionButtonText(text) {
  const actionButtons = [
    'Upload Business License', 'Enter License Manually',
    'Upload Vehicle Documents', 'Add Another Vehicle',
    'Upload Driver Documents', 'Complete',
    'Download License', 'Start New Application',
    'Upload License', 'Enter License Number',
    'Upload Tax Certificate', 'Upload Other Documents',
    'Make Payment', 'Upload Payment Receipt',
    'Download New License', 'Print Certificate',
    'Verify and Continue', 'Browse File',
    'Continue Response', 'Resume', 'Continue'
  ]
  
  const lowerText = text.toLowerCase()
  return actionButtons.some(action => 
    lowerText.includes(action.toLowerCase().substring(0, 8))
  )
}

// Check if text is a resume/continue button
export function isResumeButton(text) {
  const resumeTexts = ['Continuing...','continue response', 'resume', 'continue', 'play_arrow']
  const lowerText = text.toLowerCase()
  return resumeTexts.some(resume => lowerText.includes(resume))
}

// Generate HTML for action responses
export function generateActionResponseHTML(text, service, currentStep, nextStep, language) {
  const stepResponses = {
      generateVideo: {
      1: ['Upload photos'],
      2: ['send video title'],
      3: ['choose theme'],
      4: ['Download video', 'Create New video']
    },
    iftms: {
      1: ['Upload Business License', 'Enter License Manually'],
      2: ['Upload Vehicle Documents', 'Add Another Vehicle'],
      3: ['Upload Driver Documents', 'Complete'],
      4: ['Download License', 'Start New Application']
    },
    renewDoc: {
      1: ['Upload License', 'Enter License Number'],
      2: ['Upload Tax Certificate', 'Upload Other Documents'],
      3: ['Make Payment', 'Upload Payment Receipt'],
      4: ['Download New License', 'Print Certificate']
    }
  }
  
  const actions = stepResponses[service]?.[nextStep || currentStep] || []
  
  return `
    <div class="message-content action-response" 
         data-service="${service}" 
         data-step="${currentStep}" 
         data-next-step="${nextStep}">
      <div class="action-text">
        <p>${text}</p>
      </div>
      ${actions.length > 0 ? `
      <div class="action-buttons">
        ${actions.map(action => `
          <button class="action-btn" 
                  data-action="${action}" 
                  data-service="${service}" 
                  data-step="${nextStep || currentStep}">
            ${action}
          </button>
        `).join('')}
      </div>
      ` : ''}
    </div>
  `
}
// In nlpP.js - fix the function call
export function isVehicleChassisNumber(text) {
  if (!text || typeof text !== 'string') return false;
  
  const cleanText = text.toString().trim().toUpperCase();
  
  // Must be exactly 17 characters
  if (cleanText.length !== 17) return false;
  
  // No I, O, Q allowed
  if (/[IOQ]/.test(cleanText)) return false;
  
  // Must be alphanumeric
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanText)) return false;
  
  // Validate check digit
  return validateVinCheckDigit(cleanText);
}

export function validateVinCheckDigit(vin) {
  // Transliteration values for VIN characters
  const transliteration = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9
  }
  
  // Weight factors for each position (1-indexed)
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
  
  let sum = 0
  
  // Calculate weighted sum
  for (let i = 0; i < 17; i++) {
    const char = vin[i]
    const value = transliteration[char]
    
    // If character not found in transliteration table, return false
    if (value === undefined) {
      return false
    }
    
    sum += value * weights[i]
  }
  
  // Calculate check digit
  const remainder = sum % 11
  const expectedCheckDigit = remainder === 10 ? 'X' : remainder.toString()
  
  // Get actual check digit (position 9, index 8)
  const actualCheckDigit = vin[8]
  
  return actualCheckDigit === expectedCheckDigit
}

// Test examples - these should all return true
console.log(isVehicleChassisNumber("1HGCM82633A123456")) // Should return true (valid Honda VIN)
console.log(isVehicleChassisNumber("5YJSA1E2XHF123456")) // Should return true (valid Tesla VIN)
console.log(isVehicleChassisNumber("JH4KA8260PC001234")) // Should return true (valid Acura VIN)
console.log(isVehicleChassisNumber("1G1BL52P7TR115520")) // Should return true (valid Chevy VIN)
console.log(isVehicleChassisNumber("WDBEA90E1BF123456")) // Should return true (valid Mercedes VIN)

// Test invalid examples
console.log(isVehicleChassisNumber("12345678901234567")) // false (invalid characters)
console.log(isVehicleChassisNumber("ABCDEFGHIJKLMNOPQ")) // false (contains O and Q)
console.log(isVehicleChassisNumber("1HGCM82633A12345"))  // false (too short)r("1HGCM82633A12345"))  // false (too short)

export function handleActionButton(message) {
  const language = localStorage.getItem('agig-language') || 'en'
  const currentService = sessionStorage.getItem('intnt') || 'iftms'
  const currentStep = parseInt(sessionStorage.getItem('currentStep')) || 1
  
  // Map action buttons to responses
  const actionResponses = {
  
    'Upload Business License': {
      text: language === 'am' 
        ? 'እባክዎ የንግድ ፈቃድ ሰነድዎን ይስቀሉ። ፋይሉ ፒዲኤፍ ወይም ምስል ሊሆን ይችላል።'
        : 'Please upload your business license document. The file can be PDF or image format.',
      nextStep: currentStep
    },
    'Enter License Manually': {
      text: language === 'am'
        ? 'እባክዎ የንግድ ፈቃድ ቁጥርዎን ያስገቡ (ምሳሌ: 14/668/5068/2004)'
        : 'Please enter your business license number (e.g., 14/668/5068/2004)',
      nextStep: currentStep
    },
    'Verify and Continue': {
      text: language === 'am'
        ? '✅ ፈቃድ ቁጥር ተረጋግጧል! አሁን የተሽከርካሪዎን ሰነዶች ያስገቡ።'
        : '✅ License number verified! Now please upload your vehicle documents.',
      nextStep: currentStep + 1
    },
    'Upload Vehicle Documents': {
      text: language === 'am'
        ? 'እባክዎ የተሽከርካሪ ምዝገባ ሰነዶችዎን ይስቀሉ።'
        : 'Please upload your vehicle registration documents.',
      nextStep: currentStep
    },
    'Add Another Vehicle': {
      text: language === 'am'
        ? 'ሌላ ተሽከርካሪ ለመጨመር እባክዎ ሰነዶቹን ይስቀሉ።'
        : 'To add another vehicle, please upload the documents.',
      nextStep: currentStep
    },
    'Upload Driver Documents': {
      text: language === 'am'
        ? 'እባክዎ የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነድ ይስቀሉ።'
        : "Please upload driver's license and national ID document.",
      nextStep: currentStep,
      
    },
    'Complete': {
      text: language === 'am'
        ? 'ሁሉም ሰነዶች ተቀብለዋል። ማጠናቀቂያ ላይ ነው...'
        : 'All documents received. Finalizing...',
      nextStep: currentStep + 1
    },
    'Download License': {
      text: language === 'am'
        ? '✅ የጭነት መጓጓዣ ፈቃድዎ ተሰጥቷል። ሰነዱን ለማውረድ ከዚህ በታች ይጫኑ።'
        : '✅ Your freight transport license has been approved. Click below to download the document.',
      nextStep: null
    },
    'Start New Application': {
      text: language === 'am'
        ? 'ሌላ ተሽከርካሪ መጨመር ይፈልጋሉ?'
        : 'Would you like to  add another vehicle?',
      nextStep: 2
    }
  }
  
  // Find matching action
  for (const [action, response] of Object.entries(actionResponses)) {
    if (message.toLowerCase().includes(action.toLowerCase().substring(0, 10))) {
      // Update session storage if moving to next step
      if (response.nextStep) {
        sessionStorage.setItem('currentStep', response.nextStep.toString())
      }
      
      return {
        text: response.text,
        html: generateActionResponseHTML(response.text, currentService, currentStep, response.nextStep, language),
        isStructured: true,
        responseType: 'action',
        nextStep: response.nextStep
      }
    }
  }
  
  // Default action response
  return {
    text: language === 'am' ? 'እርምጃው ተከናውኗል።' : 'Action completed.',
    html: `<div class="action-message">${language === 'am' ? 'እርምጃው ተከናውኗል።' : 'Action completed.'}</div>`,
    isStructured: false,
    responseType: 'action'
  }
}
 export function extractLicenseNumber(text) {
    // Extract business license number patterns
    const licensePatterns = [
      /\b\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}\b/, // 14/668/5068/2004
      /\bBL\d{8,12}\b/i, // BL123456789
      /\d{8,12}\b/i, // LIC123456789
    ]
    
    for (const pattern of licensePatterns) {
      const match = text.match(pattern)
      if (match) return match[0]
    }
    
    return null
  }
  // In nlpP.js, add this function:

export function isNationalId(text) {
  if (!text || typeof text !== 'string') return false;
  
  const cleanText = text.toString().trim().toUpperCase();
  
  // Check for FCN (Fayda Card Number) pattern
  // Format: FCN followed by 16 digits (as seen in image: FCN 6942507465347840)
  const fcnRegex = /^FCN\s*(\d{16})$/i;
  const fcnMatch = cleanText.match(fcnRegex);
  
  if (fcnMatch) {
    return {
      isValid: true,
      type: 'fcn',
      number: fcnMatch[1],
      fullNumber: cleanText
    };
  }
  
  // Check for raw 16-digit number
  const rawNumberRegex = /^(\d{16})$/;
  const rawMatch = cleanText.match(rawNumberRegex);
  
  if (rawMatch) {
    return {
      isValid: true,
      type: 'fcn_raw',
      number: rawMatch[1],
      fullNumber: cleanText
    };
  }
  
  // Check for alternative formats
  const alternativeFormats = [
    /^FAYDA\s*(\d{16})$/i,
    /^ID\s*(\d{16})$/i,
    /^NATIONAL\s*ID\s*(\d{16})$/i
  ];
  
  for (const pattern of alternativeFormats) {
    const match = cleanText.match(pattern);
    if (match) {
      return {
        isValid: true,
        type: 'alternative',
        number: match[1],
        fullNumber: cleanText
      };
    }
  }
  
  return {
    isValid: false,
    type: null,
    number: null,
    fullNumber: null
  };
}

// Additional validator with more detailed validation (checksum, formatting)
export function validateNationalIdDetailed(text) {
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      errors: ['No input provided']
    };
  }
  
  const cleanText = text.toString().trim().toUpperCase();
  const errors = [];
  
  // Check for FCN prefix
  const hasFCN = cleanText.includes('FCN');
  const hasFayda = cleanText.includes('FAYDA');
  
  // Extract numbers (remove all non-digits)
  const numbersOnly = cleanText.replace(/\D/g, '');
  
  // Validate length
  if (numbersOnly.length !== 16) {
    errors.push(`Invalid length: expected 16 digits, got ${numbersOnly.length}`);
  }
  
  // Check if all characters are digits
  if (!/^\d+$/.test(numbersOnly)) {
    errors.push('Contains non-digit characters');
  }
  
  // Optional: Luhn algorithm check for Ethiopian National ID
  // (if there's a known checksum pattern)
  const hasValidChecksum = validateNationalIdChecksum(numbersOnly);
  if (!hasValidChecksum && numbersOnly.length === 16) {
    errors.push('Invalid checksum');
  }
  
  // Format validation
  let formatted = '';
  if (hasFCN || hasFayda) {
    const prefix = hasFCN ? 'FCN' : 'FAYDA';
    formatted = `${prefix} ${numbersOnly}`;
  } else {
    formatted = `FCN ${numbersOnly}`;
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    rawNumber: numbersOnly,
    formattedNumber: formatted,
    details: {
      prefix: hasFCN ? 'FCN' : (hasFayda ? 'FAYDA' : null),
      number: numbersOnly,
      length: numbersOnly.length
    }
  };
}

// Optional: Checksum validation (if Ethiopian National ID uses a specific algorithm)
function validateNationalIdChecksum(number) {
  if (!number || number.length !== 16) return false;
  
  // Example: Luhn algorithm (commonly used for ID numbers)
  // Modify this based on actual Ethiopian National ID checksum algorithm
  let sum = 0;
  let isEven = false;
  
  // Loop from right to left
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (sum % 10) === 0;
}

// Extract National ID from text (for OCR results)
export function extractNationalId(text) {
  if (!text || typeof text !== 'string') return null;
  
  const patterns = [
    /FCN\s*(\d{16})/i,
    /FAYDA\s*(\d{16})/i,
    /NATIONAL\s*ID\s*(\d{16})/i,
    /\b(\d{16})\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        fullMatch: match[0],
        number: match[1],
        formatted: `FCN ${match[1]}`
      };
    }
  }
  
  return null;
}

// Parse full National ID document (extract all fields)
export function parseNationalIdDocument(text) {
  if (!text || typeof text !== 'string') return null;
  
  const lines = text.split('\n');
  const result = {
    fcnNumber: null,
    firstName: null,
    middleName: null,
    lastName: null,
    fullName: null,
    dateOfBirth: null,
    sex: null,
    countryOfCitizenship: null,
    rawText: text
  };
  
  // Extract FCN number
  const fcnMatch = extractNationalId(text);
  if (fcnMatch) {
    result.fcnNumber = fcnMatch.formatted;
  }
  
  // Extract name (based on your image format)
  const nameMatch = text.match(/Mesfin\s+Derbew\s+Gebrehiwot/i);
  if (nameMatch) {
    result.fullName = nameMatch[0];
    const nameParts = result.fullName.split(' ');
    if (nameParts.length >= 3) {
      result.firstName = nameParts[0];
      result.middleName = nameParts[1];
      result.lastName = nameParts[2];
    }
  }
  
  // Extract date of birth (DD/MM/YYYY format)
  const dobMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dobMatch) {
    result.dateOfBirth = dobMatch[1];
  }
  
  // Extract sex
  const sexMatch = text.match(/Male|Female|ወንድ|ሴት/i);
  if (sexMatch) {
    result.sex = sexMatch[0];
  }
  
  // Extract country
  const countryMatch = text.match(/Ethiopian|ኢትዮጵያ/i);
  if (countryMatch) {
    result.countryOfCitizenship = 'Ethiopia';
  }
  
  return result;
}

// Usage examples:
// isNationalId("FCN 6942507465347840") // returns { isValid: true, type: 'fcn', number: '6942507465347840', ... }
// isNationalId("6942507465347840") // returns { isValid: true, type: 'fcn_raw', number: '6942507465347840', ... }
// isNationalId("FAYDA 6942507465347840") // returns { isValid: true, type: 'alternative', ... }
// Process message
export async function processMessage(message,text, isFile,isImg) {
  await initNLPProcessor()
  setupIntentPatterns()
   setupGovPatterns()
  setupStepResponses()
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
 if (text['documentType']==='Vehicle Registration Document') {
  isLibreValidated=true
  //sessionStorage.setItem('isLibreValidated',true)
 } if (text['documentType']==='Government Document') {
  iSbizValid=true
  //sessionStorage.setItem('isLibreValidated',true)
   console.log(text['documentType'])
 }
    
   
  }
        //db.saveServiceStats(message) // Uncomment if needed
        
 //await extractTextFromPDF(message)
// console.log(message)
  
  
  // Update session storage
  sessionStorage.setItem('otp', awaitingOTP)
  sessionStorage.setItem('licenseValidated', iSbizValid)
   sessionStorage.setItem('isLibreValidated', isLibreValidated)
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
    const currentService = sessionStorage.getItem('intnt') || 'iftms'
    
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
 


  // Normal message processing with NLP
  const doc = nlp(message)
  const intents = extractIntents(doc)
  const entities = extractEntities(doc) 
  const sentiment = analyzeSentiment(doc)
  
  // Store the primary intent (take first one if array)
  const primaryIntent = Array.isArray(intents) && intents.length > 0 ? intents[0] : 'general'
  
  // Update current intent if changed
  if (currentIntent !== primaryIntent) {
    currentIntent = primaryIntent
    sessionStorage.setItem('intnt', currentIntent)
    
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
    const licenseValidated = sessionStorage.getItem('licenseValidated') === 'true'
    
    const isDriverValidatd = sessionStorage.getItem('isDriverValidated') === 'true'
    const isLibreValidatd = sessionStorage.getItem('isLibreValidated') === 'true'
    const user = sessionStorage.getItem('user')
    
    if (!isIftmsInit) {
      isIftmsInit = true
      currentStep = 1
      sessionStorage.setItem('currentStep', currentStep)
    }
    
    // Update step based on progress
    if (licenseValidated) {
      if (currentStep < 2) {
        currentStep = 2
        sessionStorage.setItem('currentStep', currentStep)
        awaitingBusinessLicense = false
        awaitingVehicleInfo = true
        
      }
    }
    if (isLibreValidatd && !isInsValidated) {
      if (currentStep < 3) {
        currentStep = 3
        isLibreValidated=true
        sessionStorage.setItem('currentStep', currentStep)
        awaitingBusinessLicense = false
        awaitingVehicleInfo = false
        awaitingDriverInfo=true
        
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
  } else if (currentIntent === 'generateVideo') {
    // Check IFTMS status from session storage
 
    const user = sessionStorage.getItem('user')
    const upPhotos = sessionStorage.getItem('#photosUp')
    if (!arePhotosUp) {
      awaitingPhotoUpload = true
      currentStep = 1
      sessionStorage.setItem('currentStep', currentStep)
    }
    
    // Update step based on progress
    if (arePhotosUp && !isTitleSet) {
      if (currentStep < 2) {
        currentStep = 2
         upPhotos >= numPhotos
        sessionStorage.setItem('currentStep', currentStep)
        awaitingPhotoUpload = false
        
       
        
      }
    }
    if (!awaitingPhotoUpload && awaitingVideoTheme ) {
      if (currentStep < 3) {
        currentStep = 3
        isTitleSet=true
        awaitingVideoTheme = true
        videoTitle = sessionStorage.getItem('videoTitle')
        chosenTheme=sessionStorage.getItem('chosenTheme')
        sessionStorage.setItem('currentStep', currentStep)
        
        
      }
    }
    if (isTitleSet  ) {
      if (currentStep < 4) {
        currentStep = 4
        
        isTitleSet=true
        sessionStorage.setItem('currentStep', currentStep)
       
       
        
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
// Process step input
export async function processStepInput(intents, step, sentiment, message, language = 'am', isFile = false) {
  // Check if we have responses for this intent
  const lan = language || localStorage.getItem('agig-language') || 'am'
  const serviceIntent = Array.isArray(intents) ? intents[0] : intents
  
  localStorage.setItem('intnt', serviceIntent)
  
  if (!stepResponses[serviceIntent]) {
    return getDefaultResponse(lan)
  }

  const stepResponse = stepResponses[serviceIntent][step]
  if (!intents ||!stepResponse) {
    return getDefaultResponse(lan)
  }

  let response = {
    text: stepResponse[lan] || stepResponse.en,
    actions: stepResponse.actions || [],
    nextStep: null,
    step: step,
    service: serviceIntent
  }
if (serviceIntent==='generateVideo') {
  switch(step) {
    case 1:
      response.nextStep = 2
      break

    case 2:
      response.nextStep = 3
      break

    case 3:
      response.nextStep = 4
      break

    case 4:
      response.nextStep = null
      break
  }
} else {
  // Process based on step
  switch(step) {
    case 1:
      response.nextStep = 2
      break

    case 2:
      response.nextStep = 3
      break

    case 3:
      response.nextStep = 4
      break

    case 4:
      response.nextStep = null
      break
  }
}
  return response
}
// Generate continuation HTML
export function generateContinuationHTML(stepR, currentStep, language) {
  return `
    <div class="chat-messages">
      <div class="message sender">
        <div class="message-content">
          <p>🔄 ${language === 'am' ? 'ከደረጃ '+currentStep+'ቀጠል እያደረግን' : 'Continuing from step'} ${currentStep}...</p>
          <p>${stepR.text}</p>
          <div class="message-actions">
            ${stepR.actions && stepR.actions.length > 0 ? stepR.actions.map(action => 
              `<button class="action-btn" data-step="${stepR.step}" data-next-step="${stepR.nextStep}">
                ${action}
              </button>`
            ).join('') : ''}
            ${stepR.nextStep ? 
              `<button class="action-btn next-btn" data-step="${stepR.step}" data-next-step="${stepR.nextStep}">
                ${language === 'am' ? 'ወደ ቀጣዩ ደረጃ' : 'Next Step'} (${stepR.nextStep})
              </button>` : ''
            }
          </div>
        </div>
        <span class="timestamp">
          ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  `
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
        iSbizValid = true
        
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
// In nlpP.js - Updated extractIntents with priority levels

// Define intent priority levels
const INTENT_PRIORITY = {
  PRIMARY: 1,    // Service intents (iftms, renewDoc, analyzeResearch, etc.)
  SECONDARY: 2,  // Greeting, thanks, help, etc.
  TERTIARY: 3    // Other auxiliary intents
}

// Define intent categories with their priority
const intentCategories = {
  // PRIMARY INTENTS (Service intents - highest priority)
  primary: {
    iftms: ['integrated freight management service', 'የተቀናጀ የጭነት ትራንስፖርት አስተዳደር ስርዓት', 'Ministry of Transport and Logistics', 'ትራንስፖርት እና ሎጂስቲክስ', 'Integrated Freight Transport management system', 'MOTL', 'IFTMS', 'iftms', 'ministry of transport and logistics', 'freight transport registration and renewal'],
    analyzeResearch: ['Analyze a research paper', 'የጥናትና ምርምር', 'analyze a research paper', 'research document analysis', 'academic paper review', 'study paper analysis', 'scientific paper'],
    analyzeLegal: ['analyze legal document', 'review contract', 'legal agreement analysis', 'contract review', 'legal doc'],
    analyzeGovernment: ['verify government document', 'የሰነዶች ማረጋገጫ', 'government id analysis', 'business license check', 'national id verification', 'fayda id analysis', 'renew certificate'],
    analyzeFinancial: ['analyze financial document', 'invoice review', 'receipt analysis', 'bank statement check', 'financial statement'],
    classifyDocument: ['what type of document is this', 'classify this document', 'document classification', 'what kind of document'],
    renewDoc: ['renew driver license', 'update trading license', 'renew business permit', 'renew business license certificate', 'update business license renewal', 'business license cancelation', 'renew trading licence', 'business registration certificate', 'update business license'],
    generateVideo: ['create video clip', 'video ad', 'ቪዲዮ ፍጠር', 'slide show']
  },
  
  // SECONDARY INTENTS (Will not override primary intent)
  secondary: {
    greeting: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'ሰላም', 'እንዴት ነህ', 'እንዴት ነሽ'],
    thanks: ['thank you', 'አመሰግናለሁ', 'thanks', 'appreciate it', 'gracias', 'thank', 'merci'],
    help: ['help', 'what can you do', 'capabilities', 'features', 'እርዳታ', 'ምን ማድረግ ትችላለህ']
  },
  
  // TERTIARY INTENTS (Even lower priority)
  tertiary: {
    summaryRequest: ['summarize', 'give me a summary', 'brief overview', 'main points', 'ማጠቃለያ'],
    keywordRequest: ['keywords', 'key terms', 'important words', 'main topics', 'ቁልፍ ቃላት'],
    structureRequest: ['structure', 'how is this organized', 'document layout', 'sections', 'አወቃቀር']
  }
}

export function extractIntents(doc) {
  const intents = {
    primary: [],
    secondary: [],
    tertiary: [],
    all: []
  }
  
  const text = doc.text().toLowerCase()
  
  // Track if a primary intent is already found
  let primaryIntentFound = null
  
  // Check PRIMARY intents first (highest priority)
  for (const [intent, patterns] of Object.entries(intentCategories.primary)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        intents.primary.push(intent)
        intents.all.push(intent)
        primaryIntentFound = intent
        
        // Update session storage with primary intent
        sessionStorage.setItem('intnt', intent)
        sessionStorage.setItem('currentService', intent)
        
        // Don't reset currentStep if already in a service flow
        const currentStep = sessionStorage.getItem('currentStep')
        if (!currentStep || currentStep === '0' || currentStep === 'null') {
          sessionStorage.setItem('currentStep', '1')
        }
        
        console.log(`🎯 Primary intent detected: ${intent}`)
        break
      }
    }
    if (primaryIntentFound) break
  }
  
  // If no primary intent found, check SECONDARY intents
  if (!primaryIntentFound) {
    for (const [intent, patterns] of Object.entries(intentCategories.secondary)) {
      for (const pattern of patterns) {
        if (text.includes(pattern.toLowerCase())) {
          intents.secondary.push(intent)
          intents.all.push(intent)
          
          // Only update session if no existing service intent
          const existingIntent = sessionStorage.getItem('intnt')
          if (!existingIntent || existingIntent === 'general') {
            sessionStorage.setItem('intnt', intent)
          }
          
          console.log(`💬 Secondary intent detected: ${intent}`)
          break
        }
      }
    }
  }
  
  // If no primary or secondary intent found, check TERTIARY intents
  if (!primaryIntentFound && intents.secondary.length === 0) {
    for (const [intent, patterns] of Object.entries(intentCategories.tertiary)) {
      for (const pattern of patterns) {
        if (text.includes(pattern.toLowerCase())) {
          intents.tertiary.push(intent)
          intents.all.push(intent)
          console.log(`📝 Tertiary intent detected: ${intent}`)
          break
        }
      }
    }
  }
  
  // NLP-based intent extraction for document analysis (only if no primary intent)
  if (!primaryIntentFound) {
    if (doc.has('analyze|review|check|verify|authorize|submit')) {
      if (!intents.all.length) {
        intents.all.push('analyzeDocument')
        console.log('🤖 NLP detected: analyzeDocument')
      }
    }
    if (doc.has('what #Adjective? type of document')) {
      if (!intents.all.includes('classifyDocument')) {
        intents.all.push('classifyDocument')
      }
    }
  }
  
  // Remove duplicates while preserving order
  intents.all = [...new Set(intents.all)]
  
  // Return the primary intent if exists, otherwise the first secondary/tertiary
  const finalPrimaryIntent = intents.primary[0] || 
                             (intents.secondary.length > 0 ? intents.secondary[0] : 
                             (intents.tertiary.length > 0 ? intents.tertiary[0] : 
                             (intents.all[0] || 'general')))
  
  // Store the final intent in session (but don't override existing service intent)
  const existingServiceIntent = sessionStorage.getItem('intnt')
  if (!existingServiceIntent || existingServiceIntent === 'general' || intents.primary.length > 0) {
    sessionStorage.setItem('intnt', finalPrimaryIntent)
    if (intents.primary.length > 0) {
      sessionStorage.setItem('currentService', finalPrimaryIntent)
    }
  }
  
  console.log(`📊 Final intents: primary=${intents.primary}, secondary=${intents.secondary}, tertiary=${intents.tertiary}`)
  console.log(`🏷️ Final selected intent: ${finalPrimaryIntent}`)
  
  return {
    primary: intents.primary,
    secondary: intents.secondary,
    tertiary: intents.tertiary,
    all: intents.all,
    main: finalPrimaryIntent,
    isPrimary: intents.primary.length > 0,
    isSecondary: intents.secondary.length > 0,
    isTertiary: intents.tertiary.length > 0
  }
}

// Helper function to check if a specific intent type is present
export function hasIntentOfType(intents, type) {
  return intents[type] && intents[type].length > 0
}

// Helper function to get primary intent
export function getPrimaryIntent(intents) {
  return intents.primary[0] || null
}

// Helper function to get all intents of a specific category
export function getIntentsByCategory(intents, category) {
  return intents[category] || []
}

// Modified version for backward compatibility (returns array like before)
export function extractIntentsLegacy(doc) {
  const result = extractIntents(doc)
  return result.all
}

// Also update the NLP processing in processMessage to handle the new structure
// In nlx.js or nlpProcessor.js, update the intent handling:

/*
// When calling extractIntents, use the new structure:
const intentResult = extractIntents(doc)

// Then use it like:
if (intentResult.isPrimary) {
  // Handle primary intent
  const primaryIntent = intentResult.main
  // Process primary service
} else if (intentResult.isSecondary) {
  // Handle secondary intent (greeting, thanks, help)
  // This won't interrupt the current service flow
  const secondaryIntent = intentResult.main
  // Respond appropriately but don't change service
} else {
  // Handle general case
}
*/
export function extractIntentxs(doc) {
  const intents = []
  const text = doc.text().toLowerCase()

  // Check against predefined patterns
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    for (const pattern of patterns) {
      if (text.includes(pattern.toLowerCase())) {
        intents.push(intent)
        sessionStorage.setItem('intnt', intent)
        sessionStorage.setItem('currentService', intent)
       // sessionStorage.setItem('currentStep', '1')
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

  if (doc.has('license|permit|freight|')) {
    if (!intents.includes('businessLicenseInput')) {
      intents.push('businessLicenseInput')
    }
  }
  
  if (doc.has('government|license|permit|id|verification')||doc.has('renew|renewal|permit|registration|ብቃት|ማረጋገጫ|bussiness|driving|trading|mining|building|certification|update|license|authorization')) {
    if (!intents.includes('analyzeGovernment')) {
      intents.push('analyzeGovernment')
    }
  }

  if (doc.has('renew|renewal|permit|registration|ብቃት|ማረጋገጫ|bussiness|driving|trading|mining|building|certification|update|license|authorization')) {
    if (!intents.includes('renewDoc')) {
      intents.push('renewDoc')
    }
  }

  if (doc.has('iftms|motl|freight|logistics|transport|ministry of transport') ) {
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
export async function extractDocumentTypes(doc) {
  const types = []
  const text = doc.text().toLowerCase()

  const documentTypeKeywords = {
    research: ['research paper', 'academic paper', 'scientific paper', 'thesis', 'dissertation'],
    iftms: ['iftms','libre', 'insurance', 'gps', 'driver license', 'bolo'],
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
  
  if (intents.includes('generateVideo')) return 'generateVideo'
  if (intents.includes('analyzeResearch')) return 'researchAnalysis'
  if (intents.includes('analyzeLegal')) return 'legalAnalysis'
  if (intents.includes('analyzeGovernment')) return 'governmentAnalysis'
  if (intents.includes('analyzeFinancial')) return 'financialAnalysis'
  if (intents.includes('classifyDocument')) return 'classification'
  if (intents.includes('renewDoc')) return 'renewDoc'
  if (intents.includes('iftms')) return 'iftms'
   if ((intents.includes('iftms')) && (intents.includes('status'))) return 'iftmsStatus'
  if ((intents.includes('iftmsk')) && (intents.includes('businessLicenseInput'))) return 'iftmsbusinessLicenseInput'
  
  return 'general'
}

// Generate contextual response
export async function generateContextualResponse(nlpResult, documentAnalysis = null) {
  const { intents, currentStep, sentiment, processedText, awaitingInput, entities, responseType, customResponse } = nlpResult
  
  // If we have a custom response (e.g., from IFTMS), use it
  if (customResponse) {
    return customResponse
  }
  
  sessionStorage.setItem('currentService', currentIntent || intents[0])
  const language = localStorage.getItem('agig-language') || 'en'
  let response = ''

  // YOUR FUCKING ORIGINAL LOGIC: Check if we have search summary for unclear intents
  if (responseType && (intents.length === 0 || intents.includes('general'))) {
    return generateSearchBasedResponse(responseType, processedText, language)
  }

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
      case 'iftmsStatus':
      response = getStatusResponse()
      break
    case 'researchAnalysis':
      response = "I'd be happy to analyze research papers! Please upload a PDF research document, and I'll extract key information about the methodology, findings, conclusions, and research instruments."
      break
    case 'renewDoc':
      response = "I'd be happy to renew your document permit! Please upload your previous PDF business license, your fyda id and all other supporting documents you have."
      break
    case 'iftms':
      const iftmsResponse = await getIftmsResponse(intents, currentStep || 1, sentiment, processedText, awaitingInput, language, false)
      return iftmsResponse
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
        am: "ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት እንኳን በደህና መጡ! የንግድ ፈቃድዎን በማረጋገጥ እንጀምር። እባክዎ የንግድ ፈቃድ ቁጥርዎን በምሳሌው መሰረት (ምሳሌ: 14/668/5068/2004) ያስገቡ ወይም የንግድ ፈቃድ ሰርተፊኬትዎን ይስቀሉ።",
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
     generateVideo: {
      1: {
        en: "wellcome to AGI video generator please upload a few photos to begin with",
        am: "እባክዎ ወደ ቪዲዮ ስላይድ መቀየር የሚፈልጓችውን ምስሎች ይጫኑ",
        actions: ['Upload photos']
      },
      2: {
        en: "Great! photos recieved. Now let's set a title for your video . Please upload vehicle registration documents or provide vehicle details.",
        am: "ጥሩ! ምስሎች ደርሰውኛል። አሁን የቪዲዮ ርእስ እንስጥ። እባክዎ የቪዲዮ ርዕስ ይላኩ።",
        actions: ['choose title']
      },
      3: {
        en: "Vehicle information recorded. Now we need driver information. Please upload driver's license and national ID.",
        am: "የተሽከርካሪ መረጃ ተመዝግቧል። አሁን የሹፌር መረጃ ያስፈልገናል። እባክዎ የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነዶ ይስቀሉ።",
        actions: ['choose theme', 'Complete']
      },
      4: {
        en: "All information verified! Your freight transport license has been approved for 1 year. Download your license certificate below.",
        am: "ሁሉም መረጃዎች ተረጋግጠዋል! የጭነት መጓጓዣ ፈቃድዎ ለ1 ዓመት ተሰጥቷል። የፈቃድ ሰርተፊኬትዎን ከዚህ በታች ያውርዱ።",
        actions: ['Download video', 'create New video']
      }
    },
    renewDoc: {
      1: {
        en: "Welcome to Business License Renewal service! Let's start by verifying your existing license. Please enter your current business license number or upload your license certificate.",
        am: "ወደ የንግድ ፈቃድ እድሳት አገልግሎት እንኳን በደህና መጡ! ያለዎትን ፈቃድ በማረጋገጥ እንጀምር። እባክዎ የአሁኑ የንግድ ፈቃድ ቁጥርዎን ያስገቡ ወይም የፈቃድ �ሰርተፊኬትዎን ይስቀሉ።",
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
        am: "ክፍያ ተረጋግጧል! የንግድ ፈቃድዎ በተሳካ ሁኔታ ዘምኗል። አዲሱን የፈቃድ ሰርተፊኬትዎን ያውርዱ።",
        actions: ['Download New License', 'Print Certificate']
      }
    }
  }
}
export function setupStepResponsesx() {
  stepResponses = {
    iftms: {
      1: {
        en: "Welcome to Integrated Freight Transport Management System! Let's start by verifying your business license. Please enter your business license number (format: 14/668/5068/2004) or upload your business license certificate.",
        am: "ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት እንኳን በደህና መጡ! የንግድ ፈቃድዎን በማረጋገጥ እንጀምር። እባክዎ የንግድ ፈቃድ ቁጥርዎን በምሳሌው መሰረት (ምሳሌ: 14/668/5068/2004) ያስገቡ ወይም የንግድ ፈቃድ ሰርተፊኬትዎን ይስቀሉ።",
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
        actions: ['Upload Trailer Documents', 'Complete']
      },
      4: {
        en: "Vehicle information recorded. Now we need driver information. Please upload driver's license and national ID.",
        am: "የተሽከርካሪ መረጃ ተመዝግቧል። አሁን የሹፌር መረጃ ያስፈልገናል። እባክዎ የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነዶ ይስቀሉ።",
        actions: ['Upload Driver Documents', 'Complete']
      },
      5: {
        en: "All information verified! Your freight transport license has been approved for 1 year. Download your license certificate below.",
        am: "ሁሉም መረጃዎች ተረጋግጠዋል! የጭነት መጓጓዣ ፈቃድዎ ለ1 ዓመት ተሰጥቷል። የፈቃድ ሰርተፊኬትዎን ከዚህ በታች ያውርዱ።",
        actions: ['Download License', 'Start New Application']
      }
    },
     generateVideo: {
      1: {
        en: "wellcome to AGI video generator please upload a few photos to begin with",
        am: "እባክዎ ወደ ቪዲዮ ስላይድ መቀየር የሚፈልጓችውን ምስሎች ይጫኑ",
        actions: ['Upload photos']
      },
      2: {
        en: "Great! photos recieved. Now let's set a title for your video . Please upload vehicle registration documents or provide vehicle details.",
        am: "ጥሩ! ምስሎች ደርሰውኛል። አሁን የቪዲዮ ርእስ እንስጥ። እባክዎ የቪዲዮ ርዕስ ይላኩ።",
        actions: ['choose title']
      },
      3: {
        en: "Vehicle information recorded. Now we need driver information. Please upload driver's license and national ID.",
        am: "የተሽከርካሪ መረጃ ተመዝግቧል። አሁን የሹፌር መረጃ ያስፈልገናል። እባክዎ የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነዶ ይስቀሉ።",
        actions: ['choose theme', 'Complete']
      },
      4: {
        en: "All information verified! Your freight transport license has been approved for 1 year. Download your license certificate below.",
        am: "ሁሉም መረጃዎች ተረጋግጠዋል! የጭነት መጓጓዣ ፈቃድዎ ለ1 ዓመት ተሰጥቷል። የፈቃድ ሰርተፊኬትዎን ከዚህ በታች ያውርዱ።",
        actions: ['Download video', 'create New video']
      }
    },
    renewDoc: {
      1: {
        en: "Welcome to Business License Renewal service! Let's start by verifying your existing license. Please enter your current business license number or upload your license certificate.",
        am: "ወደ የንግድ ፈቃድ እድሳት አገልግሎት እንኳን በደህና መጡ! ያለዎትን ፈቃድ በማረጋገጥ እንጀምር። እባክዎ የአሁኑ የንግድ ፈቃድ ቁጥርዎን ያስገቡ ወይም የፈቃድ �ሰርተፊኬትዎን ይስቀሉ።",
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
        am: "ክፍያ ተረጋግጧል! የንግድ ፈቃድዎ በተሳካ ሁኔታ ዘምኗል። አዲሱን የፈቃድ ሰርተፊኬትዎን ያውርዱ።",
        actions: ['Download New License', 'Print Certificate']
      }
    }
  }
}

export async function generateVideo(params) {
 // const stepV = await processStepInput('generateVideo', step, sentiment, message, language, isFile)
}

// Get IFTMS response
export async function getIftmsResponse(intents, step, sentiment, message, language = 'en', isFile = false) {
  const stepR = await processStepInput(intents, step, sentiment, message, language, isFile)
  
  // Store response data for future reference
  localStorage.setItem('spr', JSON.stringify(stepR))
  
  // Build response HTML
  const responseHTML = `
    <div class="chat-messages">
      <div class="message sender">
        <div class="message-content">
          <p>${stepR['text']}</p>
          <div class="message-actions">
            ${stepR.actions && stepR.actions.length > 0 ? stepR.actions.map(action => 
              `<button class="action-btn" data-step="${stepR.step}" data-next-step="${stepR.nextStep}">
                ${action}
              </button>`
            ).join('') : ''}
            ${stepR.nextStep ? 
              `<button class="action-btn next-btn" data-step="${stepR.step}" data-next-step="${stepR.nextStep}">
                ${language === 'am' ? 'ወደ ቀጣዩ ደረጃ' : 'Next Step'} (${stepR.nextStep})
              </button>` : ''
            }
          </div>
        </div>
        <span class="timestamp">
          ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    </div>
  `
  
  return responseHTML
}

// Helper function to get default response
function getDefaultResponse(language) {
  return {
    text: language === 'am' 
      ? 'እባክዎ የሚፈልጉትን አገልግሎት ይፅፉ።'
      : 'Please specify which service you need.',
    actions: [],
    nextStep: null,
    step: 0,
    service: 'general'
  }
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
// Get thanks response
export function getStatusResponse(service) {
  const thanks = [
    "Your +'`${service}`'+ is ${awaiting} aproval from ${org}. 😊",
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
 
  const licenseRegex = /\b\d{2}\/\d{3,4}\/\d{4}\/\d{4}\b/
 
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
  isActionButtonText,
  processMessage,
  validateNationalIdDetailed,
  validateVinCheckDigit,
  isVehicleChassisNumber,
  processStepInput,
  generateContinuationHTML,
  isResumeButton,
  isContinuationMessage,
  //setupIntentPatterns,
  handleActionButton,
  handleBusinessLicenseInput,
  extractIntents,
  extractEntities,
  extractLicenseNumber,
  extractTextFromPDF,
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