// client/src/services/apiHandler.js
class ApiHandler {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';
    this.apiKey = process.env.REACT_APP_API_KEY;
    
    // Cache for offline support
    this.cache = new Map();
    this.pendingRequests = [];
  }

  // ========== AUTHENTICATION METHODS ==========

  async register(userData) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.token, data.refreshToken);
        this.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.token, data.refreshToken);
        this.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async googleSignIn(googleToken) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: googleToken })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.token, data.refreshToken);
        this.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  async faydaSignIn(nationalId, phoneNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/fayda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nationalId, phoneNumber })
      });

      const data = await response.json();
      
      if (data.success) {
        this.setTokens(data.token, data.refreshToken);
        this.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Fayda sign-in error:', error);
      throw error;
    }
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ refreshToken })
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
      this.clearUser();
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        return data.token;
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  // ========== BUSINESS LICENSE METHODS ==========

  async validateBusinessLicense(licenseNumber) {
    try {
      // Check cache first
      const cacheKey = `license_${licenseNumber}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(`${this.baseUrl}/business/validate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ licenseNumber })
      });

      const data = await response.json();
      
      if (data.success) {
        // Cache for 5 minutes
        this.cache.set(cacheKey, data);
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      }
      
      return data;
    } catch (error) {
      console.error('License validation error:', error);
      throw error;
    }
  }

  async renewBusinessLicense(licenseNumber, supportingDocs = []) {
    try {
      const response = await fetch(`${this.baseUrl}/business/renew`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ licenseNumber, supportingDocs })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('License renewal error:', error);
      throw error;
    }
  }

  async getLicenseStatus(licenseNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/business/status/${licenseNumber}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('License status error:', error);
      throw error;
    }
  }

  async checkLicenseFormat(licenseNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/business/check-format/${licenseNumber}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Format check error:', error);
      throw error;
    }
  }

  // ========== PDF DOCUMENT METHODS ==========

  async analyzePdfText(text, fileName, intent = null) {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/analyze`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ text, fileName, intent })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('PDF analysis error:', error);
      throw error;
    }
  }

  async syncTaggedDocument(document, sentences, tags) {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/sync-tagged`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ document, sentences, tags })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Sync tagged document error:', error);
      throw error;
    }
  }

  async getTaggedDocuments() {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/tagged-documents`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get tagged documents error:', error);
      throw error;
    }
  }

  async getTaggedDocument(documentId) {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/tagged-document/${documentId}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get tagged document error:', error);
      throw error;
    }
  }

  async extractLicenseFromPdf(text) {
    try {
      const response = await fetch(`${this.baseUrl}/pdf/extract-license`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('License extraction error:', error);
      throw error;
    }
  }

  // ========== RASA WEBHOOK METHODS ==========

  async sendMessageToRasa(message, sender = null) {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          message, 
          sender: sender || this.getUserId() 
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Rasa message error:', error);
      throw error;
    }
  }

  async getConversationHistory() {
    try {
      const response = await fetch(`${this.baseUrl}/conversations`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  }

  // ========== DOCUMENT MANAGEMENT METHODS ==========

  async uploadDocument(file, description = '', tags = '') {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('description', description);
    formData.append('tags', tags);

    try {
      const response = await fetch(`${this.baseUrl}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader()
        },
        body: formData
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw error;
    }
  }

  async saveDocumentAnalysis(documentData, analysisResults, documentId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/documents/save`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ documentData, analysisResults, documentId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Save document error:', error);
      throw error;
    }
  }

  async getUserDocuments() {
    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get documents error:', error);
      throw error;
    }
  }

  async getDocument(documentId) {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get document error:', error);
      throw error;
    }
  }

  async deleteDocument(documentId) {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Delete document error:', error);
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

  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
  }

  setTokens(token, refreshToken) {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  clearUser() {
    localStorage.removeItem('user');
  }

  getUserId() {
    const user = this.getUser();
    return user?.id || 'anonymous';
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  async requestWithAuth(url, options = {}) {
    let response = await fetch(url, {
      ...options,
      headers: this.getHeaders()
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      try {
        await this.refreshToken();
        
        // Retry the request with new token
        response = await fetch(url, {
          ...options,
          headers: this.getHeaders()
        });
      } catch (error) {
        // Redirect to login
        window.location.href = '/login';
        throw error;
      }
    }

    return response;
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  // Pending requests for offline support
  addPendingRequest(request) {
    this.pendingRequests.push({
      ...request,
      timestamp: Date.now()
    });
    this.savePendingRequests();
  }

  savePendingRequests() {
    localStorage.setItem('pendingRequests', JSON.stringify(this.pendingRequests));
  }

  loadPendingRequests() {
    const saved = localStorage.getItem('pendingRequests');
    if (saved) {
      this.pendingRequests = JSON.parse(saved);
    }
  }

  async processPendingRequests() {
    const pending = [...this.pendingRequests];
    this.pendingRequests = [];
    this.savePendingRequests();

    for (const request of pending) {
      try {
        await fetch(request.url, request.options);
      } catch (error) {
        console.error('Failed to process pending request:', error);
        this.addPendingRequest(request);
      }
    }
  }

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'unreachable' };
    }
  }
}

// Export singleton instance
export const apiHandler = new ApiHandler();