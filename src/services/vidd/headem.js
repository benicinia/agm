// ==============================================
// LOGIN/LOGOUT FUNCTIONALITY WITH GOOGLE LOGIN
// ==============================================

// State management
let isLoggedIn = false;
let userProfile = null;

// Initialize the login functionality
function initLoginSystem() {
    createLoginModal();
    setupEventListeners();
    updateHeaderMenu();
}

// Create the login modal HTML
function createLoginModal() {
    // Check if modal already exists
    if (document.getElementById('loginModal')) return;
    
    const modalHTML = `
        <div id="loginModal" class="modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 3000; align-items: center; justify-content: center;">
            <div style="background: var(--secondary-bg); border-radius: 10px; width: 90%; max-width: 400px; padding: 30px; position: relative; border: 1px solid var(--border-color);">
                <button id="closeModalBtn" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: var(--text-secondary); font-size: 24px; cursor: pointer;">&times;</button>
                
                <h2 style="text-align: center; margin-bottom: 30px; color: var(--text-primary);">Welcome to DART</h2>
                
                <button id="googleLoginBtn" style="width: 100%; padding: 12px; background: white; color: #333; border: none; border-radius: 5px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; font-size: 16px; margin-bottom: 15px;">
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                </button>
                
                <div style="text-align: center; color: var(--text-secondary); font-size: 14px;">
                    By continuing, you agree to DART's Terms of Service and Privacy Policy
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Setup event listeners
function setupEventListeners() {
    // Get menus
    const loggedInMenu = document.getElementById('loggedInMenu');
    const loggedOutMenu = document.getElementById('loggedOutMenu');
    
    // Login button in logged out menu
    const loginBtn = loggedOutMenu ? loggedOutMenu.querySelector('#renderBtn') : null;
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }
    
    // Render button in logged in menu
    const renderBtn = loggedInMenu ? loggedInMenu.querySelector('#renderBtn') : null;
    if (renderBtn) {
        renderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isLoggedIn) {
                alert('Render video functionality would start here');
            }
        });
    }
    
    // Play/Pause buttons (handle both menus)
    const playBtns = document.querySelectorAll('#playPauseBtn');
    playBtns.forEach(btn => {
        btn.addEventListener('click', togglePlayPause);
    });
    
    // Modal close button
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideLoginModal);
    }
    
    // Google login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // Close modal when clicking outside
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                hideLoginModal();
            }
        });
    }
}

// Toggle play/pause
function togglePlayPause() {
    const video = document.getElementById('videoPreview');
    if (!video) return;
    
    if (!isLoggedIn) {
        showLoginModal();
        return;
    }
    
    if (video.paused) {
        video.play();
        updatePlayPauseButtons('⏸ Pause');
    } else {
        video.pause();
        updatePlayPauseButtons('▶ Play');
    }
}

// Update all play/pause buttons
function updatePlayPauseButtons(text) {
    document.querySelectorAll('#playPauseBtn').forEach(btn => {
        btn.textContent = text;
    });
}

// Update header menu based on login state
function updateHeaderMenu() {
    const loggedInMenu = document.getElementById('loggedInMenu');
    const loggedOutMenu = document.getElementById('loggedOutMenu');
    
    if (!loggedInMenu || !loggedOutMenu) return;
    
    if (isLoggedIn) {
        loggedInMenu.style.display = 'flex';
        loggedOutMenu.style.display = 'none';
        
        // Add user dropdown if not already present
        if (!document.getElementById('userDropdown')) {
            addUserDropdown(loggedInMenu);
        }
    } else {
        loggedInMenu.style.display = 'none';
        loggedOutMenu.style.display = 'flex';
        
        // Remove user dropdown if exists
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.remove();
        }
    }
}

// Add user dropdown to menu
function addUserDropdown(menuElement) {
    const userDropdown = document.createElement('div');
    userDropdown.className = 'menu-item has-submenu';
    userDropdown.id = 'userDropdown';
    
    const displayName = userProfile ? userProfile.name : 'User';
    const initials = userProfile ? getInitials(userProfile.name) : 'U';
    
    userDropdown.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; background: var(--accent-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                ${initials}
            </div>
            <span>${displayName}</span>
        </div>
        <div class="submenu">
            <button class="submenu-item" id="profileBtn">👤 Your Profile</button>
            <button class="submenu-item" id="accountSettingsBtn">⚙️ Account Settings</button>
            <button class="submenu-item" id="myProjectsBtn">📁 My Projects</button>
            <div class="menu-divider"></div>
            <button class="submenu-item" id="logoutBtn">🚪 Sign Out</button>
        </div>
    `;
    
    // Insert before the flex spacer
    const spacer = menuElement.querySelector('div[style*="flex: 1"]');
    if (spacer) {
        menuElement.insertBefore(userDropdown, spacer);
    }
    
    // Add logout listener
    setTimeout(() => {
        document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
        document.getElementById('profileBtn')?.addEventListener('click', () => alert('Profile page would open here'));
        document.getElementById('accountSettingsBtn')?.addEventListener('click', () => alert('Account settings would open here'));
        document.getElementById('myProjectsBtn')?.addEventListener('click', () => alert('Your projects would be listed here'));
    }, 0);
}

// Helper function to get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Show login modal
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Hide login modal
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle Google login (simulated)
function handleGoogleLogin() {
    showLoadingOverlay();
    
    // Simulate API call delay
    setTimeout(() => {
        // Mock user data
        userProfile = {
            name: 'John Doe',
            email: 'john.doe@gmail.com',
            picture: null,
            googleId: '123456789'
        };
        
        isLoggedIn = true;
        
        // Save to localStorage
        localStorage.setItem('dart_user', JSON.stringify(userProfile));
        
        // Hide modal and loading
        hideLoginModal();
        hideLoadingOverlay();
        
        // Update UI
        updateHeaderMenu();
        
        // Show success message
        showStatusMessage(`Welcome, ${userProfile.name}!`, 'success');
    }, 1500);
}

// Handle logout
function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        // Clear user data
        userProfile = null;
        isLoggedIn = false;
        
        // Clear localStorage
        localStorage.removeItem('dart_user');
        
        // Update UI
        updateHeaderMenu();
        
        // Show message
        showStatusMessage('You have been signed out', 'info');
        
        // Reset play button
        updatePlayPauseButtons('▶ Play');
        
        // Pause video if playing
        const video = document.getElementById('videoPreview');
        if (video && !video.paused) {
            video.pause();
        }
    }
}

// Show loading overlay
function showLoadingOverlay() {
    let overlay = document.getElementById('loginLoadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loginLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            color: white;
            font-size: 1.2rem;
        `;
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 50px; height: 50px; border: 3px solid var(--accent-color); border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <div>Signing in with Google...</div>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(overlay);
    } else {
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loginLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessagex');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Check for saved session
function checkSavedSession() {
    const savedUser = localStorage.getItem('dart_user');
    if (savedUser) {
        try {
            userProfile = JSON.parse(savedUser);
            isLoggedIn = true;
            updateHeaderMenu();
        } catch (e) {
            console.error('Failed to parse saved user', e);
            localStorage.removeItem('dart_user');
        }
    }
}

// REMOVED THE setTimeout INITIALIZATION - will be called from main.js

// Export functions for external use
window.loginSystem = {
    login: showLoginModal,
    logout: handleLogout,
    isLoggedIn: () => isLoggedIn,
    getUserProfile: () => userProfile
};