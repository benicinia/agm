class AdvancedProjectManagerUI {
    constructor(editor, db) {
        this.editor = editor;
        this.db = db;
        this.modal = null;
        this.isLoading = false;
        this.autoSaveInterval = null;
        this.init();
    }
    
    init() {
        this.createUI();
        this.setupEventListeners();
    }
    
    deleteClipsByType(type) {
        const clipsOfType = this.editor.clips.filter(clip => clip.type === type);
        if (clipsOfType.length === 0) {
            this.editor.showStatus(`No ${type} clips in timeline`, 'info');
            return;
        }
        
        if (!confirm(`Delete all ${type} clips from timeline (${clipsOfType.length})?`)) {
            return;
        }
        
        const clipsToDelete = clipsOfType.map(clip => clip.id);
        
        clipsToDelete.forEach(clipId => {
            const clipIndex = this.editor.clips.findIndex(c => c.id == clipId);
            if (clipIndex !== -1) {
                const clip = this.editor.clips[clipIndex];
                
                if (clip.element && clip.element.parentNode) {
                    clip.element.remove();
                }
                
                if (clip.audioElement) {
                    clip.audioElement.pause();
                    clip.audioElement.src = '';
                    const audioIndex = this.editor.audioElements.indexOf(clip.audioElement);
                    if (audioIndex !== -1) {
                        this.editor.audioElements.splice(audioIndex, 1);
                    }
                }
                
                if (clip.type === 'video') {
                    this.editor.videoSources.delete(clip.id);
                    const videoIndex = this.editor.videoClips.findIndex(c => c.id == clipId);
                    if (videoIndex !== -1) {
                        this.editor.videoClips.splice(videoIndex, 1);
                    }
                    
                    if (this.editor.currentVideoClip === clip.id) {
                        this.editor.currentVideoClip = null;
                        if (this.editor.mainVideoPlayer) {
                            this.editor.mainVideoPlayer.pause();
                            this.editor.mainVideoPlayer.style.display = 'none';
                        }
                    }
                }
                
                if (clip.type === 'image') {
                    const imageIndex = this.editor.imageClips.findIndex(c => c.id == clipId);
                    if (imageIndex !== -1) {
                        this.editor.imageClips.splice(imageIndex, 1);
                    }
                }
                
                this.editor.selectedClips.delete(clipId);
                this.editor.clips.splice(clipIndex, 1);
            }
        });
        
        this.editor.updateTimeRuler();
        this.editor.updatePreview();
        this.editor.showStatus(`Deleted all ${type} clips (${clipsOfType.length})`, 'success');
    }
    
    createUI() {
        const controlsPanel = document.querySelector('.controls-panel');
        const existingSections = controlsPanel.querySelectorAll('.control-section');
        const lastSection = existingSections[existingSections.length - 1];
        
        const projectSection = document.createElement('div');
        projectSection.className = 'control-section';
        projectSection.innerHTML = `
            <h3>🎬 Project Management</h3>
            <div class="form-group">
                <input type="text" id="projectName" placeholder="Project name" style="width: 100%; margin-bottom: 10px;">
                <div class="btn-group" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="saveProjectBtn" style="flex: 1; background: var(--success-color);">💾 Save</button>
                    <button id="saveAsBtn" style="flex: 1;">💾 Save As</button>
                </div>
                <div class="btn-group" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="loadProjectBtn" style="flex: 1;">📂 Load</button>
                    <button id="newProjectBtn" style="flex: 1;">🆕 New</button>
                </div>
                <button id="manageProjectsBtn" style="width: 100%; margin-bottom: 10px;">🗂️ Manage Projects</button>
                <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 5px; background: var(--tertiary-bg); border-radius: 4px;">
                    <span id="projectStatus">Ready</span>
                </div>
            </div>
        `;
        
        lastSection.parentNode.insertBefore(projectSection, lastSection.nextSibling);
        this.createModal();
    }
    
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'advancedProjectModal';
        this.modal.className = 'image-editor-panel';
        this.modal.style.display = 'none';
        
        this.modal.innerHTML = `
            <div class="image-editor-content" style="max-width: 900px; max-height: 85vh;">
                <div class="editor-header">
                    <h3>📂 Project Manager</h3>
                    <div class="btn-group">
                        <button id="refreshProjectsBtn" style="background: var(--accent-color);">🔄 Refresh</button>
                        <button id="closeProjectsBtn" style="background: var(--error-color);">✕ Close</button>
                    </div>
                </div>
                <div class="editor-body" style="flex-direction: column; padding: 20px;">
                    <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                        <input type="text" id="projectSearch" placeholder="🔍 Search projects..." 
                               style="flex: 1; padding: 10px; background: var(--tertiary-bg); border: 1px solid var(--border-color); border-radius: 4px; color: white;">
                        <select id="projectSort" style="padding: 10px; background: var(--tertiary-bg); border: 1px solid var(--border-color); border-radius: 4px; color: white;">
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name">By Name</option>
                            <option value="clips">By Clip Count</option>
                        </select>
                    </div>
                    <div id="projectsContainer" style="flex: 1; overflow-y: auto; min-height: 300px;">
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            Loading projects...
                        </div>
                    </div>
                    <div style="margin-top: 20px; display: flex; justify-content: space-between;">
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">
                            <span id="projectsCount">0</span> projects
                        </div>
                        <button id="deleteAllBtn" style="background: var(--error-color);">🗑️ Clear All</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    increaseClipDuration() {
        const currentValue = parseInt(this.editor.clipDuration.value);
        const newValue = Math.min(60, currentValue + 1);
        this.editor.clipDuration.value = newValue;
        this.editor.clipDuration.dispatchEvent(new Event('input'));
    }
    
    decreaseClipDuration() {
        const currentValue = parseInt(this.editor.clipDuration.value);
        const newValue = Math.max(1, currentValue - 1);
        this.editor.clipDuration.value = newValue;
        this.editor.clipDuration.dispatchEvent(new Event('input'));
    }
    
    setupEventListeners() {
        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('saveAsBtn').addEventListener('click', () => this.saveAs());
        document.getElementById('loadProjectBtn').addEventListener('click', () => this.showProjectManager());
        document.getElementById('newProjectBtn').addEventListener('click', () => this.newProject());
        document.getElementById('manageProjectsBtn').addEventListener('click', () => this.showProjectManager());
        
        this.createDeleteControls();
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    this.increaseClipDuration();
                } else if (e.key === '-') {
                    e.preventDefault();
                    this.decreaseClipDuration();
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'closeProjectsBtn') {
                this.modal.style.display = 'none';
            }
            if (e.target.id === 'refreshProjectsBtn') {
                this.loadProjectsList();
            }
            if (e.target.id === 'deleteAllBtn') {
                this.deleteAllProjects();
            }
        });
        
        document.addEventListener('input', (e) => {
            if (e.target.id === 'projectSearch') {
                this.filterProjects(e.target.value);
            }
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.id === 'projectSort') {
                this.sortProjects(e.target.value);
            }
        });
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('project-load-btn')) {
                const projectId = e.target.dataset.id;
                console.log('🎯 Loading project:', projectId);
                this.loadProject(projectId);
            }
            if (e.target.classList.contains('project-delete-btn')) {
                const projectId = e.target.dataset.id;
                this.deleteProject(projectId);
            }
        });
    }
    
    createDeleteControls() {
        const controlsPanel = document.querySelector('.controls-panel');
        const existingSections = controlsPanel.querySelectorAll('.control-section');
        const lastSection = existingSections[existingSections.length - 1];
        
        const deleteSection = document.createElement('div');
        deleteSection.className = 'control-section';
        deleteSection.innerHTML = `
            <h3>🗑️ Delete Controls</h3>
            <div class="form-group">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <button id="deleteSelectedBtn" style="background: var(--error-color);">Delete Selected</button>
                    <button id="clearTimelineBtn" style="background: #ff6b6b;">Clear Timeline</button>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>Delete by Type:</label>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 5px;">
                        <button class="delete-type-btn" data-type="video" style="background: var(--track-video);">🎬 Videos</button>
                        <button class="delete-type-btn" data-type="image" style="background: var(--track-image);">🖼️ Images</button>
                        <button class="delete-type-btn" data-type="audio" style="background: var(--track-audio);">🎵 Audio</button>
                        <button class="delete-type-btn" data-type="text" style="background: var(--track-text);">📝 Text</button>
                    </div>
                </div>
                <div>
                    <label>Clear Library:</label>
                    <button id="clearLibraryBtn" style="width: 100%; margin-top: 5px; background: #ff6b6b;">Clear Media Library</button>
                </div>
            </div>
        `;
        
        lastSection.parentNode.insertBefore(deleteSection, lastSection.nextSibling);
        
        document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
            this.editor.deleteSelectedClips();
        });
        
        document.getElementById('clearTimelineBtn').addEventListener('click', () => {
            this.editor.clearTimeline();
        });
        
        document.querySelectorAll('.delete-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                this.deleteClipsByType(type);
            });
        });
        
        document.getElementById('clearLibraryBtn').addEventListener('click', () => {
            this.clearMediaLibrary();
        });
    }
    
    clearMediaLibrary() {
        if (this.editor.mediaLibrary.length === 0) {
            this.editor.showStatus('Media library is already empty', 'info');
            return;
        }
        
        const usedMedia = this.editor.clips.length > 0;
        
        if (usedMedia) {
            if (!confirm('Media library contains items used in timeline. Clear anyway?')) {
                return;
            }
        }
        
        if (!confirm(`Clear entire media library (${this.editor.mediaLibrary.length} items)?`)) {
            return;
        }
        
        this.editor.mediaLibrary.forEach(media => {
            if (media.blobUrl) {
                URL.revokeObjectURL(media.blobUrl);
            }
            if (media.url && media.url.startsWith('blob:')) {
                URL.revokeObjectURL(media.url);
            }
        });
        
        this.editor.mediaLibrary = [];
        this.editor.mediaGrid.innerHTML = '';
        this.editor.showStatus('Media library cleared', 'success');
    }
    
    async saveProject() {
        if (this.isLoading) {
            this.editor.showStatus('Please wait...', 'info');
            return;
        }
        
        if (this.editor.clips.length === 0) {
            this.editor.showStatus('No clips to save', 'error');
            return;
        }
        
        const projectName = document.getElementById('projectName')?.value;
        if (!projectName) {
            this.editor.showStatus('Please enter a project name', 'error');
            return;
        }
        
        this.isLoading = true;
        this.setProjectStatus('Saving...');
        
        try {
            // CRITICAL FIX: Use existing project ID if available
            let projectId = this.db.currentProjectId;
            
            // If we have an existing project ID, use it
            if (projectId) {
                console.log('📝 Updating existing project:', projectId);
            }
            
            const savedProjectId = await this.db.saveCurrentProject(this.editor, false);
            
            // CRITICAL FIX: Ensure the currentProjectId is set to the saved ID
            this.db.currentProjectId = savedProjectId;
            
            this.editor.showStatus(`✅ Project saved!`, 'success');
            this.setProjectStatus(`Saved: ${projectName}`);
            
        } catch (error) {
            console.error('Save error:', error);
            this.editor.showStatus('❌ Failed to save project', 'error');
            this.setProjectStatus('Save failed');
        } finally {
            this.isLoading = false;
        }
    }
    
    async saveAs() {
        const currentName = document.getElementById('projectName').value;
        const newName = prompt('Enter new project name:', currentName || `Project ${new Date().toLocaleString()}`);
        if (!newName) return;
        
        document.getElementById('projectName').value = newName;
        
        // CRITICAL FIX: Clear project ID to force new project
        this.db.currentProjectId = null;
        
        await this.saveProject();
    }
    
    async newProject() {
        if (this.editor.clips.length > 0 && !confirm('Create new project? Current work will be lost.')) {
            return;
        }
        
        this.editor.clearTimeline();
        document.getElementById('projectName').value = '';
        
        // CRITICAL FIX: Clear project ID
        this.db.currentProjectId = null;
        
        this.setProjectStatus('New project');
        this.editor.showStatus('New project created', 'success');
    }
    
    async showProjectManager() {
        this.modal.style.display = 'flex';
        await this.loadProjectsList();
    }
    
    async loadProjectsList() {
        const container = document.getElementById('projectsContainer');
        
        try {
            const projects = await this.db.getAllProjects();
            
            if (projects.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 3rem; margin-bottom: 20px;">📁</div>
                        <h4>No projects saved yet</h4>
                        <p>Save your first project to see it here</p>
                    </div>
                `;
                document.getElementById('projectsCount').textContent = '0';
                return;
            }
            
            let html = '';
            projects.forEach(project => {
                const date = new Date(project.updatedAt);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const clipCount = project.clipCount || 0;
                const duration = this.editor.formatTime(project.duration || 0);
                
                html += `
                    <div class="advanced-project-item" data-id="${project.id}" style="
                        background: var(--secondary-bg);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        border-left: 4px solid var(--accent-color);
                        transition: all 0.2s;
                    ">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div style="flex-shrink: 0;">
                                ${project.thumbnail ? 
                                    `<img src="${project.thumbnail}" alt="Thumbnail" style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px;">` :
                                    `<div style="width: 100px; height: 60px; background: var(--tertiary-bg); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
                                        ${clipCount > 0 ? '🎬' : '📁'}
                                    </div>`
                                }
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <h4 style="margin: 0 0 8px 0; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis;">
                                    ${project.name}
                                </h4>
                                <div style="display: flex; gap: 15px; margin-bottom: 5px;">
                                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                        <strong>${clipCount}</strong> clips
                                    </div>
                                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                                        <strong>${duration}</strong> duration
                                    </div>
                                    ${project.isAutoSave ? '<div style="font-size: 0.8rem; color: var(--track-audio);">Auto-save</div>' : ''}
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                    ${dateStr} ${timeStr}
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px; flex-shrink: 0;">
                                <button class="project-load-btn" data-id="${project.id}" style="
                                    background: var(--accent-color);
                                    color: white;
                                    border: none;
                                    padding: 8px 16px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                    min-width: 80px;
                                ">Load</button>
                                <button class="project-delete-btn" data-id="${project.id}" style="
                                    background: var(--error-color);
                                    color: white;
                                    border: none;
                                    padding: 8px 16px;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                ">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            document.getElementById('projectsCount').textContent = projects.length;
            
        } catch (error) {
            console.error('Load projects error:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--error-color);">
                    <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                    <h4>Error loading projects</h4>
                    <p>Please check browser storage permissions</p>
                </div>
            `;
        }
    }
    
    async loadProject(projectId) {
        console.log('🎯 Loading project:', projectId);
        
        if (this.isLoading) {
            this.editor.showStatus('Please wait...', 'info');
            return;
        }
        
        this.isLoading = true;
        this.setProjectStatus('Loading...');
        
        try {
            if (this.editor.clearTimeline) {
                this.editor.clearTimeline();
            }
            
            const project = await this.db.loadProject(projectId, this.editor);
            
            if (document.getElementById('projectName')) {
                document.getElementById('projectName').value = project.name;
            }
            
            // CRITICAL FIX: Set the current project ID
            this.db.currentProjectId = projectId;
            
            if (this.editor.updateTimeRuler) {
                this.editor.updateTimeRuler();
            }
            
            if (this.editor.updatePreview) {
                this.editor.updatePreview();
            }
            
            if (this.editor.clips) {
                this.editor.clips.forEach(clip => {
                    if (this.editor.updateClipElement) {
                        this.editor.updateClipElement(clip);
                    }
                });
            }
            
            if (this.modal) {
                this.modal.style.display = 'none';
            }
            
            this.setProjectStatus(`Loaded: ${project.name}`);
            this.editor.showStatus(`✅ Loaded project: ${project.name}`, 'success');
            
            return project;
            
        } catch (error) {
            console.error('Load error:', error);
            this.editor.showStatus('❌ Failed to load project', 'error');
            this.setProjectStatus('Load failed');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    async deleteProject(projectId) {
        if (!confirm('Delete this project?')) return;
        
        try {
            await this.db.deleteProject(projectId);
            await this.loadProjectsList();
            this.editor.showStatus('Project deleted', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            this.editor.showStatus('Delete failed', 'error');
        }
    }
    
    async deleteAllProjects() {
        if (!confirm('Delete ALL projects? This cannot be undone!')) return;
        
        try {
            const projects = await this.db.getAllProjects();
            
            for (const project of projects) {
                await this.db.deleteProject(project.id);
            }
            
            await this.loadProjectsList();
            this.editor.showStatus('All projects deleted', 'success');
        } catch (error) {
            console.error('Delete all error:', error);
            this.editor.showStatus('Delete failed', 'error');
        }
    }
    
    filterProjects(searchTerm) {
        const projects = document.querySelectorAll('.advanced-project-item');
        searchTerm = searchTerm.toLowerCase().trim();
        
        projects.forEach(project => {
            const name = project.querySelector('h4').textContent.toLowerCase();
            const isVisible = name.includes(searchTerm) || searchTerm === '';
            project.style.display = isVisible ? 'block' : 'none';
        });
    }
    
    sortProjects(sortBy) {
        const container = document.getElementById('projectsContainer');
        const projects = Array.from(container.querySelectorAll('.advanced-project-item'));
        
        projects.sort((a, b) => {
            const aId = parseInt(a.dataset.id);
            const bId = parseInt(b.dataset.id);
            const aName = a.querySelector('h4').textContent.toLowerCase();
            const bName = b.querySelector('h4').textContent.toLowerCase();
            const aClips = parseInt(a.querySelector('strong').textContent) || 0;
            const bClips = parseInt(b.querySelector('strong').textContent) || 0;
            
            switch(sortBy) {
                case 'newest':
                    return bId - aId;
                case 'oldest':
                    return aId - bId;
                case 'name':
                    return aName.localeCompare(bName);
                case 'clips':
                    return bClips - aClips;
                default:
                    return bId - aId;
            }
        });
        
        projects.forEach(project => container.appendChild(project));
    }
    
    setProjectStatus(text) {
        const statusEl = document.getElementById('projectStatus');
        if (statusEl) {
            statusEl.textContent = text;
        }
    }
}