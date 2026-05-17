// client/src/services/auth.js
class AuthManager {
  constructor() {
    this.state = {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      tokenExpiry: null
    };
    
    // Bind methods
    this.init = this.init.bind(this);
    this.checkAuthState = this.checkAuthState.bind(this);
    this.signInWithGoogle = this.signInWithGoogle.bind(this);
    this.signInWithFayda = this.signInWithFayda.bind(this);
    this.handleEmailSignIn = this.handleEmailSignIn.bind(this);
    this.signOut = this.signOut.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    
    // Initialize
    this.init();
  }

  async init() {
    console.log('🔄 Initializing Auth Manager...');
    await this.checkAuthState();
    this.setupTokenRefresh();
    console.log('✅ Auth Manager initialized');
  }

  async checkAuthState() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
      try {
        // Verify token with backend
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (data.success) {
          this.state.currentUser = JSON.parse(user);
          this.state.isAuthenticated = true;
          
          // Update token expiry from JWT
          const tokenData = this.parseJwt(token);
          if (tokenData && tokenData.exp) {
            this.state.tokenExpiry = tokenData.exp * 1000; // Convert to milliseconds
          }
        } else {
          // Token invalid, try to refresh
          await this.refreshToken();
        }
      } catch (error) {
        console.error('Auth check error:', error);
        this.clearAuth();
      }
    }
  }

  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  setupTokenRefresh() {
    // Check token expiry every minute
    setInterval(() => {
      if (this.state.tokenExpiry) {
        const timeUntilExpiry = this.state.tokenExpiry - Date.now();
        
        // If token expires in less than 5 minutes, refresh it
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          this.refreshToken();
        }
        
        // If token expired, clear auth
        if (timeUntilExpiry <= 0) {
          this.clearAuth();
        }
      }
    }, 60000); // Check every minute
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      this.clearAuth();
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        
        // Update token expiry
        const tokenData = this.parseJwt(data.token);
        if (tokenData && tokenData.exp) {
          this.state.tokenExpiry = tokenData.exp * 1000;
        }
        
        return true;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuth();
      return false;
    }
  }

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.state.currentUser = null;
    this.state.isAuthenticated = false;
    this.state.tokenExpiry = null;
    
    // Optional: redirect to login
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }

  async signInWithGoogle() {
    this.state.isLoading = true;
    this.showMessage('Initiating Google sign-in...', 'info');

    try {
      // Load Google Identity Services script
      await this.loadGoogleScript();
      
      // Initialize Google Sign-In
      const client = google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (response) => {
          if (response.access_token) {
            // Exchange Google token with backend
            const result = await this.handleGoogleCallback(response.access_token);
            
            if (result.success) {
              this.showMessage(`Successfully signed in with Google!`, 'success');
            }
          }
        },
      });

      client.requestAccessToken();

    } catch (error) {
      console.error('Google sign-in error:', error);
      this.showMessage('Google sign-in failed', 'error');
      this.state.isLoading = false;
    }
  }

  loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (document.getElementById('google-script')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async handleGoogleCallback(accessToken) {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: accessToken })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        this.state.currentUser = data.user;
        this.state.isAuthenticated = true;
        
        // Update token expiry
        const tokenData = this.parseJwt(data.token);
        if (tokenData && tokenData.exp) {
          this.state.tokenExpiry = tokenData.exp * 1000;
        }
      }

      this.state.isLoading = false;
      return data;

    } catch (error) {
      console.error('Google callback error:', error);
      this.state.isLoading = false;
      throw error;
    }
  }

  async signInWithFayda(nationalId, phoneNumber) {
    this.state.isLoading = true;
    
    try {
      const response = await fetch('/api/auth/fayda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nationalId, phoneNumber })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        this.state.currentUser = data.user;
        this.state.isAuthenticated = true;
        
        // Update token expiry
        const tokenData = this.parseJwt(data.token);
        if (tokenData && tokenData.exp) {
          this.state.tokenExpiry = tokenData.exp * 1000;
        }
        
        this.showMessage(`Welcome, ${data.user.name}!`, 'success');
      }

      this.state.isLoading = false;
      return data;

    } catch (error) {
      console.error('Fayda sign-in error:', error);
      this.showMessage('Fayda sign-in failed', 'error');
      this.state.isLoading = false;
      throw error;
    }
  }

  async handleEmailSignIn(email, password) {
    this.state.isLoading = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        this.state.currentUser = data.user;
        this.state.isAuthenticated = true;
        
        // Update token expiry
        const tokenData = this.parseJwt(data.token);
        if (tokenData && tokenData.exp) {
          this.state.tokenExpiry = tokenData.exp * 1000;
        }
        
        this.showMessage(`Welcome back, ${data.user.name}!`, 'success');
      }

      this.state.isLoading = false;
      return data;

    } catch (error) {
      console.error('Email sign-in error:', error);
      this.showMessage('Sign-in failed', 'error');
      this.state.isLoading = false;
      throw error;
    }
  }

  async signOut() {
    this.state.isLoading = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ refreshToken })
      });

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      
      this.state.currentUser = null;
      this.state.isAuthenticated = false;
      this.state.isLoading = false;
      this.state.tokenExpiry = null;
      
      this.showMessage('You have been signed out.', 'info');
      
      // Redirect to login
      window.location.href = '/login';
    }
  }

  async register(userData) {
    this.state.isLoading = true;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        this.state.currentUser = data.user;
        this.state.isAuthenticated = true;
        
        // Update token expiry
        const tokenData = this.parseJwt(data.token);
        if (tokenData && tokenData.exp) {
          this.state.tokenExpiry = tokenData.exp * 1000;
        }
        
        this.showMessage('Registration successful! Please verify your email.', 'success');
      }

      this.state.isLoading = false;
      return data;

    } catch (error) {
      console.error('Registration error:', error);
      this.showMessage('Registration failed', 'error');
      this.state.isLoading = false;
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const response = await fetch(`/api/auth/verify-email/${token}`);
      const data = await response.json();

      if (data.success) {
        this.showMessage('Email verified successfully!', 'success');
        
        // Update user verification status
        if (this.state.currentUser) {
          this.state.currentUser.verified = true;
          localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));
        }
      }

      return data;

    } catch (error) {
      console.error('Email verification error:', error);
      this.showMessage('Email verification failed', 'error');
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Password reset email sent!', 'success');
      }

      return data;

    } catch (error) {
      console.error('Forgot password error:', error);
      this.showMessage('Failed to send reset email', 'error');
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage('Password reset successfully! Please login.', 'success');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }

      return data;

    } catch (error) {
      console.error('Reset password error:', error);
      this.showMessage('Failed to reset password', 'error');
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        // Update stored user
        const updatedUser = { ...this.state.currentUser, ...profileData };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        this.state.currentUser = updatedUser;
        
        this.showMessage('Profile updated successfully!', 'success');
      }

      return data;

    } catch (error) {
      console.error('Profile update error:', error);
      this.showMessage('Failed to update profile', 'error');
      throw error;
    }
  }

  getCurrentUser() {
    return this.state.currentUser;
  }

  getIsAuthenticated() {
    return this.state.isAuthenticated;
  }

  getIsLoading() {
    return this.state.isLoading;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  showMessage(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: '9999',
      fontSize: '14px',
      fontWeight: '500',
      animation: 'slideIn 0.3s ease'
    });

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease';
        Object.assign(toast.style, {
          transform: 'translateX(100%)',
          opacity: '0'
        });
        
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, 3000);
  }
}

// Export singleton instance
export const auth = new AuthManager();