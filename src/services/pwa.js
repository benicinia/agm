export class PWAHandler {
  constructor() {
    this.deferredPrompt = null
  }

  async init() {
    this.registerServiceWorker()
    this.setupInstallPrompt()
    this.loadThemePreference()
    this.setupNetworkStatus()
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration)
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError)
        })
    }
  }

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e
      this.showInstallPromotion()
    })

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null
      console.log('PWA was installed')
    })
  }

  showInstallPromotion() {
    // You can show a custom install button here
    const installBtn = document.createElement('button')
    installBtn.textContent = 'Install App'
    installBtn.className = 'install-btn'
    installBtn.addEventListener('click', this.installApp.bind(this))
    
    // Add to your UI where appropriate
    const appHeader = document.querySelector('.app-header')
    if (appHeader) {
      appHeader.appendChild(installBtn)
    }
  }

  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      this.deferredPrompt = null
    }
  }

  loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme')
      const themeBtn = document.getElementById('theme-toggle-btn')
      if (themeBtn) {
        themeBtn.textContent = 'dark_mode'
      }
    }
  }

  // Check if app is running as PWA
  isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           document.referrer.includes('android-app://')
  }

  // Network status monitoring
  setupNetworkStatus() {
    window.addEventListener('online', () => {
      this.showStatus('Back online', 'success')
    })

    window.addEventListener('offline', () => {
      this.showStatus('You are offline', 'warning')
    })
  }

  showStatus(message, type) {
    const statusEl = document.createElement('div')
    statusEl.className = `status-message ${type}`
    statusEl.textContent = message
    
    document.body.appendChild(statusEl)
    
    setTimeout(() => {
      statusEl.remove()
    }, 3000)
  }
}

export const pwa = new PWAHandler()