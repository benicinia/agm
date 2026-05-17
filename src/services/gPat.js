
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
