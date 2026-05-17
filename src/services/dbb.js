// In nlpProcessor.js, modify the chat function and processMessage logic:

export async function chat(msg, file) {
  // Process file based on service
  if (file) {
    // ... existing file handling code ...
  } else if (msg) {
    // Check if it's a business license number
    if (isBusinessLicenseNumber(msg)) {
      // Auto-advance to next step
      const currentStep = parseInt(sessionStorage.getItem('currentStep')) || 1
      const nextStep = currentStep + 1
      
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
      
      // Send continuation message to processMessage
      return await processMessage(`continue to step ${nextStep}`, null, false, false)
    }
    // Regular message processing
    else {
      return await processMessage(msg, null, false, false)
    }
  }
}

// Update processMessage to handle step advancement
export async function processMessage(message, text, isFile, isImg) {
  // ... existing code ...
  
  // Check for continuation message (including auto-advance)
  if (isContinuationMessage(message) || message.includes('continue to step')) {
    console.log('🔄 CONTINUATION MESSAGE DETECTED:', message)
    
    // Extract step number from message
    let stepNumber
    const stepMatch = message.match(/step\s*(\d+)/i)
    if (stepMatch) {
      stepNumber = parseInt(stepMatch[1])
    } else {
      // If no step number in message, get from session storage
      stepNumber = parseInt(sessionStorage.getItem('currentStep')) || 1
    }
    
    // Update current step
    currentStep = stepNumber
    sessionStorage.setItem('currentStep', stepNumber.toString())
    
    // Get the current service
    const currentService = sessionStorage.getItem('intnt') || 'iftms'
    
    // Generate response for that step
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
  
  // Check for action button BEFORE license/chassis validation
  if (isActionButtonText(message)) {
    console.log('🔘 ACTION BUTTON DETECTED:', message)
    return handleActionButton(message)
  }
  
  // Check for resume button
  if (isResumeButton(message)) {
    console.log('▶️ RESUME BUTTON DETECTED:', message)
    return {
      text: "Continuing from where we left off...",
      html: `<div class="continue-message">Continuing from where we left off...</div>`,
      isStructured: false,
      responseType: 'continue'
    }
  }
  
  // Business license validation - auto-advance
  if (isBusinessLicenseNumber(message)) {
    awaitingBusinessLicense = false
    iSbizValid = true
    sessionStorage.setItem('licenseValidated', 'true')
    
    // Get current step and advance
    const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
    const nextStep = currentStepVal + 1
    sessionStorage.setItem('currentStep', nextStep.toString())
    
    // Return response for next step
    const currentService = sessionStorage.getItem('intnt') || 'iftms'
    const stepR = await processStepInput([currentService], nextStep, 'neutral', '', 
                  localStorage.getItem('agig-language') || 'en', false)
    
    return {
      text: stepR.text,
      html: generateContinuationHTML(stepR, nextStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true,
      responseType: 'auto_advance'
    }
  }
  
  // Vehicle chassis validation - auto-advance
  if (isVehicleChassisNumber(message)) {
    awaitingVehicleInfo = false
    isLibreValidated = true
    sessionStorage.setItem('isLibreValidated', 'true')
    
    // Get current step and advance
    const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
    const nextStep = currentStepVal + 1
    sessionStorage.setItem('currentStep', nextStep.toString())
    
    // Return response for next step
    const currentService = sessionStorage.getItem('intnt') || 'iftms'
    const stepR = await processStepInput([currentService], nextStep, 'neutral', '', 
                  localStorage.getItem('agig-language') || 'en', false)
    
    return {
      text: stepR.text,
      html: generateContinuationHTML(stepR, nextStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true,
      responseType: 'auto_advance'
    }
  }
  
  // ... rest of your existing processMessage code ...
}