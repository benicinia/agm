// Direct RASA client for your Preact app
export class RasaClient {
  constructor(baseURL = 'http://localhost:5005') {
    this.baseURL = baseURL;
    this.sessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.conversationId = null;
  }

  // Initialize connection
  async init() {
    try {
      // Check if RASA is running
      const health = await fetch(`${this.baseURL}/`);
      if (!health.ok) {
        console.warn('RASA server not reachable, falling back to local processing');
        return false;
      }
      
      // Create conversation ID
      this.conversationId = `conversation_${Date.now()}`;
      
      // Sync session storage with RASA
      await this.syncSession();
      
      console.log('🤖 RASA client initialized successfully');
      return true;
    } catch (error) {
      console.warn('RASA unavailable, using fallback mode:', error.message);
      return false;
    }
  }

  // Main message processing (replaces nlpProcessor.processMessage)
  async processMessage(message, isFile = false, isImg = false) {
    const sessionData = this.getSessionData();
    
    try {
      const response = await fetch(`${this.baseURL}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: this.sessionId,
          message: message,
          metadata: {
            isFile,
            isImg,
            sessionData,
            language: localStorage.getItem('agig-language') || 'en',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      
      // Process RASA response
      const processedResponse = this.processRasaResponse(data, message);
      
      // Update session storage based on response
      this.updateSessionFromResponse(processedResponse);
      
      return processedResponse;
      
    } catch (error) {
      console.error('RASA API error:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Process file uploads
  async processFileUpload(file, documentType, step) {
    try {
      // For files, we'll send metadata to RASA and process file locally
      const message = `Uploaded ${documentType}: ${file.name}`;
      
      const response = await this.processMessage(message, true, file.type.startsWith('image/'));
      
      // Simulate file processing (in real app, you'd send file to server)
      const fileInfo = {
        name: file.name,
        type: file.type,
        size: file.size,
        documentType,
        step,
        processed: true
      };
      
      // Update session storage for file upload
      const uploadedFiles = JSON.parse(sessionStorage.getItem('uploadedFiles') || '[]');
      uploadedFiles.push(fileInfo);
      sessionStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
      
      // Update validation flags based on file type
      if (documentType === 'Business License') {
        sessionStorage.setItem('licenseValidated', 'true');
      } else if (documentType === 'Vehicle Document') {
        sessionStorage.setItem('isLibreValidated', 'true');
      } else if (documentType === 'Driver Document') {
        sessionStorage.setItem('isDriverValidated', 'true');
      }
      
      return {
        ...response,
        fileInfo,
        requiresNextStep: true
      };
      
    } catch (error) {
      console.error('File processing error:', error);
      return this.getFallbackResponse(`File upload: ${file.name}`);
    }
  }

  // Sync session with RASA
  async syncSession() {
    const sessionData = this.getSessionData();
    
    try {
      await fetch(`${this.baseURL}/conversations/${this.sessionId}/tracker/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'session_started',
          timestamp: new Date().toISOString(),
          metadata: { sessionData }
        })
      });
    } catch (error) {
      console.warn('Session sync failed:', error.message);
    }
  }

  // Helper methods
  getSessionData() {
    return {
      currentStep: sessionStorage.getItem('currentStep') || '0',
      currentService: sessionStorage.getItem('currentService') || 'general',
      licenseValidated: sessionStorage.getItem('licenseValidated') === 'true',
      isLibreValidated: sessionStorage.getItem('isLibreValidated') === 'true',
      isDriverValidated: sessionStorage.getItem('isDriverValidated') === 'true',
      isInsValidated: sessionStorage.getItem('isInsValidated') === 'true',
      awaitingBusinessLicense: sessionStorage.getItem('awaitingBusinessLicense') === 'true',
      awaitingVehicleInfo: sessionStorage.getItem('awaitingVehicleInfo') === 'true',
      awaitingDriverInfo: sessionStorage.getItem('awaitingDriverInfo') === 'true',
      uploadedFiles: JSON.parse(sessionStorage.getItem('uploadedFiles') || '[]'),
      userLanguage: localStorage.getItem('agig-language') || 'en'
    };
  }

  updateSessionFromResponse(response) {
    if (response.sessionData) {
      Object.entries(response.sessionData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          sessionStorage.setItem(key, value.toString());
        } else if (typeof value === 'object') {
          sessionStorage.setItem(key, JSON.stringify(value));
        } else {
          sessionStorage.setItem(key, value);
        }
      });
    }
  }

  processRasaResponse(rasaResponses, originalMessage) {
    const rasaResponse = rasaResponses[0] || {};
    
    // Check for custom JSON message
    if (rasaResponse.json_message) {
      return {
        text: rasaResponse.json_message.text || rasaResponse.text,
        html: rasaResponse.json_message.html || `<div class="message-content"><p>${rasaResponse.text}</p></div>`,
        isStructured: rasaResponse.json_message.isStructured || false,
        responseType: rasaResponse.json_message.responseType || 'general',
        sessionData: rasaResponse.json_message.sessionData,
        buttons: rasaResponse.json_message.buttons,
        requiresUpload: rasaResponse.json_message.requiresUpload,
        timestamp: new Date().toISOString()
      };
    }
    
    // Check for buttons in response
    let buttons = [];
    if (rasaResponse.buttons && Array.isArray(rasaResponse.buttons)) {
      buttons = rasaResponse.buttons;
    }
    
    // Generate HTML with buttons if available
    let html = `<div class="message-content"><p>${rasaResponse.text || '...'}</p>`;
    if (buttons.length > 0) {
      html += `<div class="action-buttons">`;
      buttons.forEach(btn => {
        html += `<button class="action-btn" data-action="${btn.title}" data-payload="${btn.payload}">${btn.title}</button>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
    
    return {
      text: rasaResponse.text || '...',
      html,
      isStructured: buttons.length > 0,
      responseType: this.determineResponseType(originalMessage),
      timestamp: new Date().toISOString()
    };
  }

  determineResponseType(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('iftms')) return 'iftms';
    if (lowerMsg.includes('upload')) return 'upload';
    if (lowerMsg.includes('license')) return 'license';
    return 'general';
  }

  getFallbackResponse(message) {
    // Simple fallback logic when RASA is down
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return {
        text: "Hello! I'm your AGIG assistant. (Fallback Mode)",
        html: `<div class="message-content"><p>Hello! I'm your AGIG assistant. (Fallback Mode)</p></div>`,
        isStructured: false,
        responseType: 'greeting'
      };
    }
    
    if (lowerMsg.includes('iftms')) {
      return {
        text: "IFTMS Service: Please upload your business license to start.",
        html: `
          <div class="message-content">
            <p>IFTMS Service: Please upload your business license to start.</p>
            <div class="action-buttons">
              <button class="action-btn" data-action="Upload Business License">Upload Business License</button>
              <button class="action-btn" data-action="Enter License Manually">Enter License Manually</button>
            </div>
          </div>
        `,
        isStructured: true,
        responseType: 'iftms'
      };
    }
    
    return {
      text: "I'm currently in fallback mode. Please check if the RASA server is running.",
      html: `<div class="message-content"><p>I'm currently in fallback mode. Please check if the RASA server is running.</p></div>`,
      isStructured: false,
      responseType: 'error'
    };
  }
}

// Create singleton instance
export const rasaClient = new RasaClient();