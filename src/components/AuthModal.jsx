import { Component } from 'preact'
import { auth } from '../services/auth.js'

export class AuthModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      email: '',
      isLoading: false,
      currentProvider: null
    }
  }

  handleEmailSubmit = async (e) => {
    e.preventDefault()
    const { email } = this.state
    const { onAuthSuccess } = this.props
    
    if (!email) return
    
    this.setState({ isLoading: true, currentProvider: 'email' })
    
    try {
      await auth.handleEmailSignIn(email)
      if (onAuthSuccess) {
        onAuthSuccess()
      }
    } catch (error) {
      console.error('Email sign in failed:', error)
    } finally {
      this.setState({ isLoading: false, currentProvider: null })
    }
  }

  handleGoogleSignIn = async () => {
    const { onAuthSuccess } = this.props
    
    this.setState({ isLoading: true, currentProvider: 'google' })
    
    try {
      await auth.signInWithGoogle()
      if (onAuthSuccess) {
        onAuthSuccess()
      }
    } catch (error) {
      console.error('Google sign in failed:', error)
    } finally {
      this.setState({ isLoading: false, currentProvider: null })
    }
  }

  handleGitHubSignIn = async () => {
    const { onAuthSuccess } = this.props
    
    this.setState({ isLoading: true, currentProvider: 'github' })
    
    try {
      await auth.signInWithGitHub()
      if (onAuthSuccess) {
        onAuthSuccess()
      }
    } catch (error) {
      console.error('GitHub sign in failed:', error)
    } finally {
      this.setState({ isLoading: false, currentProvider: null })
    }
  }

  handleEmailChange = (e) => {
    this.setState({ email: e.target.value })
  }

  render() {
    const { isOpen, onClose } = this.props
    const { email, isLoading, currentProvider } = this.state

    // Add the 'active' class when isOpen is true
    const modalClass = isOpen ? 'oauth-modal active' : 'oauth-modal'

    return (
      <div class={modalClass}>
        <div class="oauth-modal-content">
          <button 
            class="close-oauth-btn material-symbols-rounded" 
            onClick={onClose}
            disabled={isLoading}
          >
            close
          </button>
          
          <div class="oauth-header">
            <img src="/icons/icon-192.png" alt="DocAnalyzer" class="oauth-logo" />
            <h2>Welcome to DocAnalyzer</h2>
            <p>Sign in to access your documents and chat history</p>
          </div>

          <div class="oauth-options">
            <button 
              class={`oauth-btn google-btn ${isLoading && currentProvider === 'google' ? 'loading' : ''}`}
              onClick={this.handleGoogleSignIn}
              disabled={isLoading}
            >
              <span class="oauth-icon">
                <img src=".img/google.png" alt="Google" />
              </span>
              {isLoading && currentProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
            </button>

            <button 
              class={`oauth-btn github-btn ${isLoading && currentProvider === 'github' ? 'loading' : ''}`}
              onClick={this.handleGitHubSignIn}
              disabled={isLoading}
            >
              <span class="oauth-icon">
                <img src=".img/logo_only.png" alt="Fayda" />
              </span>
              {isLoading && currentProvider === 'github' ? 'Signing in...' : 'Continue with Fayda'}
            </button>

            <div class="divider">
              <span>or</span>
            </div>

            <form class="email-form" onSubmit={this.handleEmailSubmit}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onInput={this.handleEmailChange}
                required 
                class="email-input" 
                disabled={isLoading}
              />
              <button 
                type="submit" 
                class={`email-btn ${isLoading && currentProvider === 'email' ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading && currentProvider === 'email' ? 'Sending...' : 'Continue with Email'}
              </button>
            </form>
          </div>

          <div class="oauth-footer">
            <p>By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></p>
          </div>

          {isLoading && (
            <div class="auth-loading">
              <div class="spinner-small"></div>
              <p>Signing you in...</p>
            </div>
          )}
        </div>
      </div>
    )
  }
}