
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



Potential Issues with Tesseract + Regex:
1. Text Recognition Errors
Tesseract might misread characters:

የሰሌዳ → የሰሌዳ (correct) or የሰሌዳ (wrong)

ቁጥር → ቁጥር or ቁጠር or ቁጥር

2. Spacing Inconsistencies
OCR often adds/removes spaces:

የሰሌዳ ቁጥር → የሰሌዳቁጥር (no space)

plate number → platenumber or plate number (extra space)

3. Line Break Confusion
Tesseract might not preserve logical line structure

OCR-Optimized Regex Patterns:
javascript
const patterns = {
    plateNumber: [
        // More tolerant Amharic patterns
        /(?:የ[ሰሠ][ሌል][ዳድ]?[ሀሃ]?\s*ቁ[ጥጠ][ርረ]|plate\s*number|licen[sc]e\s*plate)[\s:;-]*([^\n]{3,20})/i,
        // Fallback: Look for common plate patterns
        /([A-Za-z0-9]{2,4}[-_\\s]?[A-Za-z0-9]{2,4}[-_\\s]?[A-Za-z0-9]{2,6})/
    ],
    
    chassisNumber: [
        /(?:ሻ[ሺሼ]|chassis)[^:\n]{0,30}?([A-HJ-NPR-Z0-9]{10,17})/i,
        /(?:VIN|vin)[^:\n]*([A-HJ-NPR-Z0-9]{10,17})/i
    ],
    
    motorNumber: [
        /(?:ሞ[ተታ][ርረ]|motor|engine)[^:\n]{0,20}([A-Z0-9]{5,15})/i
    ],
    
    vehicleModel: [
        /(?:ሞ[ደዳ][ልለ]|model)[^:\n]{0,15}([A-Za-z0-9]{3,15})/i,
        /(?:BJ|Toyota|Mitsubishi|Nissan|Hyundai)(?:\s*[A-Za-z0-9]{2,10})/i
    ],
    
    manufacturer: [
        /(?:ሀ[ገጌ][ርረ]|country|manufacturer)[^:\n]{0,15}([A-Za-z]{3,15})/i,
        /(?:China|Japan|Germany|USA|Korea|India)\b/i
    ],
    
    manufactureYear: [
        /(?:ዘ[መማ][ንነ]|year)[^:\n]{0,10}((?:19|20)\d{2})/i,
        /\b(19|20)\d{2}\b/
    ],
    
    ownerName: [
        /(?:ስ[ምሙ]|name)[^:\n]{0,10}([A-Za-z\u1200-\u137F\s]{3,30})/i
    ],
    
    color: [
        /(?:ቀ[ለላ][ምሙ]|color)[^:\n]{0,10}([A-Za-z\u1200-\u137F]{3,10})/i,
        /(?:white|black|red|blue|green|silver|gray)\b/i
    ],
    
    fuelType: [
        /(?:ነ[ዳድ][ጅጂ]|fuel)[^:\n]{0,10}([A-Za-z\u1200-\u137F]{3,10})/i,
        /(?:diesel|petrol|gasoline|electric)\b/i
    ]
};
Enhanced Extraction Function for OCR:
javascript
extractVehicleData(text) {
    const vehicleData = {};
    
    // Pre-process text for common OCR errors
    const cleanedText = this.preprocessOCRText(text);
    
    for (const [key, patternArray] of Object.entries(patterns)) {
        let value = null;
        
        const patternsToTry = Array.isArray(patternArray) ? patternArray : [patternArray];
        
        for (const pattern of patternsToTry) {
            const match = cleanedText.match(pattern);
            if (match && match[1]) {
                value = this.cleanOCRValue(match[1]);
                if (this.isValidValue(key, value)) {
                    break;
                }
            }
        }
        
        if (value) {
            vehicleData[key] = value;
        }
    }
    
    return vehicleData;
}

preprocessOCRText(text) {
    return text
        // Fix common OCR errors in Amharic
        .replace(/[ሠሰ]/g, 'ሰ')
        .replace(/[ረር]/g, 'ር')
        .replace(/[ለላ]/g, 'ለ')
        // Fix spacing issues
        .replace(/([a-zA-Z])([ሀ-ፕ])/g, '$1 $2')
        .replace(/([ሀ-ፕ])([a-zA-Z])/g, '$1 $2')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

cleanOCRValue(value) {
    return value
        .replace(/^[^a-zA-Z0-9\u1200-\u137F]+/, '') // Remove leading junk
        .replace(/[^a-zA-Z0-9\u1200-\u137F\s-]+$/, '') // Remove trailing junk
        .replace(/\s+/g, ' ')
        .trim();
}

isValidValue(field, value) {
    const validators = {
        plateNumber: (v) => v.length >= 3 && v.length <= 20,
        chassisNumber: (v) => v.length >= 10 && /^[A-HJ-NPR-Z0-9]+$/.test(v),
        manufactureYear: (v) => /^(19|20)\d{2}$/.test(v),
        motorNumber: (v) => v.length >= 5,
        // Add more validators as needed
    };
    
    return validators[field] ? validators[field](value) : true;
}
Testing Strategy:
javascript
// Test with various OCR outputs
const testOCROutputs = [
    "የሰሌዳቁጥር ኢት-03-A28940", // No space (common OCR error)
    "የሰሌዳ ቁጥር ኢት-03-A28940", // Correct spacing
    "plate number: ET-03-A28940", // English
    "የሰሌዳ ቁጥር: ET-03-A28940" // With colon
];

testOCROutputs.forEach(text => {
    const result = patterns.plateNumber[0].exec(text);
    console.log(`Input: "${text}" → Output:`, result ? result[1] : 'No match');
});
Recommendation:
Start with simpler patterns and gradually make them more complex

Test with real OCR outputs from your documents

Use multiple fallback patterns for each field

Add post-processing validation to filter out bad matches

Consider training Tesseract on your specific document types for better accuracy

The patterns should work reasonably well, but expect to need adjustments based on the actual OCR quality you get from your documents.

