// ==============================================
// MAIN INITIALIZATION
// ==============================================

// SINGLE initialization flag
let appInitialized = false;

async function initializeApp() {
    if (appInitialized) {
        console.warn('⚠️ App already initialized, skipping...');
        return;
    }
    
    console.log('🚀 Starting SINGLE initialization...');
    appInitialized = true;
    
    // Initialize login system first
    if (typeof initLoginSystem === 'function') {
        initLoginSystem();
        checkSavedSession();
    }
    
    // Initialize editor
    const editor = new VideoEditor();
    window.videoEditor = editor;
    
    // Create IndexedDB manager
    const dbManager = new IndexedDBManager();
    window.dbManager = dbManager;
    
    console.log('🔄 Initializing database...');
    // Wait for database to be fully initialized
    await dbManager.init();
    console.log('✅ Database initialized, db exists:', !!dbManager.db);
    
    // Create project manager UI
    const projectManager = new AdvancedProjectManagerUI(editor, dbManager);
    window.projectManager = projectManager;
    
    console.log('🎉 All components initialized');
    
    // Initialize mobile tabs
    initMobileTabs();
}

// Initialize mobile tabs functionality
function initMobileTabs() {
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    const controlsPanel = document.querySelector('.controls-panel');
    const timelineContainer = document.querySelector('.timeline-container');
    const uploadSection = document.querySelector('.upload-section');
    
    if (!mobileTabs.length) return;
    
    function switchMobileTab(tabName) {
        // Remove active class from all tabs
        mobileTabs.forEach(tab => tab.classList.remove('active'));
        
        // Hide all sections
        if (controlsPanel) controlsPanel.classList.remove('active');
        if (timelineContainer) timelineContainer.style.display = 'none';
        if (uploadSection) uploadSection.style.display = 'none';
        
        // Show selected section
        switch(tabName) {
            case 'timeline':
                if (timelineContainer) timelineContainer.style.display = 'block';
                document.querySelector('.mobile-tab[data-tab="timeline"]')?.classList.add('active');
                break;
            case 'controls':
                if (controlsPanel) controlsPanel.classList.add('active');
                document.querySelector('.mobile-tab[data-tab="controls"]')?.classList.add('active');
                break;
            case 'library':
                if (uploadSection) uploadSection.style.display = 'block';
                document.querySelector('.mobile-tab[data-tab="library"]')?.classList.add('active');
                break;
            case 'effects':
                if (controlsPanel) controlsPanel.classList.add('active');
                document.querySelector('.mobile-tab[data-tab="effects"]')?.classList.add('active');
                break;
        }
    }
    
    // Add click event to mobile tabs
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchMobileTab(tabName);
        });
    });
    
    // On mobile, make timeline the active tab by default
    if (window.innerWidth <= 768) {
        switchMobileTab('timeline');
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            switchMobileTab('timeline');
        } else {
            // On desktop, show everything
            if (controlsPanel) controlsPanel.classList.add('active');
            if (timelineContainer) timelineContainer.style.display = 'block';
            if (uploadSection) uploadSection.style.display = 'block';
        }
    });
}

// SINGLE DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    if (window.videoEditor && window.videoEditor.clips && window.videoEditor.clips.length > 0) {
        try {
            // Call auto-save if dbManager exists
            if (typeof window.dbManager?.saveCurrentProject === 'function') {
                window.dbManager.saveCurrentProject(window.videoEditor, true);
            }
        } catch (error) {
            // Silent fail on unload
        }
    }
});

// ==============================================
// CSS STYLES
// ==============================================

const advancedProjectCSS = document.createElement('style');
advancedProjectCSS.textContent = `
    .advanced-project-item:hover {
        background: var(--tertiary-bg) !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        border-left-color: var(--track-video) !important;
    }
    
    .project-load-btn:hover {
        background: var(--accent-hover) !important;
    }
    
    .project-delete-btn:hover {
        background: #d9534f !important;
    }
    
    #advancedProjectModal .image-editor-content {
        max-height: 85vh;
    }
    
    #projectsContainer {
        scrollbar-width: thin;
        scrollbar-color: var(--accent-color) var(--tertiary-bg);
    }
    
    #projectsContainer::-webkit-scrollbar {
        width: 10px;
    }
    
    #projectsContainer::-webkit-scrollbar-track {
        background: var(--tertiary-bg);
        border-radius: 4px;
    }
    
    #projectsContainer::-webkit-scrollbar-thumb {
        background: var(--accent-color);
        border-radius: 4px;
    }
    
    #projectsContainer::-webkit-scrollbar-thumb:hover {
        background: var(--accent-hover);
    }
`;

const deleteControlsCSS = document.createElement('style');
deleteControlsCSS.textContent = `
    .clip-delete-btn:hover {
        background: var(--error-color) !important;
        opacity: 1 !important;
    }
    
    .media-delete-btn:hover {
        background: var(--error-color) !important;
        transform: scale(1.1);
    }
    
    .context-menu-item:hover {
        background: var(--accent-color) !important;
    }
    
    .clip.selected {
        box-shadow: 0 0 0 2px #ffd700 !important;
        z-index: 10 !important;
    }
    
    #deleteSelectedBtn:hover,
    #clearTimelineBtn:hover,
    #clearLibraryBtn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    
    .media-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .clip:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
    }
    
    .delete-warning {
        background: linear-gradient(45deg, var(--error-color), #ff6b6b) !important;
    }
    
    .selection-count {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent-color);
        color: white;
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
`;

document.head.appendChild(deleteControlsCSS);
document.head.appendChild(advancedProjectCSS);

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function updateSelectionCount(editor) {
    let countDisplay = document.getElementById('selectionCount');
    if (!countDisplay) {
        countDisplay = document.createElement('div');
        countDisplay.id = 'selectionCount';
        countDisplay.className = 'selection-count';
        countDisplay.style.display = 'none';
        document.body.appendChild(countDisplay);
    }
    
    if (editor.selectedClips && editor.selectedClips.size > 0) {
        countDisplay.textContent = `${editor.selectedClips.size} clip(s) selected`;
        countDisplay.style.display = 'block';
    } else {
        countDisplay.style.display = 'none';
    }
}

// Update the toggleClipSelection method to call this
if (typeof VideoEditor !== 'undefined') {
    const originalToggleClipSelection = VideoEditor.prototype.toggleClipSelection;
    VideoEditor.prototype.toggleClipSelection = function(clipId) {
        if (this.selectedClips.has(clipId)) {
            this.selectedClips.delete(clipId);
        } else {
            this.selectedClips.add(clipId);
        }
        
        // Update visual styling for all clips
        this.clips.forEach(clip => {
            if (clip.element) {
                if (this.selectedClips.has(clip.id)) {
                    clip.element.classList.add('selected');
                } else {
                    clip.element.classList.remove('selected');
                }
            }
        });
        
        // Update selection count display
        updateSelectionCount(this);
        
        const selectedCount = this.selectedClips.size;
        if (selectedCount > 0) {
            this.showStatus(`${selectedCount} clip(s) selected - Press Delete key to delete`, 'info');
        }
    };
}

// Add keyboard shortcut for delete
document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (window.videoEditor && window.videoEditor.selectedClips && window.videoEditor.selectedClips.size > 0) {
            window.videoEditor.deleteSelectedClips();
        }
    }
});

// Helper function to check if mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Update existing tabs for mobile compatibility
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        if (isMobile()) {
            const tabName = this.dataset.tab;
            let targetElement;
            
            switch(tabName) {
                case 'step1':
                    targetElement = document.querySelector('.preview-panel');
                    break;
                case 'step2':
                    targetElement = document.querySelector('.controls-panel');
                    break;
                case 'step3':
                    targetElement = document.querySelector('.upload-section');
                    break;
                case 'step4':
                    if (window.projectManager) {
                        window.projectManager.showProjectManager();
                    }
                    return;
            }
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});