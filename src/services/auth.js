class AuthManager {
  constructor() {
    this.state = {
      currentUser: null,
      isAuthenticated: false,
      isLoading: false
    }
    this.init()
  }

  async init() {
    console.log('🔄 Initializing Auth Manager...')
    this.checkAuthState()
    console.log('✅ Auth Manager initialized')
  }

  checkAuthState() {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      this.state.currentUser = user
      this.state.isAuthenticated = true
    }
  }

  async signInWithGoogle() {
    await this.simulateOAuth('Google')
  }

  async signInWithGitHub() {
    await this.simulateOAuth('Fayda')
  }

  async signInWithMicrosoft() {
    await this.simulateOAuth('Microsoft')
  }

  async handleEmailSignIn(email) {
    await this.simulateEmailSignIn(email)
  }

  async simulateOAuth(provider) {
    this.state.isLoading = true

    await new Promise(resolve => setTimeout(resolve, 1500))

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${provider} User`,
      email: `user@${provider.toLowerCase()}.com`,
      provider: provider.toLowerCase(),
      avatar: null
    }

    this.state.currentUser = user
    this.state.isAuthenticated = true
    this.state.isLoading = false

    localStorage.setItem('currentUser', JSON.stringify(user))
    localStorage.setItem('currentUser', JSON.stringify(user))
    
    this.showMessage(`Successfully signed in with ${provider}!`, 'success')
  }

  async simulateEmailSignIn(email) {
    this.state.isLoading = true

    await new Promise(resolve => setTimeout(resolve, 2000))

    const user = {
      id: Math.random().toString(36).substr(2, 9),
      name: email.split('@')[0],
      email: email,
      provider: 'email',
      avatar: null
    }

    this.state.currentUser = user
    this.state.isAuthenticated = true
    this.state.isLoading = false

    localStorage.setItem('currentUser', JSON.stringify(user))
    this.showMessage('Check your email for the sign-in link!', 'success')
  }

  signOut() {
    this.state.currentUser = null
    this.state.isAuthenticated = false
    localStorage.removeItem('currentUser')
    this.showMessage('You have been signed out.', 'info')
  }

  showMessage(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast-message toast-${type}`
    toast.textContent = message
    
    Object.assign(toast.style, {
      position: 'fixed',
      top: '80px',
      right: '20px',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '8px',
      zIndex: '1003'
    })

    document.body.appendChild(toast)

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 3000)
  }

  getCurrentUser() {
    return this.state.currentUser
  }

  getIsAuthenticated() {
    return this.state.isAuthenticated
  }
}

export const auth = new AuthManager()