// client/src/services/nlpProcessor.js
class NLPProcessor {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
    this.sessionId = this.getOrCreateSessionId();
    this.currentService = null;
    this.currentStep = 1;
    this.flowState = {};
    this.listeners = [];
    
    // Initialize
    this.init();
  }

  init() {
    console.log('🔄 Initializing NLP Processor...');
    this.loadSession();
    console.log('✅ NLP Processor initialized');
  }

  // ========== SESSION MANAGEMENT ==========

  getOrCreateSessionId() {
    let sessionId = localStorage.getItem('nlp_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('nlp_session_id', sessionId);
    }
    return sessionId;
  }

  loadSession() {
    const savedSession = localStorage.getItem('nlp_session_state');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        this.currentService = session.currentService;
        this.currentStep = session.currentStep || 1;
        this.flowState = session.flowState || {};
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    }
  }

  saveSession() {
    const session = {
      currentService: this.currentService,
      currentStep: this.currentStep,
      flowState: this.flowState,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('nlp_session_state', JSON.stringify(session));
  }

  clearSession() {
    localStorage.removeItem('nlp_session_state');
    this.currentService = null;
    this.currentStep = 1;
    this.flowState = {};
    this.notifyListeners();
  }

  // ========== EVENT LISTENERS ==========

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners() {
    const state = {
      currentService: this.currentService,
      currentStep: this.currentStep,
      flowState: this.flowState
    };
    this.listeners.forEach(callback => callback(state));
  }

  // ========== API METHODS ==========

  async sendMessage(message, language = 'en') {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/message`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message,
          sessionId: this.sessionId,
          language
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state from server
        this.updateFromServer(data.session);
        this.saveSession();
      }

      return data;

    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  async sendDocument(documentText, fileName, documentType = null, extractedData = null) {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/document`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          documentText,
          fileName,
          documentType,
          extractedData,
          sessionId: this.sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.updateFromServer(data.session);
        this.saveSession();
      }

      return data;

    } catch (error) {
      console.error('Send document error:', error);
      throw error;
    }
  }

  async handleAction(action, service = null, step = null, nextStep = null) {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          action,
          service: service || this.currentService,
          step: step || this.currentStep,
          nextStep,
          sessionId: this.sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.updateFromServer(data.session);
        this.saveSession();
      }

      return data;

    } catch (error) {
      console.error('Handle action error:', error);
      throw error;
    }
  }

  async submitBusinessLicense(licenseNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/business-license`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          licenseNumber,
          sessionId: this.sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.updateFromServer(data.session);
        this.saveSession();
      }

      return data;

    } catch (error) {
      console.error('Submit license error:', error);
      throw error;
    }
  }

  async resetFlow() {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/reset`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          sessionId: this.sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        this.clearSession();
      }

      return data;

    } catch (error) {
      console.error('Reset flow error:', error);
      throw error;
    }
  }

  async getSession() {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/session/${this.sessionId}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        this.updateFromServer(data.session);
        this.saveSession();
      }

      return data;

    } catch (error) {
      console.error('Get session error:', error);
      throw error;
    }
  }

  async clearServerSession() {
    try {
      const response = await fetch(`${this.baseUrl}/nlp/session/${this.sessionId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        this.clearSession();
      }

      return data;

    } catch (error) {
      console.error('Clear session error:', error);
      throw error;
    }
  }

  // ========== UTILITY METHODS ==========

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  updateFromServer(session) {
    if (session) {
      this.currentService = session.currentService;
      this.currentStep = session.currentStep || 1;
      this.flowState = session.flowState || {};
      this.notifyListeners();
    }
  }

  // ========== INTENT DETECTION (CLIENT-SIDE FALLBACK) ==========

  detectIntent(message) {
    const lower = message.toLowerCase();
    
    // Service intents
    if (lower.includes('iftms') || lower.includes('freight') || lower.includes('transport')) {
      return 'iftms';
    }
    if (lower.includes('renew') || lower.includes('የንግድ ፈቃድ')) {
      return 'renewDoc';
    }
    if (lower.includes('research') || lower.includes('paper')) {
      return 'analyzeResearch';
    }
    if (lower.includes('legal') || lower.includes('contract')) {
      return 'analyzeLegal';
    }
    if (lower.includes('government') || lower.includes('fayda')) {
      return 'analyzeGovernment';
    }
    if (lower.includes('financial') || lower.includes('invoice')) {
      return 'analyzeFinancial';
    }
    
    // General intents
    if (lower.match(/^(hi|hello|hey|good morning|good afternoon)/)) {
      return 'greeting';
    }
    if (lower.includes('thank')) {
      return 'thanks';
    }
    if (lower.includes('help') || lower.includes('what can you do')) {
      return 'help';
    }
    
    return 'general';
  }

  // ========== LICENSE FORMAT VALIDATION ==========

  isValidLicenseFormat(licenseNumber) {
    const licenseRegex = /^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/;
    return licenseRegex.test(licenseNumber);
  }

  formatLicenseNumber(licenseNumber) {
    return licenseNumber.replace(/[^\d\/]/g, '');
  }

  extractLicenseNumber(text) {
    const licensePatterns = [
      /\b\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}\b/,
      /\bBL\d{8,12}\b/i,
      /\d{8,12}\b/i,
    ];
    
    for (const pattern of licensePatterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    
    return null;
  }

  // ========== RESPONSE PARSING ==========

  parseResponses(responses) {
    if (!responses || !Array.isArray(responses)) {
      return [];
    }

    return responses.map(response => {
      switch (response.type) {
        case 'text':
          return this.parseTextResponse(response);
        case 'action':
          return this.parseActionResponse(response);
        case 'buttons':
          return this.parseButtonsResponse(response);
        case 'quick_replies':
          return this.parseQuickRepliesResponse(response);
        case 'image':
          return this.parseImageResponse(response);
        case 'custom':
          return this.parseCustomResponse(response);
        default:
          return response;
      }
    });
  }

  parseTextResponse(response) {
    return {
      type: 'text',
      content: response.text,
      timestamp: response.timestamp
    };
  }

  parseActionResponse(response) {
    return {
      type: 'action',
      content: response.text,
      actions: response.actions || [],
      service: response.service,
      step: response.step,
      nextStep: response.nextStep,
      timestamp: response.timestamp,
      html: this.generateActionHTML(response)
    };
  }

  parseButtonsResponse(response) {
    return {
      type: 'buttons',
      content: response.text,
      buttons: response.buttons.map(btn => ({
        title: btn.title,
        payload: btn.payload
      })),
      timestamp: response.timestamp
    };
  }

  parseQuickRepliesResponse(response) {
    return {
      type: 'quick_replies',
      content: response.text,
      replies: response.replies.map(reply => ({
        title: reply.title,
        payload: reply.payload
      })),
      timestamp: response.timestamp
    };
  }

  parseImageResponse(response) {
    return {
      type: 'image',
      image: response.image,
      timestamp: response.timestamp
    };
  }

  parseCustomResponse(response) {
    return {
      type: 'custom',
      data: response.data,
      timestamp: response.timestamp
    };
  }

  generateActionHTML(response) {
    const language = localStorage.getItem('agig-language') || 'en';
    
    return `
      <div class="message-content action-response" 
           data-service="${response.service}" 
           data-step="${response.step}" 
           data-next-step="${response.nextStep}">
        <div class="action-text">
          <p>${response.text}</p>
        </div>
        ${response.actions && response.actions.length > 0 ? `
        <div class="action-buttons">
          ${response.actions.map(action => `
            <button class="action-btn" 
                    data-action="${action}" 
                    data-service="${response.service}" 
                    data-step="${response.step}"
                    data-next-step="${response.nextStep}">
              ${action}
            </button>
          `).join('')}
        </div>
        ` : ''}
        ${response.nextStep ? `
        <div class="next-step">
          <button class="next-btn" 
                  data-step="${response.step}" 
                  data-next-step="${response.nextStep}">
            ${language === 'am' ? 'ወደ ቀጣዩ ደረጃ' : 'Next Step'} (${response.nextStep})
          </button>
        </div>
        ` : ''}
      </div>
    `;
  }

  // ========== STEP RESPONSES (FALLBACK) ==========

  getStepResponse(service, step, language = 'en') {
    const stepResponses = {
      iftms: {
        1: {
          en: "Welcome to Integrated Freight Transport Management System! Let's start by verifying your business license. Please enter your business license number (format: 14/668/5068/2004) or upload your business license certificate.",
          am: "ወደ የተቀናጀ ጭነት የትራንስፖርት ማኔጅመንት ስርዓት እንኳን በደህና መጡ! የንግድ ፈቃድዎን በማረጋገጥ እንጀምር።",
          actions: ['Upload Business License', 'Enter License Manually']
        },
        2: {
          en: "Great! Business license verified. Now let's add your freight vehicle information. Please upload vehicle registration documents.",
          am: "ጥሩ! የንግድ ፈቃድ ተረጋግጧል። አሁን የጭነት ተሽከርካሪዎን መረጃ እንጨምር።",
          actions: ['Upload Vehicle Documents', 'Add Another Vehicle']
        },
        3: {
          en: "Vehicle information recorded. Now we need driver information. Please upload driver's license.",
          am: "የተሽከርካሪ መረጃ ተመዝግቧል። አሁን የሹፌር መረጃ ያስፈልገናል።",
          actions: ['Upload Driver Documents', 'Complete']
        },
        4: {
          en: "All information verified! Your freight transport license has been approved. Download your license certificate below.",
          am: "ሁሉም መረጃዎች ተረጋግጠዋል! የጭነት መጓጓዣ ፈቃድዎ ተሰጥቷል።",
          actions: ['Download License', 'Start New Application']
        }
      },
      renewDoc: {
        1: {
          en: "Welcome to Business License Renewal service! Please enter your license number.",
          am: "ወደ የንግድ ፈቃድ እድሳት አገልግሎት እንኳን በደህና መጡ!",
          actions: ['Upload License', 'Enter License Number']
        },
        2: {
          en: "License verified. Please upload your tax clearance certificate.",
          am: "ፈቃድ ተረጋግጧል። እባክዎ የታክስ ማጽዳት ሰርተፊኬትዎን ይስቀሉ።",
          actions: ['Upload Tax Certificate', 'Upload Other Documents']
        },
        3: {
          en: "Documents received. Please make the payment of 5,000 ETB.",
          am: "ሰነዶች ተቀብለዋል። እባክዎ 5,000 ብር ክፍያ ያድርጉ።",
          actions: ['Make Payment', 'Upload Payment Receipt']
        },
        4: {
          en: "Payment confirmed! Your license has been renewed. Download your new license.",
          am: "ክፍያ ተረጋግጧል! የንግድ ፈቃድዎ በተሳካ ሁኔታ ዘምኗል።",
          actions: ['Download New License', 'Print Certificate']
        }
      }
    };

    return stepResponses[service]?.[step] || stepResponses.iftms[1];
  }
}

// Export singleton instance
export const nlpProcessor = new NLPProcessor();