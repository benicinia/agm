class IndexedDBManager {
    constructor() {
        this.dbName = 'VideoEditorDBX';
        this.version = 1;
        this.db = null;
        
        // Load from localStorage
        const savedId = localStorage.getItem('currentProjectId');
        const savedName = localStorage.getItem('currentProjectName');
        
        this.currentProjectId = savedId && savedId !== 'null' ? savedId : null;
        this.currentProjectName = savedName && savedName !== 'null' ? savedName : null;
        
        console.log('📂 Loaded from localStorage - Project ID:', this.currentProjectId);
    }

    _saveProjectIdToStorage() {
        if (this.currentProjectId) {
            localStorage.setItem('currentProjectId', this.currentProjectId);
            localStorage.setItem('currentProjectName', this.currentProjectName || '');
            console.log('💾 Saved project ID to localStorage:', this.currentProjectId);
        } else {
            localStorage.removeItem('currentProjectId');
            localStorage.removeItem('currentProjectName');
            console.log('🗑️ Cleared project ID from localStorage');
        }
    }

    clearCurrentProject() {
        this.currentProjectId = null;
        this.currentProjectName = null;
        this._saveProjectIdToStorage();
        console.log('🧹 Cleared current project');
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = (e) => {
                console.error('IndexedDB error:', e.target.error);
                reject(e.target.error);
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const oldVersion = e.oldVersion || 0;
                
                // 🔥 PROJECTS STORE - Main project metadata
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    projectStore.createIndex('name', 'name', { unique: false });
                    projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    projectStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // 🔥 CLIPS STORE - Timeline clips data
                if (!db.objectStoreNames.contains('clips')) {
                    const clipStore = db.createObjectStore('clips', {
                        keyPath: ['projectId', 'clipId']
                    });
                    clipStore.createIndex('projectId', 'projectId', { unique: false });
                    clipStore.createIndex('type', 'type', { unique: false });
                }
                
                // 🔥 MEDIA STORE - Media files (images, audio blobs)
                if (!db.objectStoreNames.contains('media')) {
                    const mediaStore = db.createObjectStore('media', {
                        keyPath: ['projectId', 'mediaId']
                    });
                    mediaStore.createIndex('projectId', 'projectId', { unique: false });
                    mediaStore.createIndex('type', 'type', { unique: false });
                }
                
                // 🔥 SETTINGS STORE - Editor settings
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', {
                        keyPath: ['projectId', 'settingKey']
                    });
                    settingsStore.createIndex('projectId', 'projectId', { unique: false });
                }
                
                // 🔥 AUDIO ANALYSIS STORE - Beat detection data
                if (!db.objectStoreNames.contains('audio_analysis')) {
                    const analysisStore = db.createObjectStore('audio_analysis', {
                        keyPath: ['projectId', 'audioId']
                    });
                    analysisStore.createIndex('projectId', 'projectId', { unique: false });
                }
                
                console.log('🔄 Database schema upgraded to version', this.version);
            };
        });
    }

    async _getByCompoundKey(storeName, projectId, audioId = 'main') {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔍 Getting from ${storeName}: projectId=${projectId}, audioId=${audioId}`);
                
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const key = [projectId, audioId];
                const request = store.get(key);
                
                request.onsuccess = () => {
                    console.log(`✅ Got from ${storeName}:`, request.result ? 'Found' : 'Not found');
                    resolve(request.result);
                };
                
                request.onerror = (e) => {
                    console.error(`❌ Error getting from ${storeName}:`, e.target.error);
                    reject(e.target.error);
                };
                
            } catch (error) {
                console.error(`💥 Exception in _getByCompoundKey:`, error);
                reject(error);
            }
        });
    }

    async saveCurrentProject(editor, isAutoSave = false) {
        console.log('🔄 SAVE PROJECT CALLED');
        
        // Ensure database is ready
        if (!this.db) {
            console.log('🔄 Initializing database...');
            await this.init();
        }
        
        if (!this.db) {
            console.error('❌ Database initialization failed completely');
            throw new Error('Database not available');
        }
        
        console.log('✅ Database is ready, proceeding with save...');
        
        try {
            const projectName = document.getElementById('projectName')?.value || 
                               `Project ${new Date().toLocaleDateString()}`;
            const now = new Date().toISOString();
            
            // Generate project ID - use existing if available
            let projectId = this.currentProjectId;
            if (!projectId) {
                projectId = 'project_' + Date.now();
                this.currentProjectId = projectId;
                console.log('🆕 Generated new project ID:', projectId);
            } else {
                console.log('📝 Using existing project ID:', projectId);
            }
            
            // Save to localStorage
            this.currentProjectName = projectName;
            this._saveProjectIdToStorage();
            
            console.log('📝 Saving project:', projectName, 'ID:', projectId);
            
            // Start transaction
            const transaction = this.db.transaction(
                ['projects', 'clips', 'media', 'settings', 'audio_analysis'], 
                'readwrite'
            );
            
            transaction.onerror = (e) => {
                console.error('❌ Transaction error:', e.target.error);
            };
            
            // Save reference to this for use in callbacks
            const self = this;
            
            // 1. Save project metadata
            const projectData = {
                id: projectId,
                name: projectName,
                createdAt: now,
                updatedAt: now,
                clipCount: editor.clips ? editor.clips.length : 0,
                duration: editor.getDuration ? editor.getDuration() : 0,
                isAutoSave: isAutoSave
            };
            
            console.log('💾 Saving project data:', projectData);
            
            const projectsStore = transaction.objectStore('projects');
            projectsStore.put(projectData);
            
            // 2. Save media files FIRST - store file paths instead of blob URLs
            if (editor.mediaLibrary && editor.mediaLibrary.length > 0) {
                console.log(`📷 Saving ${editor.mediaLibrary.length} media items`);
                
                const mediaStore = transaction.objectStore('media');
                
                // Clear existing media for this project
                const clearMediaRequest = mediaStore.index('projectId').openKeyCursor(IDBKeyRange.only(projectId));
                clearMediaRequest.onsuccess = function(e) {
                    const cursor = e.target.result;
                    if (cursor) {
                        mediaStore.delete(cursor.primaryKey);
                        cursor.continue();
                    }
                };
                
                // Save new media items
                editor.mediaLibrary.forEach(media => {
                    // For video/audio files, store the file path instead of blob URL
                    let mediaUrl = media.url;
                    
                    // Check if this is a blob URL (local file)
                    if (media.url && media.url.startsWith('blob:')) {
                        // Get the original filename from the media object
                        const fileName = media.name || 'unknown';
                        
                        // For videos/audio, store path to ./vid/ folder
                        if (media.type === 'video' || media.type === 'audio') {
                            mediaUrl = `./vid/${fileName}`;
                        }
                        // For images, keep as data URL
                    }
                    
                    // Also handle images that might be data URLs
                    if (media.type === 'image' && media.url && media.url.startsWith('data:')) {
                        mediaUrl = media.url; // Keep data URL as is
                    }
                    
                    const mediaData = {
                        projectId: projectId,
                        mediaId: media.id,
                        type: media.type,
                        name: media.name,
                        url: mediaUrl,
                        thumbnail: media.thumbnail,
                        duration: media.duration || 5
                    };
                    
                    console.log('📷 Saving media:', mediaData.name, 'URL:', mediaData.url.substring(0, 50) + '...');
                    mediaStore.put(mediaData);
                });
            } else {
                console.log('⚠️ No media items to save');
            }
            
            // 3. Save clips AFTER media is saved
            if (editor.clips && editor.clips.length > 0) {
                console.log(`💾 Saving ${editor.clips.length} clips`);
                
                const clipsStore = transaction.objectStore('clips');
                
                // Clear existing clips for this project
                const clearRequest = clipsStore.index('projectId').openKeyCursor(IDBKeyRange.only(projectId));
                clearRequest.onsuccess = function(e) {
                    const cursor = e.target.result;
                    if (cursor) {
                        clipsStore.delete(cursor.primaryKey);
                        cursor.continue();
                    }
                };
                
                // Save new clips with proper data
                editor.clips.forEach((clip, index) => {
                    // CRITICAL: Ensure we're saving the current startTime and duration
                    const clipData = {
                        projectId: projectId,
                        clipId: clip.id || `clip_${Date.now()}_${index}`,
                        type: clip.type || 'unknown',
                        startTime: clip.startTime || 0,
                        duration: clip.duration || 5,
                        name: clip.name || 'Clip',
                        track: self._getTrackName(clip.track),
                        data: self._extractClipData(clip, editor)
                    };
                    
                    console.log(`📁 Saving clip: ${clip.name} at ${clipData.startTime}s for ${clipData.duration}s`);
                    clipsStore.put(clipData);
                });
            } else {
                console.log('⚠️ No clips to save');
            }
            
            // 4. Save settings
            const settingsStore = transaction.objectStore('settings');
            const settings = self._collectEditorSettings();
            
            Object.entries(settings).forEach(([key, value]) => {
                const settingData = {
                    projectId: projectId,
                    settingKey: key,
                    value: value,
                    updatedAt: now
                };
                settingsStore.put(settingData);
            });
            
            // 5. Save audio analysis if exists
            if (window.audioAnalysis) {
                const analysisStore = transaction.objectStore('audio_analysis');
                const analysisData = {
                    projectId: projectId,
                    audioId: 'main',
                    bpm: window.audioAnalysis.bpm,
                    beats: window.audioAnalysis.beats || [],
                    duration: window.audioAnalysis.duration || 0,
                    updatedAt: now
                };
                analysisStore.put(analysisData);
            }
            
            // Wait for transaction to complete
            await new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log('✅ Transaction completed successfully');
                    resolve();
                };
                transaction.onerror = (e) => {
                    console.error('❌ Transaction failed:', e.target.error);
                    reject(e.target.error);
                };
            });
            
            this.currentProjectName = projectName;
            console.log('🎉 PROJECT SAVED SUCCESSFULLY:', projectName);
            
            return projectId;
            
        } catch (error) {
            console.error('💥 SAVE FAILED:', error);
            throw error;
        }
    }

    // Add these helper methods:
    _collectEditorSettings() {
        const aspectBtn = document.querySelector('.ratio-btn.active');
        
        return {
            aspectRatio: aspectBtn ? aspectBtn.dataset.ratio : '16/9',
            clipDuration: parseInt(document.getElementById('clipDuration')?.value) || 5,
            snapGrid: parseFloat(document.getElementById('snapGrid')?.value) || 1,
            masterVolume: parseInt(document.getElementById('masterVolume')?.value) || 50,
            beatSyncEnabled: document.getElementById('beatSyncToggle')?.checked || false,
            beatSensitivity: parseInt(document.getElementById('beatSensitivity')?.value) || 70,
            maxDuration: parseInt(document.getElementById('maxDuration')?.value) || 60,
            showBeatNumbers: document.getElementById('showBeatNumbers')?.checked || false,
            vizIntensity: parseInt(document.getElementById('vizIntensitySlider')?.value) || 50,
            timelineZoom: window.videoEditor?.timelineZoom || 10,
            updatedAt: new Date().toISOString()
        };
    }

    _extractClipData(clip, editor) {
        // For text clips
        if (clip.type === 'text') {
            const textData = {
                id: clip.id,
                type: 'text',
                startTime: clip.startTime || 0,
                duration: clip.duration || 3,
                name: clip.name || 'Text Clip',
                text: clip.text || '',
                titleStyle: clip.titleStyle || 'default',
                style: clip.style || null
            };
            console.log('💾 Saving text clip:', textData);
            return textData;
        }
        
        // For media clips (video, image, audio)
        // Find the media item in the library
        const mediaItem = editor.mediaLibrary?.find(m => m.id === clip.mediaId);
        
        let url = clip.url;
        let fileName = clip.name;
        
        // If we have a media item, use its URL (which should be file path or data URL)
        if (mediaItem) {
            url = mediaItem.url;
            fileName = mediaItem.name;
        }
        
        // Check if this is a blob URL and convert to file path
        if (url && url.startsWith('blob:')) {
            // Get the filename from the media item or clip name
            const ext = clip.type === 'video' ? '.mp4' : clip.type === 'audio' ? '.mp3' : '';
            fileName = fileName || clip.name || 'unknown';
            
            // Ensure filename has extension
            if (!fileName.includes('.') && ext) {
                fileName += ext;
            }
            
            // For videos/audio, use file path to ./vid/ folder
            if (clip.type === 'video' || clip.type === 'audio') {
                url = `./vid/${fileName}`;
            }
            // For images, try to convert blob to data URL
            else if (clip.type === 'image' && clip.editedUrl) {
                url = clip.editedUrl; // Use edited image if available
            }
            else if (clip.type === 'image' && clip.url && clip.url.startsWith('blob:')) {
                // For image blobs, we should keep as data URL if possible
                url = clip.url; // Keep blob for now
            }
        }
        
        // Handle data URLs for images
        if (clip.type === 'image' && url && url.startsWith('data:')) {
            // Keep data URL as is
        }
        
        const cleanData = {
            id: clip.id,
            type: clip.type,
            startTime: clip.startTime || 0,
            duration: clip.duration || 5,
            name: clip.name || 'Clip',
            mediaId: clip.mediaId || null,
            url: url,
            fileName: fileName,
            beatSynced: clip.beatSynced || false,
            syncData: clip.syncData || null
        };
        
        console.log('💾 Saving clip data:', cleanData);
        return cleanData;
    }

    _extractFileName(clip) {
        if (clip.type === 'video' || clip.type === 'audio') {
            // Extract filename from URL or path
            if (clip.url) {
                if (clip.url.startsWith('blob:')) {
                    // For blob URLs, use the clip name
                    return clip.name || 'unknown';
                } else if (clip.url.startsWith('./vid/')) {
                    // Already a file path, extract filename
                    const parts = clip.url.split('/');
                    return parts[parts.length - 1];
                }
            }
            return clip.name || 'unknown';
        }
        return null;
    }
 async autoSaveClipToDatabase(clip) {
    // Only save if we have a database and a project
    if (!window.dbManager || !window.dbManager.currentProjectId) return;
    
    try {
        // Create a transaction to update the clip in the database
        const transaction = window.dbManager.db.transaction(['clips'], 'readwrite');
        const store = transaction.objectStore('clips');
        
        // Prepare clip data for database
        const clipData = {
            projectId: window.dbManager.currentProjectId,
            clipId: clip.id,
            type: clip.type,
            startTime: clip.startTime,
            duration: clip.duration,
            name: clip.name,
            track: this._getTrackName(clip.track),
            data: this._extractClipData(clip)
        };
        
        // Update in database
        await new Promise((resolve, reject) => {
            const request = store.put(clipData);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
        
        console.log('💾 Clip updated in database:', clip.name);
        
    } catch (error) {
        console.warn('Failed to auto-save clip to database:', error);
    }
}
    async _restoreMedia(editor, mediaData) {
        try {
            console.log('📁 Restoring media:', mediaData.name, 'Type:', mediaData.type);
            
            // For videos/audio, use file path from database
            if (mediaData.type === 'video' || mediaData.type === 'audio') {
                let mediaUrl = mediaData.url;
                
                // If URL is a blob URL but we have a filename, use file path
                if (mediaUrl && mediaUrl.startsWith('blob:') && mediaData.name) {
                    mediaUrl = `./vid/${mediaData.name}`;
                }
                
                // If URL doesn't start with ./vid/ and it's not a data URL, add it
                if (mediaUrl && !mediaUrl.startsWith('./vid/') && !mediaUrl.startsWith('data:') && mediaData.name) {
                    mediaUrl = `./vid/${mediaData.name}`;
                }
                
                console.log('🔍 Media URL:', mediaUrl);
                
                const mediaItem = {
                    id: mediaData.mediaId || Date.now(),
                    name: mediaData.name,
                    type: mediaData.type,
                    url: mediaUrl,
                    duration: mediaData.duration || 5,
                    isLocalFile: true,
                    filePath: mediaUrl,
                    thumbnail: mediaData.thumbnail || null
                };
                
                // Add to media library
                if (!editor.mediaLibrary) editor.mediaLibrary = [];
                editor.mediaLibrary.push(mediaItem);
                
                // Render in media library if method exists
                if (editor.renderMediaItem) {
                    editor.renderMediaItem(mediaItem);
                }
                
            } else if (mediaData.type === 'image') {
                // Handle images (they should be data URLs)
                console.log('🖼️ Restoring image:', mediaData.name);
                
                // Check if this is a blob URL that should be a data URL
                let imageUrl = mediaData.url;
                if (imageUrl && imageUrl.startsWith('blob:')) {
                    console.warn('⚠️ Image stored as blob URL, will try to load as data URL');
                    // For now, keep as is
                }
                
                const mediaItem = {
                    id: mediaData.mediaId || Date.now(),
                    name: mediaData.name,
                    type: mediaData.type,
                    url: imageUrl,
                    thumbnail: mediaData.thumbnail || imageUrl,
                    duration: mediaData.duration || 5,
                    isLocalFile: false
                };
                
                if (!editor.mediaLibrary) editor.mediaLibrary = [];
                editor.mediaLibrary.push(mediaItem);
                
                if (editor.renderMediaItem) {
                    editor.renderMediaItem(mediaItem);
                }
            }
            
        } catch (error) {
            console.warn('Failed to restore media:', mediaData?.name, error);
        }
    }

    _getTrackName(trackElement) {
        if (!trackElement) return 'videoTrack';
        if (typeof trackElement === 'string') return trackElement;
        
        // Convert DOM element to track name
        if (trackElement.id) return trackElement.id;
        if (trackElement.className && trackElement.className.includes('track')) {
            return trackElement.className.split(' ')[0] || 'videoTrack';
        }
        return 'videoTrack';
    }

    // 🔥 LOAD PROJECT (called from your loadProject method)
    async loadProject(projectId, editor) {
        console.log('🔄 Loading project from IndexedDB:', projectId);
        
        // Ensure database is ready
        if (!this.db) {
            console.log('🔄 Initializing database...');
            await this.init();
        }
        
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        try {
            // 1. Get project metadata
            const project = await new Promise((resolve, reject) => {
                try {
                    const transaction = this.db.transaction(['projects'], 'readonly');
                    const store = transaction.objectStore('projects');
                    const request = store.get(projectId);
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                } catch (error) {
                    reject(error);
                }
            });
            
            if (!project) {
                throw new Error(`Project not found: ${projectId}`);
            }
            
            console.log('✅ Found project:', project.name);
            
            this.currentProjectId = projectId;
            this.currentProjectName = project.name;
            this._saveProjectIdToStorage();
            
            // 2. Clear current editor state
            if (editor.clearTimeline) {
                editor.clearTimeline();
            }
            
            if (editor.mediaGrid) {
                editor.mediaGrid.innerHTML = '';
            }
            
            // Reset media library
            if (editor.mediaLibrary) {
                editor.mediaLibrary = [];
            }
            
            // 3. Load media files FIRST (clips need media to exist)
            let mediaItems = [];
            try {
                mediaItems = await this._getAllByProject('clips', projectId);
                console.log(`📁 Loading ${mediaItems.length} media items`);
                
                for (const mediaData of mediaItems) {
                    await this._restoreMedia(editor, mediaData);
                }
            } catch (error) {
                console.warn('Could not load media:', error);
            }
            
            // 4. Load clips AFTER media is loaded
            let clips = [];
            try {
                clips = await this._getAllByProject('clips', projectId);
                console.log(`📁 Loading ${clips.length} clips`);
                
                for (const clipData of clips) {
                    await this._restoreClip(editor, clipData);
                }
            } catch (error) {
                console.warn('Could not load clips:', error);
            }
            
            // 5. Load settings
            let settings = [];
            try {
                settings = await this._getAllByProject('settings', projectId);
                console.log(`📁 Loading ${settings.length} settings`);
                this._applySettings(editor, settings);
            } catch (error) {
                console.warn('Could not load settings:', error);
            }
            
            // 6. Load audio analysis
            try {
                const analysisItems = await this._getAllByProject('audio_analysis', projectId);
                if (analysisItems && analysisItems.length > 0) {
                    const analysis = analysisItems[0];
                    window.audioAnalysis = {
                        bpm: analysis.bpm,
                        beats: analysis.beats || [],
                        duration: analysis.duration || 0
                    };
                    this._updateAudioAnalysisUI(editor);
                }
            } catch (error) {
                console.warn('No audio analysis found:', error);
            }
            
            // 7. Update project name in UI
            if (document.getElementById('projectName')) {
                document.getElementById('projectName').value = project.name;
            }
            
            // 8. Update timeline UI
            if (editor.updateTimeRuler) {
                editor.updateTimeRuler();
            }
            
            if (editor.updatePreview) {
                editor.updatePreview();
            }
            
            // Force all clip positions to update
            if (editor.clips) {
                editor.clips.forEach(clip => {
                    if (editor.updateClipElement) {
                        editor.updateClipElement(clip);
                    }
                });
            }
            
            console.log(`✅ Successfully loaded project: ${project.name}`);
            return project;
            
        } catch (error) {
            console.error('❌ Load failed:', error);
            throw error;
        }
    }

    async _restoreClip(editor, clipData) {
        console.log('📝 Restoring clip:', clipData);
        
        try {
            const clipInfo = clipData.data || clipData;
            
            // Handle text clips
            if (clipInfo.type === 'text') {
                console.log('📝 Restoring text clip from DB:', clipInfo);
                
                let textContent = '';
                if (clipInfo.text) textContent = clipInfo.text;
                else if (clipInfo.data?.text) textContent = clipInfo.data.text;
                else if (clipInfo.name?.startsWith('Text:')) textContent = clipInfo.name.replace('Text:', '').trim();
                else textContent = 'Text';
                
                console.log('📝 Restored text content:', textContent);
                
                const clip = {
                    id: clipInfo.id || Date.now() + Math.random(),
                    type: 'text',
                    name: clipInfo.name || 'Text Clip',
                    text: textContent,
                    startTime: clipInfo.startTime || 0,
                    duration: clipInfo.duration || 3,
                    track: editor.textTrack,
                    element: null,
                    titleStyle: clipInfo.titleStyle || 'default',
                    style: clipInfo.style || null
                };
                
                editor.clips.push(clip);
                
                if (editor.renderClip) {
                    editor.renderClip(clip);
                }
                
                if (editor.updatePreview) {
                    editor.updatePreview();
                }
                
                console.log('✅ Text clip restored and should display:', clip.text);
                return;
            }
            
            // Handle video clips
            if (clipInfo.type === 'video') {
                let mediaItem = editor.mediaLibrary?.find(m => m.id == clipInfo.mediaId);
                if (!mediaItem && clipInfo.url) {
                    mediaItem = {
                        id: clipInfo.mediaId || Date.now(),
                        name: clipInfo.name || 'Video',
                        type: 'video',
                        url: clipInfo.url,
                        duration: clipInfo.duration || 5
                    };
                    editor.mediaLibrary.push(mediaItem);
                    if (editor.renderMediaItem) editor.renderMediaItem(mediaItem);
                }
                
                if (mediaItem && editor.addClipToTimeline) {
                    editor.addClipToTimeline(mediaItem);
                    const newClip = editor.clips[editor.clips.length - 1];
                    if (newClip) {
                        newClip.startTime = clipInfo.startTime || 0;
                        newClip.duration = clipInfo.duration || 5;
                        if (editor.updateClipElement) editor.updateClipElement(newClip);
                    }
                }
                return;
            }
            
            // Handle image clips
            if (clipInfo.type === 'image') {
                let mediaItem = editor.mediaLibrary?.find(m => m.id == clipInfo.mediaId);
                if (!mediaItem && clipInfo.url) {
                    mediaItem = {
                        id: clipInfo.mediaId || Date.now(),
                        name: clipInfo.name || 'Image',
                        type: 'image',
                        url: clipInfo.url,
                        duration: clipInfo.duration || 5
                    };
                    editor.mediaLibrary.push(mediaItem);
                    if (editor.renderMediaItem) editor.renderMediaItem(mediaItem);
                }
                
                if (mediaItem && editor.addClipToTimeline) {
                    editor.addClipToTimeline(mediaItem);
                    const newClip = editor.clips[editor.clips.length - 1];
                    if (newClip) {
                        newClip.startTime = clipInfo.startTime || 0;
                        newClip.duration = clipInfo.duration || 5;
                        if (editor.updateClipElement) editor.updateClipElement(newClip);
                    }
                }
                return;
            }
            
            // Handle audio clips
            if (clipInfo.type === 'audio') {
                let mediaItem = editor.mediaLibrary?.find(m => m.id == clipInfo.mediaId);
                if (!mediaItem && clipInfo.url) {
                    mediaItem = {
                        id: clipInfo.mediaId || Date.now(),
                        name: clipInfo.name || 'Audio',
                        type: 'audio',
                        url: clipInfo.url,
                        duration: clipInfo.duration || 5
                    };
                    editor.mediaLibrary.push(mediaItem);
                    if (editor.renderMediaItem) editor.renderMediaItem(mediaItem);
                }
                
                if (mediaItem && editor.addClipToTimeline) {
                    editor.addClipToTimeline(mediaItem);
                    const newClip = editor.clips[editor.clips.length - 1];
                    if (newClip) {
                        newClip.startTime = clipInfo.startTime || 0;
                        newClip.duration = clipInfo.duration || 5;
                        if (editor.updateClipElement) editor.updateClipElement(newClip);
                    }
                }
                return;
            }
            
        } catch (error) {
            console.warn('Failed to restore clip:', error);
        }
    }

    // 🔥 GET ALL PROJECTS (for your project manager modal)
    async getAllProjects() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const index = store.index('updatedAt');
            const request = index.getAll();
            
            request.onsuccess = () => {
                const projects = request.result || [];
                // Sort by updatedAt desc (newest first)
                projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                resolve(projects);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // 🔥 DELETE PROJECT (for your delete button)
    async deleteProject(projectId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction([
            'projects', 
            'clips', 
            'media', 
            'settings', 
            'audio_analysis'
        ], 'readwrite');
        
        try {
            // Delete from all stores
            await this._delete(transaction, 'projects', projectId);
            await this._clearProjectClips(projectId);
            await this._clearProjectMedia(projectId);
            await this._clearProjectSettings(projectId);
            await this._clearProjectAnalysis(projectId);
            
            await transaction.complete;
            
            // Clear current project if it's the one being deleted
            if (this.currentProjectId === projectId) {
                this.clearCurrentProject();
            }
            
            console.log(`🗑️ Deleted project: ${projectId}`);
            
        } catch (error) {
            console.error('❌ Delete failed:', error);
            throw error;
        }
    }

    // 🔥 PRIVATE HELPER METHODS
    async _getProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.get(projectId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _put(transaction, storeName, data) {
        return new Promise((resolve, reject) => {
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _get(transaction, storeName, key) {
        return new Promise((resolve, reject) => {
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async _getAllByProject(storeName, projectId) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`🔍 Getting all from ${storeName} for project ${projectId}`);
                
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                // Check if index exists
                if (!store.indexNames.contains('projectId')) {
                    console.warn(`No projectId index in ${storeName}`);
                    resolve([]);
                    return;
                }
                
                const index = store.index('projectId');
                const request = index.getAll(projectId);
                
                request.onsuccess = () => {
                    console.log(`✅ Got ${request.result?.length || 0} items from ${storeName}`);
                    resolve(request.result || []);
                };
                
                request.onerror = (e) => {
                    console.error(`❌ Error getting from ${storeName}:`, e.target.error);
                    reject(e.target.error);
                };
                
            } catch (error) {
                console.error(`💥 Exception in _getAllByProject:`, error);
                reject(error);
            }
        });
    }

    async _delete(transaction, storeName, key) {
        return new Promise((resolve, reject) => {
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async _clearProjectClips(projectId) {
        const clips = await this._getAllByProject('clips', projectId);
        for (const clip of clips) {
            await this._delete(null, 'clips', [projectId, clip.clipId]);
        }
    }

    async _clearProjectMedia(projectId) {
        const media = await this._getAllByProject('media', projectId);
        for (const item of media) {
            await this._delete(null, 'media', [projectId, item.mediaId]);
        }
    }

    async _clearProjectSettings(projectId) {
        const settings = await this._getAllByProject('settings', projectId);
        for (const setting of settings) {
            await this._delete(null, 'settings', [projectId, setting.settingKey]);
        }
    }

    async _clearProjectAnalysis(projectId) {
        const analysis = await this._getAllByProject('audio_analysis', projectId);
        for (const item of analysis) {
            await this._delete(null, 'audio_analysis', [projectId, item.audioId]);
        }
    }

    async _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async _base64ToBlob(base64, mimeType) {
        const response = await fetch(base64);
        return await response.blob();
    }

    _calculateProjectDuration(editor) {
        if (!editor.clips || editor.clips.length === 0) return 0;
        
        let maxEnd = 0;
        editor.clips.forEach(clip => {
            const endTime = (clip.startTime || 0) + (clip.duration || 0);
            if (endTime > maxEnd) maxEnd = endTime;
        });
        
        return maxEnd;
    }

    async _generateThumbnail(editor) {
        // Generate a thumbnail from the first video frame or first image
        try {
            const videoPlayer = editor.videoPlayer || document.getElementById('videoPreview');
            if (videoPlayer && videoPlayer.videoWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoPlayer, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.7);
            }
        } catch (error) {
            console.warn('Could not generate thumbnail:', error);
        }
        return null;
    }

    _applySettings(editor, settingsArray) {
        const settings = {};
        settingsArray.forEach(s => {
            settings[s.settingKey] = s.value;
        });
        
        // Apply settings to UI
        if (settings.aspectRatio) {
            document.querySelectorAll('.ratio-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.ratio === settings.aspectRatio);
            });
        }
        
        const applyValue = (id, value) => {
            const el = document.getElementById(id);
            if (el && value !== undefined) {
                el.value = value;
                if (el.oninput) el.oninput();
                if (el.onchange) el.onchange();
            }
        };
        
        applyValue('clipDuration', settings.clipDuration);
        applyValue('snapGrid', settings.snapGrid);
        applyValue('masterVolume', settings.masterVolume);
        applyValue('beatSensitivity', settings.beatSensitivity);
        applyValue('maxDuration', settings.maxDuration);
        applyValue('vizIntensitySlider', settings.vizIntensity);
        
        if (settings.timelineZoom && editor.updateTimelineZoom) {
            editor.timelineZoom = settings.timelineZoom;
            editor.updateTimelineZoom();
        }
        
        // Checkboxes
        const beatSyncToggle = document.getElementById('beatSyncToggle');
        if (beatSyncToggle && settings.beatSyncEnabled !== undefined) {
            beatSyncToggle.checked = settings.beatSyncEnabled;
        }
        
        const showBeatNumbers = document.getElementById('showBeatNumbers');
        if (showBeatNumbers && settings.showBeatNumbers !== undefined) {
            showBeatNumbers.checked = settings.showBeatNumbers;
        }
    }

    _updateAudioAnalysisUI(editor) {
        if (!editor.audioAnalysis) return;
        
        const infoDiv = document.getElementById('audioAnalysisInfo');
        if (infoDiv) {
            infoDiv.innerHTML = `
                <strong>BPM:</strong> ${editor.audioAnalysis.bpm}<br>
                <strong>Beats:</strong> ${editor.audioAnalysis.beats?.length || 0}<br>
                <strong>Duration:</strong> ${editor.audioAnalysis.duration?.toFixed(1) || 0}s
            `;
        }
    }

    getCurrentProjectId() {
        return this.currentProjectId;
    }

    getCurrentProjectName() {
        return this.currentProjectName;
    }
}