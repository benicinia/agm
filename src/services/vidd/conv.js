// Analysis Results Storage Manager
class AnalysisStorageManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.db = null;
        this.dbName = 'AnalysisResultsDB';
        this.dbVersion = 1;
        store: 'analyses', 'predictions', 'similarityGroups'
        
        this.initDatabase();
        this.addStorageUI();
        this.setupEventListeners();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stores for analysis results
                if (!db.objectStoreNames.contains('analyses')) {
                    const analysisStore = db.createObjectStore('analyses', { keyPath: 'id' });
                    analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
                    analysisStore.createIndex('algorithm', 'algorithm', { unique: false });
                    analysisStore.createIndex('analysisType', 'analysisType', { unique: false });
                }
                
                // Create store for predictions
                if (!db.objectStoreNames.contains('predictions')) {
                    const predictionStore = db.createObjectStore('predictions', { keyPath: 'id' });
                    predictionStore.createIndex('analysisId', 'analysisId', { unique: false });
                    predictionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    predictionStore.createIndex('confidence', 'confidence', { unique: false });
                }
                
                // Create store for similarity groups
                if (!db.objectStoreNames.contains('similarityGroups')) {
                    const groupsStore = db.createObjectStore('similarityGroups', { keyPath: 'id' });
                    groupsStore.createIndex('analysisId', 'analysisId', { unique: false });
                    groupsStore.createIndex('groupId', 'groupId', { unique: false });
                }
                
                // Create store for image hashes
                if (!db.objectStoreNames.contains('imageHashes')) {
                    const hashesStore = db.createObjectStore('imageHashes', { keyPath: ['analysisId', 'imageName'] });
                    hashesStore.createIndex('analysisId', 'analysisId', { unique: false });
                    hashesStore.createIndex('hash', 'hash', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Analysis storage database initialized');
                this.loadSavedAnalysesList();
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    addStorageUI() {
        // Add Storage section to control panel
        const controlPanel = document.querySelector('.control-panel');
        
        const storageSection = document.createElement('div');
        storageSection.className = 'panel-section storage-section';
        storageSection.id = 'storageSection';
        storageSection.innerHTML = `
            <h3><i class="fas fa-database"></i> Analysis Storage 
                <span class="storage-badge" id="savedAnalysesCount">0</span>
            </h3>
            
            <div class="storage-controls">
                <div class="storage-tabs">
                    <button class="storage-tab active" data-storage-tab="saved">
                        <i class="fas fa-save"></i> Saved Analyses
                    </button>
                    <button class="storage-tab" data-storage-tab="templates">
                        <i class="fas fa-clone"></i> Templates
                    </button>
                </div>
                
                <div id="savedAnalysesList" class="saved-analyses-list">
                    <div class="empty-state small">
                        <i class="fas fa-database"></i>
                        <p>No saved analyses</p>
                    </div>
                </div>
                
                <div id="analysisTemplatesList" class="saved-analyses-list" style="display: none;">
                    <div class="empty-state small">
                        <i class="fas fa-clone"></i>
                        <p>No templates saved</p>
                    </div>
                </div>
                
                <div class="storage-actions" id="currentAnalysisActions" style="display: none;">
                    <div class="current-analysis-info">
                        <span id="currentAnalysisName">Current Analysis</span>
                        <span id="currentAnalysisTime"></span>
                    </div>
                    <div class="button-group" style="margin-top: 10px;">
                        <button id="saveAnalysisBtn" class="btn btn-primary btn-small">
                            <i class="fas fa-save"></i> Save Results
                        </button>
                        <button id="saveAsTemplateBtn" class="btn btn-secondary btn-small">
                            <i class="fas fa-clone"></i> Save as Template
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after library section or at beginning
        const librarySection = document.getElementById('librarySection');
        if (librarySection) {
            librarySection.insertAdjacentElement('afterend', storageSection);
        } else {
            controlPanel.insertBefore(storageSection, controlPanel.firstChild);
        }
        
        // Add storage tab to results area
        this.addStorageTab();
        
        // Add custom styles
        this.addStorageStyles();
    }

    addStorageTab() {
        const tabs = document.querySelector('.tabs');
        if (!tabs) return;
        
        // Check if tab already exists
        if (document.querySelector('.tab-btn[data-tab="storage"]')) return;
        
        const storageTab = document.createElement('button');
        storageTab.className = 'tab-btn';
        storageTab.dataset.tab = 'storage';
        storageTab.innerHTML = `
            <i class="fas fa-archive"></i> Analysis Archive
            <span class="tab-badge" id="archiveCount">0</span>
        `;
        tabs.appendChild(storageTab);
        
        // Add storage tab content
        const storageTabContent = document.createElement('div');
        storageTabContent.className = 'tab-content';
        storageTabContent.id = 'storage-tab';
        storageTabContent.innerHTML = `
            <div class="tab-header">
                <h3><i class="fas fa-archive"></i> Analysis Archive</h3>
                <div class="tab-actions">
                    <select id="archiveFilter" class="form-control-small">
                        <option value="all">All Analyses</option>
                        <option value="duplicates">Duplicate Detection</option>
                        <option value="similar">Similar Images</option>
                        <option value="clusters">Clusters</option>
                        <option value="classify">Classification</option>
                        <option value="predict">Predictions</option>
                    </select>
                    <button id="exportArchiveBtn" class="btn-small">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button id="clearArchiveBtn" class="btn-small btn-danger">
                        <i class="fas fa-trash"></i> Clear All
                    </button>
                </div>
            </div>
            
            <div class="archive-container" id="archiveContainer">
                <div class="empty-state">
                    <i class="fas fa-archive"></i>
                    <h4>No Saved Analyses</h4>
                    <p>Save your analysis results to view them here</p>
                    <button id="refreshArchiveBtn" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
        `;
        
        document.querySelector('.results-area').appendChild(storageTabContent);
    }

    addStorageStyles() {
        if (document.getElementById('storage-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'storage-styles';
        style.textContent = `
            .storage-section {
                margin-bottom: 20px;
            }
            
            .storage-badge {
                background: var(--accent-color);
                color: var(--bg-primary);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-left: 8px;
            }
            
            .storage-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 10px;
            }
            
            .storage-tab {
                padding: 6px 12px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 0.85rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .storage-tab.active {
                background: var(--accent-color);
                color: var(--bg-primary);
                border-color: var(--accent-color);
            }
            
            .saved-analyses-list {
                max-height: 200px;
                overflow-y: auto;
                margin-bottom: 15px;
            }
            
            .analysis-item {
                padding: 10px;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                margin-bottom: 8px;
                border: 1px solid var(--border-color);
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .analysis-item:hover {
                background: var(--bg-hover);
                border-color: var(--accent-color);
            }
            
            .analysis-item.active {
                border-color: var(--accent-color);
                background: rgba(79, 195, 247, 0.1);
            }
            
            .analysis-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .analysis-item-name {
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.9rem;
            }
            
            .analysis-item-type {
                font-size: 0.7rem;
                padding: 2px 6px;
                background: var(--accent-color);
                color: var(--bg-primary);
                border-radius: 10px;
            }
            
            .analysis-item-meta {
                display: flex;
                gap: 10px;
                font-size: 0.75rem;
                color: var(--text-secondary);
                margin-bottom: 5px;
            }
            
            .analysis-item-stats {
                display: flex;
                gap: 10px;
                font-size: 0.7rem;
                color: var(--text-secondary);
            }
            
            .analysis-item-actions {
                display: flex;
                gap: 5px;
                margin-top: 8px;
                justify-content: flex-end;
            }
            
            .empty-state.small {
                padding: 20px;
                font-size: 0.9rem;
            }
            
            .empty-state.small i {
                font-size: 1.5rem;
            }
            
            .current-analysis-info {
                padding: 10px;
                background: rgba(76, 175, 80, 0.1);
                border-radius: var(--radius-md);
                border-left: 3px solid var(--success-color);
            }
            
            .archive-container {
                max-height: 600px;
                overflow-y: auto;
            }
            
            .archive-card {
                background: var(--bg-secondary);
                border-radius: var(--radius-lg);
                border: 1px solid var(--border-color);
                margin-bottom: 20px;
                overflow: hidden;
            }
            
            .archive-card-header {
                padding: 15px;
                background: rgba(79, 195, 247, 0.1);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .archive-card-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .archive-card-badge {
                background: var(--accent-color);
                color: var(--bg-primary);
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
                font-weight: 600;
            }
            
            .archive-card-content {
                padding: 15px;
            }
            
            .archive-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .archive-stat {
                background: var(--bg-card);
                padding: 10px;
                border-radius: var(--radius-md);
                text-align: center;
            }
            
            .archive-stat-value {
                font-size: 1.4rem;
                font-weight: 700;
                color: var(--accent-color);
            }
            
            .archive-stat-label {
                font-size: 0.7rem;
                color: var(--text-secondary);
            }
            
            .archive-preview {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 8px;
                margin-top: 10px;
            }
            
            .archive-preview-image {
                width: 100%;
                height: 80px;
                object-fit: cover;
                border-radius: var(--radius-sm);
            }
            
            .archive-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--border-color);
            }
            
            .tab-badge {
                background: var(--danger-color);
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.7rem;
                margin-left: 5px;
            }
            
            .prediction-card {
                background: linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 193, 7, 0.1));
                border-left: 3px solid var(--warning-color);
            }
            
            .confidence-high {
                color: #4CAF50;
            }
            
            .confidence-medium {
                color: #FFC107;
            }
            
            .confidence-low {
                color: #F44336;
            }
            
            .load-analysis-btn {
                background: var(--success-color);
                color: white;
                border: none;
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .load-analysis-btn:hover {
                filter: brightness(1.1);
            }
            
            .delete-analysis-btn {
                background: rgba(244, 67, 54, 0.1);
                color: var(--danger-color);
                border: 1px solid rgba(244, 67, 54, 0.3);
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
                cursor: pointer;
            }
            
            .delete-analysis-btn:hover {
                background: rgba(244, 67, 54, 0.2);
            }
            
            .analysis-progress {
                width: 100%;
                height: 4px;
                background: var(--bg-card);
                border-radius: 2px;
                margin-top: 8px;
            }
            
            .analysis-progress-fill {
                height: 100%;
                background: var(--success-color);
                border-radius: 2px;
                width: 0%;
            }
            
            .analysis-notes {
                margin-top: 8px;
                padding: 8px;
                background: var(--bg-card);
                border-radius: var(--radius-sm);
                font-size: 0.8rem;
                color: var(--text-secondary);
            }
            
            .template-badge {
                background: var(--warning-color);
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        setTimeout(() => {
            // Storage tab toggle
            document.querySelectorAll('.storage-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.storage-tab').forEach(t => t.classList.remove('active'));
                    e.target.closest('.storage-tab').classList.add('active');
                    
                    const tabType = e.target.closest('.storage-tab').dataset.storageTab;
                    document.getElementById('savedAnalysesList').style.display = 
                        tabType === 'saved' ? 'block' : 'none';
                    document.getElementById('analysisTemplatesList').style.display = 
                        tabType === 'templates' ? 'block' : 'none';
                });
            });
            
            // Save analysis button
            const saveBtn = document.getElementById('saveAnalysisBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.saveCurrentAnalysis());
            }
            
            // Save as template button
            const templateBtn = document.getElementById('saveAsTemplateBtn');
            if (templateBtn) {
                templateBtn.addEventListener('click', () => this.saveAsTemplate());
            }
            
            // Archive filter
            const filterSelect = document.getElementById('archiveFilter');
            if (filterSelect) {
                filterSelect.addEventListener('change', () => this.loadArchiveAnalyses());
            }
            
            // Export archive
            const exportBtn = document.getElementById('exportArchiveBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportArchive());
            }
            
            // Clear archive
            const clearBtn = document.getElementById('clearArchiveBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearAllAnalyses());
            }
            
            // Refresh archive
            const refreshBtn = document.getElementById('refreshArchiveBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadArchiveAnalyses());
            }
            
            // Archive tab activation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === 'storage') {
                    btn.addEventListener('click', () => {
                        this.loadArchiveAnalyses();
                    });
                }
            });
            
            // Watch for analysis completion
            this.watchForAnalysis();
            
        }, 200);
    }

    watchForAnalysis() {
        // Monitor for new analysis results
        const originalAnalyze = this.app.analyzeImages;
        if (originalAnalyze) {
            this.app.analyzeImages = async (...args) => {
                await originalAnalyze.apply(this.app, args);
                
                // Show save actions when analysis is complete
                if (this.app.currentAnalysis && this.app.similarityGroups.length > 0) {
                    this.showCurrentAnalysisActions();
                }
            };
        }
        
        // Monitor for prediction completion
        const originalPredict = this.app.predictClasses;
        if (originalPredict) {
            this.app.predictClasses = async (...args) => {
                await originalPredict.apply(this.app, args);
                
                // Show save actions when predictions are complete
                if (this.app.currentPredictions) {
                    this.showCurrentAnalysisActions();
                }
            };
        }
    }

    showCurrentAnalysisActions() {
        const actionsDiv = document.getElementById('currentAnalysisActions');
        const nameSpan = document.getElementById('currentAnalysisName');
        const timeSpan = document.getElementById('currentAnalysisTime');
        
        if (actionsDiv && this.app.currentAnalysis) {
            actionsDiv.style.display = 'block';
            
            const analysisType = this.app.currentAnalysis.analysisType || 'analysis';
            nameSpan.innerHTML = `<i class="fas fa-chart-line"></i> ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Results`;
            
            const now = new Date();
            timeSpan.textContent = now.toLocaleTimeString();
        }
    }

    async saveCurrentAnalysis(isTemplate = false) {
        if (!this.app.currentAnalysis) {
            this.app.showNotification('No analysis results to save', 'warning');
            return;
        }
        
        // Prompt for name
        const name = await this.promptForName(
            isTemplate ? 'Save as Template' : 'Save Analysis Results',
            isTemplate ? 'My Template' : `Analysis ${new Date().toLocaleString()}`
        );
        
        if (!name) return;
        
        const analysisId = `analysis_${Date.now()}`;
        
        // Save analysis metadata
        const analysis = {
            id: analysisId,
            name: name,
            timestamp: Date.now(),
            algorithm: this.app.currentAnalysis.algorithm,
            threshold: this.app.currentAnalysis.threshold,
            analysisType: this.app.currentAnalysis.analysisType,
            useAnnotationBased: this.app.currentAnalysis.useAnnotationBased,
            totalImages: this.app.images.length,
            groupsCount: this.app.similarityGroups.length,
            isTemplate: isTemplate,
            templateCategory: isTemplate ? this.getTemplateCategory() : null,
            notes: isTemplate ? '' : await this.promptForNotes()
        };
        
        // Save predictions if available
        let predictionsSaved = false;
        if (this.app.currentPredictions) {
            const predictionId = `prediction_${Date.now()}`;
            const predictions = {
                id: predictionId,
                analysisId: analysisId,
                timestamp: Date.now(),
                confidenceThreshold: this.app.currentPredictions.confidenceThreshold || 58,
                totalPredictions: this.app.currentPredictions.predictions?.length || 0,
                predictions: this.serializePredictions(this.app.currentPredictions.predictions),
                grouped: this.serializeGroupedPredictions(this.app.currentPredictions.grouped)
            };
            
            analysis.hasPredictions = true;
            analysis.predictionId = predictionId;
            
            await this.saveToStore('predictions', predictions);
            predictionsSaved = true;
        }
        
        // Save similarity groups
        if (this.app.similarityGroups && this.app.similarityGroups.length > 0) {
            await this.saveSimilarityGroups(analysisId, this.app.similarityGroups);
            analysis.hasGroups = true;
        }
        
        // Save image hashes
        if (this.app.currentAnalysis.hashes) {
            await this.saveImageHashes(analysisId, this.app.currentAnalysis.hashes);
            analysis.hashCount = this.app.currentAnalysis.hashes.size;
        }
        
        // Save analysis metadata
        await this.saveToStore('analyses', analysis);
        
        // Refresh lists
        this.loadSavedAnalysesList();
        this.loadArchiveAnalyses();
        
        this.app.showNotification(
            `${isTemplate ? 'Template' : 'Analysis'} "${name}" saved successfully`,
            'success'
        );
        
        // Update badge count
        this.updateStorageBadge();
    }

    async saveAsTemplate() {
        await this.saveCurrentAnalysis(true);
    }

    getTemplateCategory() {
        const analysisType = this.app.currentAnalysis?.analysisType || 'general';
        const categories = {
            'duplicates': 'Duplicate Detection',
            'similar': 'Similarity Search',
            'clusters': 'Clustering',
            'classify': 'Classification',
            'predict': 'Prediction',
            'general': 'General Analysis'
        };
        return categories[analysisType] || 'Custom Template';
    }

    async saveSimilarityGroups(analysisId, groups) {
        const tx = this.db.transaction(['similarityGroups'], 'readwrite');
        const store = tx.objectStore('similarityGroups');
        
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            const groupData = {
                id: `${analysisId}_group_${i}`,
                analysisId: analysisId,
                groupId: i,
                size: group.length,
                images: group.map(img => ({
                    name: img.name,
                    url: img.url,
                    hash: img.hash,
                    distance: img.distance,
                    isAnnotationBased: img.isAnnotationBased,
                    primaryClass: img.primaryClass,
                    hasAnnotations: img.hasAnnotations,
                    annotationCount: img.annotationCount
                }))
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(groupData);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }
    }

    async saveImageHashes(analysisId, hashes) {
        const tx = this.db.transaction(['imageHashes'], 'readwrite');
        const store = tx.objectStore('imageHashes');
        
        const hashArray = Array.from(hashes.entries());
        
        for (const [imageName, data] of hashArray) {
            const hashData = {
                analysisId: analysisId,
                imageName: imageName,
                hash: data.hash,
                isAnnotationBased: data.isAnnotationBased,
                regionCount: data.regionCount || 0,
                primaryClass: data.primaryClass || null
            };
            
            await new Promise((resolve, reject) => {
                const request = store.put(hashData);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }
    }

    serializePredictions(predictions) {
        if (!predictions) return [];
        
        return predictions.map(pred => ({
            imageName: pred.image?.name,
            imageUrl: pred.image?.url,
            predictedClass: pred.prediction?.className,
            confidence: pred.prediction?.confidence || 0,
            distance: pred.distance,
            isWithinThreshold: pred.isWithinThreshold
        }));
    }

    serializeGroupedPredictions(grouped) {
        if (!grouped) return {};
        
        const serialized = {};
        grouped.forEach((preds, className) => {
            serialized[className] = preds.map(pred => ({
                imageName: pred.image?.name,
                confidence: pred.prediction?.confidence || 0
            }));
        });
        
        return serialized;
    }

    saveToStore(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async loadSavedAnalysesList() {
        const listContainer = document.getElementById('savedAnalysesList');
        const templatesContainer = document.getElementById('analysisTemplatesList');
        const badge = document.getElementById('savedAnalysesCount');
        const archiveBadge = document.getElementById('archiveCount');
        
        try {
            const analyses = await this.getAllAnalyses();
            const templates = analyses.filter(a => a.isTemplate);
            const savedAnalyses = analyses.filter(a => !a.isTemplate);
            
            // Update badges
            if (badge) badge.textContent = analyses.length;
            if (archiveBadge) archiveBadge.textContent = analyses.length;
            
            // Display saved analyses
            if (listContainer) {
                if (savedAnalyses.length === 0) {
                    listContainer.innerHTML = `
                        <div class="empty-state small">
                            <i class="fas fa-database"></i>
                            <p>No saved analyses</p>
                        </div>
                    `;
                } else {
                    listContainer.innerHTML = savedAnalyses
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(analysis => this.createAnalysisListItem(analysis))
                        .join('');
                    
                    this.attachAnalysisItemEvents(listContainer);
                }
            }
            
            // Display templates
            if (templatesContainer) {
                if (templates.length === 0) {
                    templatesContainer.innerHTML = `
                        <div class="empty-state small">
                            <i class="fas fa-clone"></i>
                            <p>No templates saved</p>
                        </div>
                    `;
                } else {
                    templatesContainer.innerHTML = templates
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map(analysis => this.createTemplateListItem(analysis))
                        .join('');
                    
                    this.attachTemplateItemEvents(templatesContainer);
                }
            }
            
        } catch (error) {
            console.error('Error loading analyses:', error);
        }
    }

    createAnalysisListItem(analysis) {
        const date = new Date(analysis.timestamp).toLocaleString();
        const type = analysis.analysisType || 'analysis';
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        
        return `
            <div class="analysis-item" data-analysis-id="${analysis.id}">
                <div class="analysis-item-header">
                    <span class="analysis-item-name">
                        <i class="fas fa-chart-bar"></i> ${analysis.name || 'Unnamed Analysis'}
                    </span>
                    <span class="analysis-item-type">${typeLabel}</span>
                </div>
                <div class="analysis-item-meta">
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-cog"></i> ${analysis.algorithm || 'pHash'}</span>
                </div>
                <div class="analysis-item-stats">
                    <span><i class="fas fa-object-group"></i> ${analysis.groupsCount || 0} groups</span>
                    <span><i class="fas fa-hashtag"></i> ${analysis.hashCount || 0} hashes</span>
                    ${analysis.hasPredictions ? 
                        '<span><i class="fas fa-tag" style="color: var(--warning-color);"></i> Predictions</span>' : 
                        ''}
                </div>
                <div class="analysis-item-actions">
                    <button class="load-analysis-btn" data-id="${analysis.id}">
                        <i class="fas fa-folder-open"></i> Load
                    </button>
                    <button class="delete-analysis-btn" data-id="${analysis.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${analysis.notes ? `
                    <div class="analysis-notes">
                        <i class="fas fa-sticky-note"></i> ${analysis.notes}
                    </div>
                ` : ''}
            </div>
        `;
    }

    createTemplateListItem(analysis) {
        const date = new Date(analysis.timestamp).toLocaleDateString();
        const category = analysis.templateCategory || 'General';
        
        return `
            <div class="analysis-item" data-analysis-id="${analysis.id}">
                <div class="analysis-item-header">
                    <span class="analysis-item-name">
                        <i class="fas fa-clone" style="color: var(--warning-color);"></i> ${analysis.name || 'Unnamed Template'}
                    </span>
                    <span class="analysis-item-type template-badge">Template</span>
                </div>
                <div class="analysis-item-meta">
                    <span><i class="fas fa-folder"></i> ${category}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
                <div class="analysis-item-stats">
                    <span><i class="fas fa-cog"></i> ${analysis.algorithm || 'pHash'}</span>
                    <span><i class="fas fa-sliders-h"></i> ${analysis.threshold || 28}</span>
                </div>
                <div class="analysis-item-actions">
                    <button class="load-analysis-btn" data-id="${analysis.id}">
                        <i class="fas fa-play"></i> Apply Template
                    </button>
                    <button class="delete-analysis-btn" data-id="${analysis.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    attachAnalysisItemEvents(container) {
        // Load analysis buttons
        container.querySelectorAll('.load-analysis-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.loadAnalysis(analysisId);
            });
        });
        
        // Delete analysis buttons
        container.querySelectorAll('.delete-analysis-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.deleteAnalysis(analysisId);
            });
        });
        
        // Click on analysis item
        container.querySelectorAll('.analysis-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                if (e.target.closest('button')) return;
                const analysisId = item.dataset.analysisId;
                await this.showAnalysisDetails(analysisId);
            });
        });
    }

    attachTemplateItemEvents(container) {
        container.querySelectorAll('.load-analysis-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.applyTemplate(analysisId);
            });
        });
        
        container.querySelectorAll('.delete-analysis-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.deleteAnalysis(analysisId);
            });
        });
    }

    async loadAnalysis(analysisId) {
        this.app.showNotification('Loading analysis results...', 'info');
        
        try {
            // Get analysis metadata
            const analysis = await this.getFromStore('analyses', analysisId);
            if (!analysis) {
                this.app.showNotification('Analysis not found', 'error');
                return;
            }
            
            // Load similarity groups
            const groups = await this.getSimilarityGroups(analysisId);
            
            // Load predictions if available
            let predictions = null;
            if (analysis.hasPredictions && analysis.predictionId) {
                predictions = await this.getFromStore('predictions', analysis.predictionId);
            }
            
            // Load image hashes
            const hashes = await this.getImageHashes(analysisId);
            
            // Reconstruct current analysis
            this.app.currentAnalysis = {
                algorithm: analysis.algorithm,
                threshold: analysis.threshold,
                analysisType: analysis.analysisType,
                useAnnotationBased: analysis.useAnnotationBased,
                timestamp: analysis.timestamp,
                hashes: this.reconstructHashesMap(hashes)
            };
            
            // Set similarity groups
            this.app.similarityGroups = this.reconstructSimilarityGroups(groups);
            
            // Set predictions
            if (predictions) {
                this.app.currentPredictions = {
                    predictions: this.deserializePredictions(predictions.predictions),
                    grouped: this.deserializeGroupedPredictions(predictions.grouped),
                    confidenceThreshold: predictions.confidenceThreshold
                };
            }
            
            // Update UI
            this.app.displaySimilarityGroups(this.app.similarityGroups);
            this.app.updateHashViewer();
            
            // Update statistics
            document.getElementById('statDuplicates').textContent = this.app.similarityGroups.length;
            document.getElementById('groupCount').textContent = `${this.app.similarityGroups.length} groups found`;
            document.getElementById('thresholdValue').textContent = analysis.threshold;
            document.getElementById('similarityThreshold').value = analysis.threshold;
            document.getElementById('hashingAlgorithm').value = analysis.algorithm;
            document.getElementById('analysisType').value = analysis.analysisType;
            
            // If predictions exist, display them
            if (this.app.currentPredictions) {
                this.app.displayPredictions(this.app.currentPredictions.grouped);
                this.app.addPredictionControls();
            }
            
            // Switch to similarity tab
            document.querySelector('.tab-btn[data-tab="similarity"]').click();
            
            this.app.showNotification(
                `Loaded analysis "${analysis.name || 'Untitled'}" with ${this.app.similarityGroups.length} groups`,
                'success'
            );
            
            // Mark as active in list
            this.markActiveAnalysis(analysisId);
            
        } catch (error) {
            console.error('Error loading analysis:', error);
            this.app.showNotification('Failed to load analysis: ' + error.message, 'error');
        }
    }

    async applyTemplate(templateId) {
        try {
            const template = await this.getFromStore('analyses', templateId);
            if (!template) return;
            
            // Apply template settings
            document.getElementById('hashingAlgorithm').value = template.algorithm || 'pHash';
            document.getElementById('similarityThreshold').value = template.threshold || 28;
            document.getElementById('analysisType').value = template.analysisType || 'similar';
            document.getElementById('thresholdValue').textContent = template.threshold || 28;
            
            // Trigger analysis with template settings
            setTimeout(() => {
                this.app.analyzeImages();
            }, 100);
            
            this.app.showNotification(`Applied template: ${template.name}`, 'success');
            
        } catch (error) {
            console.error('Error applying template:', error);
            this.app.showNotification('Failed to apply template', 'error');
        }
    }

    async loadArchiveAnalyses() {
        const container = document.getElementById('archiveContainer');
        const filter = document.getElementById('archiveFilter')?.value || 'all';
        
        try {
            const analyses = await this.getAllAnalyses();
            
            // Filter analyses
            let filteredAnalyses = analyses;
            if (filter !== 'all') {
                filteredAnalyses = analyses.filter(a => a.analysisType === filter);
            }
            
            // Sort by date (newest first)
            filteredAnalyses.sort((a, b) => b.timestamp - a.timestamp);
            
            if (filteredAnalyses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-archive"></i>
                        <h4>No Analyses Found</h4>
                        <p>${filter !== 'all' ? 'No analyses match the selected filter' : 'Save your first analysis to see it here'}</p>
                        <button id="refreshArchiveBtn" class="btn btn-primary" style="margin-top: 20px;">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                `;
                
                const refreshBtn = document.getElementById('refreshArchiveBtn');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => this.loadArchiveAnalyses());
                }
                return;
            }
            
            container.innerHTML = filteredAnalyses.map(analysis => 
                this.createArchiveCard(analysis)
            ).join('');
            
            this.attachArchiveCardEvents(container);
            
        } catch (error) {
            console.error('Error loading archive:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
                    <h4>Error Loading Archive</h4>
                    <p>${error.message}</p>
                    <button id="refreshArchiveBtn" class="btn btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
            
            const refreshBtn = document.getElementById('refreshArchiveBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadArchiveAnalyses());
            }
        }
    }

    createArchiveCard(analysis) {
        const date = new Date(analysis.timestamp).toLocaleString();
        const type = analysis.analysisType || 'analysis';
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        const isTemplate = analysis.isTemplate;
        
        return `
            <div class="archive-card ${analysis.hasPredictions ? 'prediction-card' : ''}" data-analysis-id="${analysis.id}">
                <div class="archive-card-header">
                    <div class="archive-card-title">
                        <span class="archive-card-badge ${isTemplate ? 'template-badge' : ''}">
                            ${isTemplate ? '📋 Template' : typeLabel}
                        </span>
                        <span style="font-weight: 600;">${analysis.name || 'Unnamed Analysis'}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        <i class="fas fa-calendar"></i> ${date}
                    </div>
                </div>
                
                <div class="archive-card-content">
                    <div class="archive-stats-grid">
                        <div class="archive-stat">
                            <div class="archive-stat-value">${analysis.groupsCount || 0}</div>
                            <div class="archive-stat-label">Groups</div>
                        </div>
                        <div class="archive-stat">
                            <div class="archive-stat-value">${analysis.hashCount || 0}</div>
                            <div class="archive-stat-label">Hashes</div>
                        </div>
                        <div class="archive-stat">
                            <div class="archive-stat-value">${analysis.threshold || 28}</div>
                            <div class="archive-stat-label">Threshold</div>
                        </div>
                        <div class="archive-stat">
                            <div class="archive-stat-value">${analysis.algorithm || 'pHash'}</div>
                            <div class="archive-stat-label">Algorithm</div>
                        </div>
                    </div>
                    
                    ${analysis.hasPredictions ? `
                        <div style="background: rgba(255, 152, 0, 0.1); padding: 10px; border-radius: var(--radius-md); margin-bottom: 15px;">
                            <i class="fas fa-tag" style="color: var(--warning-color);"></i>
                            <strong>Contains Predictions</strong>
                            <span style="margin-left: 10px; font-size: 0.85rem;">Click Load to view prediction results</span>
                        </div>
                    ` : ''}
                    
                    ${analysis.notes ? `
                        <div style="background: var(--bg-card); padding: 10px; border-radius: var(--radius-md); margin-bottom: 15px; font-size: 0.85rem;">
                            <i class="fas fa-sticky-note"></i> ${analysis.notes}
                        </div>
                    ` : ''}
                    
                    <div class="archive-actions">
                        <button class="btn btn-primary load-archive-btn" data-id="${analysis.id}">
                            <i class="fas fa-folder-open"></i> Load Analysis
                        </button>
                        ${isTemplate ? `
                            <button class="btn btn-secondary apply-template-btn" data-id="${analysis.id}">
                                <i class="fas fa-play"></i> Apply Template
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary export-archive-btn" data-id="${analysis.id}">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button class="btn btn-danger delete-archive-btn" data-id="${analysis.id}" style="margin-left: auto;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachArchiveCardEvents(container) {
        // Load buttons
        container.querySelectorAll('.load-archive-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.loadAnalysis(analysisId);
            });
        });
        
        // Apply template buttons
        container.querySelectorAll('.apply-template-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.applyTemplate(analysisId);
            });
        });
        
        // Export buttons
        container.querySelectorAll('.export-archive-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                await this.exportSingleAnalysis(analysisId);
            });
        });
        
        // Delete buttons
        container.querySelectorAll('.delete-archive-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const analysisId = btn.dataset.id;
                if (confirm('Are you sure you want to delete this analysis?')) {
                    await this.deleteAnalysis(analysisId);
                }
            });
        });
    }

    async getSimilarityGroups(analysisId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['similarityGroups'], 'readonly');
            const store = tx.objectStore('similarityGroups');
            const index = store.index('analysisId');
            const request = index.getAll(analysisId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getImageHashes(analysisId) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['imageHashes'], 'readonly');
            const store = tx.objectStore('imageHashes');
            const index = store.index('analysisId');
            const request = index.getAll(analysisId);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getAllAnalyses() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['analyses'], 'readonly');
            const store = tx.objectStore('analyses');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    getFromStore(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }

    reconstructHashesMap(hashData) {
        const map = new Map();
        hashData.forEach(item => {
            map.set(item.imageName, {
                hash: item.hash,
                isAnnotationBased: item.isAnnotationBased,
                regionCount: item.regionCount,
                primaryClass: item.primaryClass
            });
        });
        return map;
    }

    reconstructSimilarityGroups(groupData) {
        return groupData.map(group => group.images);
    }

    deserializePredictions(predictions) {
        if (!predictions) return [];
        
        return predictions.map(pred => ({
            image: {
                name: pred.imageName,
                url: pred.imageUrl
            },
            prediction: pred.predictedClass ? {
                className: pred.predictedClass,
                confidence: pred.confidence
            } : null,
            distance: pred.distance,
            isWithinThreshold: pred.isWithinThreshold
        }));
    }

    deserializeGroupedPredictions(grouped) {
        if (!grouped) return new Map();
        
        const map = new Map();
        Object.entries(grouped).forEach(([className, preds]) => {
            map.set(className, preds.map(pred => ({
                image: { name: pred.imageName },
                prediction: { confidence: pred.confidence }
            })));
        });
        return map;
    }

    async deleteAnalysis(analysisId) {
        try {
            // Delete from all stores
            const tx = this.db.transaction(
                ['analyses', 'similarityGroups', 'imageHashes', 'predictions'],
                'readwrite'
            );
            
            // Delete analysis metadata
            const analysisStore = tx.objectStore('analyses');
            analysisStore.delete(analysisId);
            
            // Delete similarity groups
            const groupsStore = tx.objectStore('similarityGroups');
            const groupsIndex = groupsStore.index('analysisId');
            const groupsRequest = groupsIndex.getAllKeys(analysisId);
            
            groupsRequest.onsuccess = () => {
                groupsRequest.result.forEach(key => {
                    groupsStore.delete(key);
                });
            };
            
            // Delete image hashes
            const hashesStore = tx.objectStore('imageHashes');
            const hashesIndex = hashesStore.index('analysisId');
            const hashesRequest = hashesIndex.getAllKeys(analysisId);
            
            hashesRequest.onsuccess = () => {
                hashesRequest.result.forEach(key => {
                    hashesStore.delete(key);
                });
            };
            
            // Delete predictions
            const predStore = tx.objectStore('predictions');
            const predIndex = predStore.index('analysisId');
            const predRequest = predIndex.getAllKeys(analysisId);
            
            predRequest.onsuccess = () => {
                predRequest.result.forEach(key => {
                    predStore.delete(key);
                });
            };
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = reject;
            });
            
            // Refresh lists
            this.loadSavedAnalysesList();
            this.loadArchiveAnalyses();
            this.updateStorageBadge();
            
            this.app.showNotification('Analysis deleted successfully', 'success');
            
        } catch (error) {
            console.error('Error deleting analysis:', error);
            this.app.showNotification('Failed to delete analysis', 'error');
        }
    }

    async clearAllAnalyses() {
        if (!confirm('Are you sure you want to delete ALL saved analyses and templates? This cannot be undone.')) {
            return;
        }
        
        try {
            const tx = this.db.transaction(
                ['analyses', 'similarityGroups', 'imageHashes', 'predictions'],
                'readwrite'
            );
            
            tx.objectStore('analyses').clear();
            tx.objectStore('similarityGroups').clear();
            tx.objectStore('imageHashes').clear();
            tx.objectStore('predictions').clear();
            
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = reject;
            });
            
            this.loadSavedAnalysesList();
            this.loadArchiveAnalyses();
            this.updateStorageBadge();
            
            this.app.showNotification('All analyses cleared', 'success');
            
        } catch (error) {
            console.error('Error clearing analyses:', error);
            this.app.showNotification('Failed to clear analyses', 'error');
        }
    }

    async showAnalysisDetails(analysisId) {
        const analysis = await this.getFromStore('analyses', analysisId);
        if (!analysis) return;
        
        // Show details in modal
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        const date = new Date(analysis.timestamp).toLocaleString();
        const type = analysis.analysisType || 'analysis';
        
        body.innerHTML = `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 20px;">${analysis.name || 'Analysis Details'}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: var(--radius-md);">
                        <h4 style="margin-bottom: 15px; color: var(--accent-color);">General Information</h4>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Type:</td>
                                <td style="padding: 5px 0;"><strong>${type}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Date:</td>
                                <td style="padding: 5px 0;">${date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Algorithm:</td>
                                <td style="padding: 5px 0;">${analysis.algorithm || 'pHash'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Threshold:</td>
                                <td style="padding: 5px 0;">${analysis.threshold || 28}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: var(--radius-md);">
                        <h4 style="margin-bottom: 15px; color: var(--accent-color);">Results Summary</h4>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Total Groups:</td>
                                <td style="padding: 5px 0;"><strong>${analysis.groupsCount || 0}</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Hashes Calculated:</td>
                                <td style="padding: 5px 0;">${analysis.hashCount || 0}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Has Predictions:</td>
                                <td style="padding: 5px 0;">${analysis.hasPredictions ? '✓ Yes' : '✗ No'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: var(--text-secondary);">Total Images:</td>
                                <td style="padding: 5px 0;">${analysis.totalImages || 0}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                ${analysis.notes ? `
                    <div style="background: var(--bg-card); padding: 15px; border-radius: var(--radius-md); margin-bottom: 20px;">
                        <h4 style="margin-bottom: 10px; color: var(--text-secondary);">Notes</h4>
                        <p>${analysis.notes}</p>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 15px; justify-content: flex-end;">
                    <button class="btn btn-primary" id="modalLoadAnalysis" data-id="${analysis.id}">
                        <i class="fas fa-folder-open"></i> Load Analysis
                    </button>
                    <button class="btn btn-secondary" id="modalExportAnalysis" data-id="${analysis.id}">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-danger" id="modalDeleteAnalysis" data-id="${analysis.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Attach events
        document.getElementById('modalLoadAnalysis').addEventListener('click', async () => {
            modal.style.display = 'none';
            await this.loadAnalysis(analysisId);
        });
        
        document.getElementById('modalExportAnalysis').addEventListener('click', async () => {
            modal.style.display = 'none';
            await this.exportSingleAnalysis(analysisId);
        });
        
        document.getElementById('modalDeleteAnalysis').addEventListener('click', async () => {
            modal.style.display = 'none';
            if (confirm('Delete this analysis?')) {
                await this.deleteAnalysis(analysisId);
            }
        });
    }

    async exportSingleAnalysis(analysisId) {
        try {
            const analysis = await this.getFromStore('analyses', analysisId);
            const groups = await this.getSimilarityGroups(analysisId);
            const hashes = await this.getImageHashes(analysisId);
            
            let predictions = null;
            if (analysis.hasPredictions && analysis.predictionId) {
                predictions = await this.getFromStore('predictions', analysis.predictionId);
            }
            
            const exportData = {
                analysis: analysis,
                groups: groups,
                hashes: hashes,
                predictions: predictions,
                exportedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_${analysisId}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.app.showNotification('Analysis exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting analysis:', error);
            this.app.showNotification('Failed to export analysis', 'error');
        }
    }

    async exportArchive() {
        try {
            const analyses = await this.getAllAnalyses();
            
            const exportData = {
                timestamp: new Date().toISOString(),
                totalAnalyses: analyses.length,
                analyses: analyses,
                version: '1.0'
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_archive_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.app.showNotification(`Exported ${analyses.length} analyses`, 'success');
            
        } catch (error) {
            console.error('Error exporting archive:', error);
            this.app.showNotification('Failed to export archive', 'error');
        }
    }

    async updateStorageBadge() {
        try {
            const analyses = await this.getAllAnalyses();
            const badge = document.getElementById('savedAnalysesCount');
            const archiveBadge = document.getElementById('archiveCount');
            
            if (badge) badge.textContent = analyses.length;
            if (archiveBadge) archiveBadge.textContent = analyses.length;
            
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    markActiveAnalysis(analysisId) {
        // Remove active class from all items
        document.querySelectorAll('.analysis-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current analysis
        const activeItem = document.querySelector(`.analysis-item[data-analysis-id="${analysisId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    promptForName(title, defaultValue) {
        return new Promise((resolve) => {
            const modal = document.getElementById('comparisonModal');
            const body = document.getElementById('comparisonBody');
            
            body.innerHTML = `
                <div style="padding: 30px; text-align: center;">
                    <i class="fas fa-save" style="font-size: 3rem; color: var(--accent-color); margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 20px;">${title}</h3>
                    <input type="text" id="analysisNameInput" class="form-control" 
                           value="${defaultValue}" style="margin-bottom: 20px;" 
                           placeholder="Enter a name for this analysis">
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="saveNameBtn" class="btn btn-primary">
                            <i class="fas fa-check"></i> Save
                        </button>
                        <button id="cancelNameBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
            
            const input = document.getElementById('analysisNameInput');
            input.focus();
            input.select();
            
            document.getElementById('saveNameBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(input.value.trim() || defaultValue);
            });
            
            document.getElementById('cancelNameBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(null);
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('saveNameBtn').click();
                }
            });
        });
    }

    promptForNotes() {
        return new Promise((resolve) => {
            const modal = document.getElementById('comparisonModal');
            const body = document.getElementById('comparisonBody');
            
            body.innerHTML = `
                <div style="padding: 30px;">
                    <i class="fas fa-sticky-note" style="font-size: 2rem; color: var(--accent-color); margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 20px;">Add Notes (Optional)</h3>
                    <textarea id="analysisNotesInput" class="form-control" 
                              rows="4" style="margin-bottom: 20px;" 
                              placeholder="Add notes about this analysis..."></textarea>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="saveNotesBtn" class="btn btn-primary">
                            <i class="fas fa-check"></i> Save
                        </button>
                        <button id="skipNotesBtn" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Skip
                        </button>
                    </div>
                </div>
            `;
            
            modal.style.display = 'flex';
            
            document.getElementById('saveNotesBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                resolve(document.getElementById('analysisNotesInput').value);
            });
            
            document.getElementById('skipNotesBtn').addEventListener('click', () => {
                modal.style.display = 'none';
                resolve('');
            });
        });
    }
}

// Initialize the storage manager after the main app is created
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize
    const checkAppInterval = setInterval(() => {
        if (window.imageAnalysisApp) {
            clearInterval(checkAppInterval);
            
            // Wait for previous managers to initialize
            setTimeout(() => {
                // Add storage manager to the app instance
                window.imageAnalysisApp.storageManager = new AnalysisStorageManager(window.imageAnalysisApp);
            }, 500);
        }
    }, 100);
});

// Image Format Converter Class
class ImageFormatConverter {
    constructor(appInstance) {
        this.app = appInstance;
        this.supportedFormats = ['jpg', 'jpeg', 'webp', 'png'];
        this.conversionQueue = [];
        this.isConverting = false;
        
        this.addConverterUI();
        this.setupEventListeners();
    }

    addConverterUI() {
        // Add converter section to control panel
        const controlPanel = document.querySelector('.control-panel');
        
        const converterSection = document.createElement('div');
        converterSection.className = 'panel-section converter-section';
        converterSection.id = 'converterSection';
        converterSection.innerHTML = `
            <h3><i class="fas fa-exchange-alt"></i> Image Format Converter</h3>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-file-image"></i> Convert Format
                </label>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <select id="conversionSourceFormat" class="form-control-small" style="flex: 1;">
                        <option value="jpg">JPG/JPEG</option>
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                    </select>
                    <span style="color: var(--accent-color); align-self: center;">
                        <i class="fas fa-arrow-right"></i>
                    </span>
                    <select id="conversionTargetFormat" class="form-control-small" style="flex: 1;">
                        <option value="jpg">JPG/JPEG</option>
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-cog"></i> Quality Settings
                    <span class="value-display" id="qualityValue">85</span>
                </label>
                <input type="range" id="conversionQuality" min="10" max="100" value="85" class="slider">
                <div class="slider-labels">
                    <span>Smaller</span>
                    <span>Balanced</span>
                    <span>Better Quality</span>
                </div>
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-check-circle"></i> Conversion Options
                </label>
                <div class="filter-options">
                    <label class="checkbox">
                        <input type="checkbox" id="preserveOriginal" checked>
                        <span>Keep original files</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" id="resizeOnConvert">
                        <span>Resize images (max 1920px)</span>
                    </label>
                    <label class="checkbox">
                        <input type="checkbox" id="convertAnnotatedOnly">
                        <span>Convert annotated images only</span>
                    </label>
                </div>
            </div>
            
            <div class="button-group">
                <button id="convertBtn" class="btn btn-primary">
                    <i class="fas fa-sync-alt"></i> Convert Selected
                </button>
                <button id="batchConvertBtn" class="btn btn-secondary">
                    <i class="fas fa-layer-group"></i> Batch Convert All
                </button>
            </div>
            
            <div id="conversionProgress" style="display: none; margin-top: 15px;">
                <div class="progress-header">
                    <span id="conversionStatus">Preparing conversion...</span>
                    <span id="conversionPercent">0%</span>
                </div>
                <div class="progress-bar">
                    <div id="conversionProgressFill" class="progress-fill" style="width: 0%;"></div>
                </div>
                <div id="conversionStats" style="font-size: 0.85rem; margin-top: 8px; color: var(--text-secondary);">
                    Ready to convert
                </div>
            </div>
        `;
        
        // Insert after the Analysis Controls or at the beginning of control panel
        const firstSection = controlPanel.firstChild;
        if (firstSection) {
            controlPanel.insertBefore(converterSection, firstSection.nextSibling);
        } else {
            controlPanel.appendChild(converterSection);
        }
        
        // Add converter tab to results area
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            const converterTab = document.createElement('button');
            converterTab.className = 'tab-btn';
            converterTab.dataset.tab = 'converter';
            converterTab.innerHTML = `
                <i class="fas fa-exchange-alt"></i> Format Converter
            `;
            tabs.appendChild(converterTab);
            
            // Add converter tab content
            const tabContents = document.querySelectorAll('.tab-content');
            const lastTabContent = tabContents[tabContents.length - 1];
            
            const converterTabContent = document.createElement('div');
            converterTabContent.className = 'tab-content';
            converterTabContent.id = 'converter-tab';
            converterTabContent.innerHTML = `
                <div class="tab-header">
                    <h3><i class="fas fa-file-export"></i> Converted Images</h3>
                    <div class="tab-actions">
                        <span id="convertedCount">0 images converted</span>
                        <button id="downloadAllConvertedBtn" class="btn-small">
                            <i class="fas fa-download"></i> Download All
                        </button>
                        <button id="clearConvertedBtn" class="btn-small">
                            <i class="fas fa-trash"></i> Clear History
                        </button>
                    </div>
                </div>
                <div class="groups-container" id="convertedImagesContainer">
                    <div class="empty-state">
                        <i class="fas fa-images"></i>
                        <h4>No Converted Images</h4>
                        <p>Use the converter to transform images between formats</p>
                    </div>
                </div>
            `;
            
            if (lastTabContent) {
                lastTabContent.parentNode.insertBefore(converterTabContent, lastTabContent.nextSibling);
            } else {
                document.querySelector('.results-area').appendChild(converterTabContent);
            }
        }
        
        // Add custom styles for converter
        this.addConverterStyles();
    }

    addConverterStyles() {
        if (document.getElementById('converter-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'converter-styles';
        style.textContent = `
            .converter-section {
                margin-bottom: 20px;
            }
            
            .converted-badge {
                position: absolute;
                top: 8px;
                left: 8px;
                background: var(--accent-color);
                color: var(--bg-primary);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.8rem;
                font-weight: bold;
                z-index: 2;
            }
            
            .format-tag {
                position: absolute;
                bottom: 8px;
                right: 8px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: bold;
                text-transform: uppercase;
                z-index: 2;
            }
            
            .conversion-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--border-color);
            }
            
            .conversion-item {
                display: flex;
                align-items: center;
                padding: 12px;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                margin-bottom: 10px;
            }
            
            .conversion-preview {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: var(--radius-sm);
                margin-right: 15px;
            }
            
            .conversion-info {
                flex: 1;
            }
            
            .conversion-filename {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }
            
            .conversion-details {
                font-size: 0.8rem;
                color: var(--text-secondary);
            }
            
            .conversion-download-btn {
                padding: 6px 12px;
                background: var(--success-color);
                color: white;
                border: none;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 0.8rem;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .conversion-download-btn:hover {
                filter: brightness(1.1);
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        setTimeout(() => {
            const convertBtn = document.getElementById('convertBtn');
            const batchConvertBtn = document.getElementById('batchConvertBtn');
            const qualitySlider = document.getElementById('conversionQuality');
            const qualityValue = document.getElementById('qualityValue');
            const sourceFormat = document.getElementById('conversionSourceFormat');
            const targetFormat = document.getElementById('conversionTargetFormat');
            
            if (qualitySlider && qualityValue) {
                qualitySlider.addEventListener('input', (e) => {
                    qualityValue.textContent = e.target.value;
                });
            }
            
            if (convertBtn) {
                convertBtn.addEventListener('click', () => this.convertSelected());
            }
            
            if (batchConvertBtn) {
                batchConvertBtn.addEventListener('click', () => this.batchConvertAll());
            }
            
            if (sourceFormat && targetFormat) {
                sourceFormat.addEventListener('change', () => this.validateFormats());
                targetFormat.addEventListener('change', () => this.validateFormats());
            }
            
            // Add converter tab event listener
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === 'converter') {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        e.target.classList.add('active');
                        document.getElementById('converter-tab').classList.add('active');
                        
                        this.refreshConvertedImages();
                    });
                }
            });
            
            // Download all converted button
            const downloadAllBtn = document.getElementById('downloadAllConvertedBtn');
            if (downloadAllBtn) {
                downloadAllBtn.addEventListener('click', () => this.downloadAllConverted());
            }
            
            // Clear converted button
            const clearConvertedBtn = document.getElementById('clearConvertedBtn');
            if (clearConvertedBtn) {
                clearConvertedBtn.addEventListener('click', () => this.clearConvertedHistory());
            }
        }, 100);
    }

    validateFormats() {
        const source = document.getElementById('conversionSourceFormat').value;
        const target = document.getElementById('conversionTargetFormat').value;
        const convertBtn = document.getElementById('convertBtn');
        
        if (source === target) {
            convertBtn.disabled = true;
            convertBtn.title = 'Source and target formats are the same';
            convertBtn.style.opacity = '0.5';
        } else {
            convertBtn.disabled = false;
            convertBtn.title = '';
            convertBtn.style.opacity = '1';
        }
    }

    async convertSelected() {
        const sourceFormat = document.getElementById('conversionSourceFormat').value;
        const targetFormat = document.getElementById('conversionTargetFormat').value;
        const quality = parseInt(document.getElementById('conversionQuality').value);
        const preserveOriginal = document.getElementById('preserveOriginal').checked;
        const resizeEnabled = document.getElementById('resizeOnConvert').checked;
        const convertAnnotatedOnly = document.getElementById('convertAnnotatedOnly').checked;
        
        if (sourceFormat === targetFormat) {
            this.app.showNotification('Source and target formats are the same', 'warning');
            return;
        }
        
        // Filter images to convert
        let imagesToConvert = this.app.images;
        
        if (convertAnnotatedOnly) {
            imagesToConvert = imagesToConvert.filter(img => img.hasAnnotations);
        }
        
        // Filter by source format
        imagesToConvert = imagesToConvert.filter(img => {
            const ext = img.name.split('.').pop().toLowerCase();
            return ext === sourceFormat || (sourceFormat === 'jpg' && ['jpg', 'jpeg'].includes(ext));
        });
        
        if (imagesToConvert.length === 0) {
            this.app.showNotification(`No ${sourceFormat.toUpperCase()} images found to convert`, 'warning');
            return;
        }
        
        this.isConverting = true;
        this.showConversionProgress(true);
        
        try {
            const convertedImages = [];
            
            for (let i = 0; i < imagesToConvert.length; i++) {
                const image = imagesToConvert[i];
                
                this.updateConversionProgress(
                    `Converting ${image.name}... (${i + 1}/${imagesToConvert.length})`,
                    (i / imagesToConvert.length) * 100
                );
                
                try {
                    const result = await this.convertImageFormat(
                        image.url,
                        sourceFormat,
                        targetFormat,
                        quality,
                        resizeEnabled
                    );
                    
                    const convertedImage = {
                        ...result,
                        originalName: image.name,
                        originalUrl: image.url,
                        originalFormat: sourceFormat,
                        targetFormat: targetFormat,
                        timestamp: Date.now(),
                        hasAnnotations: image.hasAnnotations,
                        annotationCount: image.annotationCount
                    };
                    
                    convertedImages.push(convertedImage);
                    this.conversionQueue.push(convertedImage);
                    
                } catch (error) {
                    console.error(`Error converting ${image.name}:`, error);
                }
                
                if (i % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            this.displayConvertedImages(this.conversionQueue);
            this.app.showNotification(
                `Successfully converted ${convertedImages.length} images to ${targetFormat.toUpperCase()}`,
                'success'
            );
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.app.showNotification('Conversion failed: ' + error.message, 'error');
        } finally {
            this.isConverting = false;
            this.showConversionProgress(false);
        }
    }

    async batchConvertAll() {
        const targetFormat = document.getElementById('conversionTargetFormat').value;
        const quality = parseInt(document.getElementById('conversionQuality').value);
        
        // Group images by format
        const formatGroups = {};
        this.app.images.forEach(img => {
            const ext = img.name.split('.').pop().toLowerCase();
            if (ext !== targetFormat && !(targetFormat === 'jpg' && ['jpg', 'jpeg'].includes(ext))) {
                if (!formatGroups[ext]) formatGroups[ext] = [];
                formatGroups[ext].push(img);
            }
        });
        
        const totalToConvert = Object.values(formatGroups).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalToConvert === 0) {
            this.app.showNotification('No images to convert', 'info');
            return;
        }
        
        if (!confirm(`Convert ${totalToConvert} images to ${targetFormat.toUpperCase()}? This may take a while.`)) {
            return;
        }
        
        this.isConverting = true;
        this.showConversionProgress(true);
        
        try {
            let convertedCount = 0;
            
            for (const [sourceFormat, images] of Object.entries(formatGroups)) {
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    
                    this.updateConversionProgress(
                        `Converting ${image.name} (${sourceFormat} → ${targetFormat})... (${convertedCount + 1}/${totalToConvert})`,
                        (convertedCount / totalToConvert) * 100
                    );
                    
                    try {
                        const result = await this.convertImageFormat(
                            image.url,
                            sourceFormat,
                            targetFormat,
                            quality,
                            true // Always resize in batch mode
                        );
                        
                        const convertedImage = {
                            ...result,
                            originalName: image.name,
                            originalUrl: image.url,
                            originalFormat: sourceFormat,
                            targetFormat: targetFormat,
                            timestamp: Date.now(),
                            hasAnnotations: image.hasAnnotations,
                            annotationCount: image.annotationCount
                        };
                        
                        this.conversionQueue.push(convertedImage);
                        convertedCount++;
                        
                    } catch (error) {
                        console.error(`Error converting ${image.name}:`, error);
                    }
                    
                    if (i % 3 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
            }
            
            this.displayConvertedImages(this.conversionQueue);
            this.app.showNotification(
                `Successfully converted ${convertedCount} images to ${targetFormat.toUpperCase()}`,
                'success'
            );
            
        } catch (error) {
            console.error('Batch conversion error:', error);
            this.app.showNotification('Batch conversion failed: ' + error.message, 'error');
        } finally {
            this.isConverting = false;
            this.showConversionProgress(false);
        }
    }

    convertImageFormat(imageUrl, sourceFormat, targetFormat, quality = 85, resizeEnabled = false) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize if enabled
                    if (resizeEnabled) {
                        const maxDimension = 1920;
                        if (width > maxDimension || height > maxDimension) {
                            if (width > height) {
                                height = Math.round(height * (maxDimension / width));
                                width = maxDimension;
                            } else {
                                width = Math.round(width * (maxDimension / height));
                                height = maxDimension;
                            }
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to target format
                    let mimeType;
                    let fileExtension;
                    
                    switch (targetFormat) {
                        case 'jpg':
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            fileExtension = 'jpg';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            fileExtension = 'webp';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            fileExtension = 'png';
                            break;
                        default:
                            mimeType = 'image/jpeg';
                            fileExtension = 'jpg';
                    }
                    
                    const qualityValue = targetFormat === 'png' ? undefined : quality / 100;
                    const dataUrl = canvas.toDataURL(mimeType, qualityValue);
                    
                    // Generate new filename
                    const originalName = imageUrl.split('/').pop() || 'image';
                    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                    const newFilename = `${nameWithoutExt}_converted.${fileExtension}`;
                    
                    // Convert data URL to blob
                    const binaryString = atob(dataUrl.split(',')[1]);
                    const arrayBuffer = new ArrayBuffer(binaryString.length);
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    for (let i = 0; i < binaryString.length; i++) {
                        uint8Array[i] = binaryString.charCodeAt(i);
                    }
                    
                    const blob = new Blob([uint8Array], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    
                    resolve({
                        url: url,
                        blob: blob,
                        dataUrl: dataUrl,
                        filename: newFilename,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        convertedWidth: width,
                        convertedHeight: height,
                        format: targetFormat,
                        size: blob.size
                    });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    displayConvertedImages(convertedImages) {
        const container = document.getElementById('convertedImagesContainer');
        const countElement = document.getElementById('convertedCount');
        
        if (convertedImages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h4>No Converted Images</h4>
                    <p>Use the converter to transform images between formats</p>
                </div>
            `;
            countElement.textContent = '0 images converted';
            return;
        }
        
        countElement.textContent = `${convertedImages.length} image${convertedImages.length === 1 ? '' : 's'} converted`;
        
        container.innerHTML = convertedImages.map((img, index) => `
            <div class="group-card">
                <div class="group-header">
                    <div class="group-title">
                        <span class="group-badge">Converted ${index + 1}</span>
                        <span>${img.targetFormat.toUpperCase()}</span>
                        ${img.hasAnnotations ? '<span class="annotation-indicator">Annotated</span>' : ''}
                    </div>
                    <div class="group-stats">
                        <span><i class="fas fa-arrows-alt"></i> ${img.convertedWidth}x${img.convertedHeight}</span>
                        <span><i class="fas fa-file-size"></i> ${(img.size / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
                <div class="group-images expanded">
                    <div class="image-item">
                        <img src="${img.url}" alt="${img.filename}" class="image-thumbnail">
                        <div class="converted-badge">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="format-tag">${img.targetFormat}</div>
                        <div class="image-info">
                            <span class="image-name">${img.filename}</span>
                            <span class="image-distance">${img.originalFormat} → ${img.targetFormat}</span>
                        </div>
                    </div>
                    <div class="conversion-actions">
                        <button class="conversion-download-btn" data-url="${img.url}" data-filename="${img.filename}">
                            <i class="fas fa-download"></i> Download
                        </button>
                        <button class="btn-small conversion-info-btn" data-index="${index}">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for download buttons
        container.querySelectorAll('.conversion-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                this.downloadConvertedImage(url, filename);
            });
        });
        
        container.querySelectorAll('.conversion-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.showConversionDetails(convertedImages[index]);
            });
        });
    }

    downloadConvertedImage(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.app.showNotification(`Downloaded ${filename}`, 'success');
    }

    downloadAllConverted() {
        if (this.conversionQueue.length === 0) {
            this.app.showNotification('No converted images to download', 'warning');
            return;
        }
        
        // Create a zip file if supported
        if (typeof JSZip !== 'undefined') {
            // Would require including JSZip library
            this.app.showNotification('Batch download requires JSZip library', 'info');
        }
        
        // Fallback: download individually
        this.conversionQueue.forEach(img => {
            setTimeout(() => {
                this.downloadConvertedImage(img.url, img.filename);
            }, 100);
        });
    }

    clearConvertedHistory() {
        // Revoke object URLs to free memory
        this.conversionQueue.forEach(img => {
            URL.revokeObjectURL(img.url);
        });
        
        this.conversionQueue = [];
        this.displayConvertedImages([]);
        this.app.showNotification('Conversion history cleared', 'info');
    }

    refreshConvertedImages() {
        this.displayConvertedImages(this.conversionQueue);
    }

    showConversionDetails(imageData) {
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        const compressionRatio = ((imageData.size / (imageData.originalWidth * imageData.originalHeight * 3)) * 100).toFixed(1);
        const sizeReduction = imageData.originalWidth * imageData.originalHeight * 3 - imageData.size;
        const reductionPercent = ((sizeReduction / (imageData.originalWidth * imageData.originalHeight * 3)) * 100).toFixed(1);
        
        body.innerHTML = `
            <div class="comparison-grid">
                <div class="comparison-image">
                    <h4>Original vs Converted</h4>
                    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                        <div style="flex: 1;">
                            <img src="${imageData.originalUrl}" alt="Original" style="width: 100%; border-radius: 8px;">
                            <p style="margin-top: 10px;"><strong>Original:</strong> ${imageData.originalFormat.toUpperCase()}</p>
                            <p style="font-size: 0.9rem;">${imageData.originalWidth}x${imageData.originalHeight}</p>
                        </div>
                        <div style="flex: 1;">
                            <img src="${imageData.url}" alt="Converted" style="width: 100%; border-radius: 8px;">
                            <p style="margin-top: 10px;"><strong>Converted:</strong> ${imageData.targetFormat.toUpperCase()}</p>
                            <p style="font-size: 0.9rem;">${imageData.convertedWidth}x${imageData.convertedHeight}</p>
                        </div>
                    </div>
                    <div class="comparison-info">
                        <p><strong>File Size:</strong> ${(imageData.size / 1024).toFixed(2)} KB</p>
                        <p><strong>Compression Ratio:</strong> ${compressionRatio}%</p>
                        <p><strong>Size Reduction:</strong> ${reductionPercent}%</p>
                        <p><strong>Quality Setting:</strong> ${document.getElementById('conversionQuality').value}%</p>
                        <div style="margin-top: 20px;">
                            <button class="btn btn-primary conversion-download-btn" 
                                    data-url="${imageData.url}" 
                                    data-filename="${imageData.filename}">
                                <i class="fas fa-download"></i> Download ${imageData.targetFormat.toUpperCase()}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Add download button event listener
        const downloadBtn = body.querySelector('.conversion-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadConvertedImage(imageData.url, imageData.filename);
            });
        }
    }

    showConversionProgress(show) {
        const progressElement = document.getElementById('conversionProgress');
        if (progressElement) {
            progressElement.style.display = show ? 'block' : 'none';
        }
    }

    updateConversionProgress(text, percent) {
        const statusElement = document.getElementById('conversionStatus');
        const percentElement = document.getElementById('conversionPercent');
        const fillElement = document.getElementById('conversionProgressFill');
        const statsElement = document.getElementById('conversionStats');
        
        if (statusElement) statusElement.textContent = text;
        if (percentElement) percentElement.textContent = `${Math.round(percent)}%`;
        if (fillElement) fillElement.style.width = `${percent}%`;
        
        if (statsElement && this.conversionQueue) {
            statsElement.textContent = `Converted: ${this.conversionQueue.length} images • ${(percent).toFixed(0)}% complete`;
        }
    }
}

// Initialize the converter after the main app is created
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize
    const checkAppInterval = setInterval(() => {
        if (window.imageAnalysisApp) {
            clearInterval(checkAppInterval);
            // Add converter to the app instance
            window.imageAnalysisApp.formatConverter = new ImageFormatConverter(window.imageAnalysisApp);
        }
    }, 100);
});


// Image Library and Format Converter Class
class ImageLibraryManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.supportedFormats = ['jpg', 'jpeg', 'webp', 'png', 'gif', 'bmp'];
        this.conversionQueue = [];
        this.isConverting = false;
        this.currentView = 'grid'; // grid or list
        this.selectedImages = new Set();
        this.imageCache = new Map();
        
        this.addLibraryUI();
        this.setupEventListeners();
        this.loadLibraryImages();
    }

    addLibraryUI() {
        // Add Library section to control panel
        const controlPanel = document.querySelector('.control-panel');
        
        // Image Library Section
        const librarySection = document.createElement('div');
        librarySection.className = 'panel-section library-section';
        librarySection.id = 'librarySection';
        librarySection.innerHTML = `
            <h3><i class="fas fa-images"></i> Image Library 
                <span class="library-badge" id="libraryCount">0</span>
            </h3>
            
            <div class="library-controls">
                <div class="library-view-controls">
                    <button class="btn-small view-btn active" data-view="grid">
                        <i class="fas fa-th-large"></i>
                    </button>
                    <button class="btn-small view-btn" data-view="list">
                        <i class="fas fa-list"></i>
                    </button>
                    <button class="btn-small" id="refreshLibraryBtn">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                
                <div class="library-search">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="librarySearch" placeholder="Search images..." class="form-control-small">
                </div>
            </div>
            
            <div class="library-filter-tabs">
                <button class="filter-tab active" data-filter="all">All</button>
                <button class="filter-tab" data-filter="annotated">Annotated</button>
                <button class="filter-tab" data-filter="unannotated">Unannotated</button>
                <button class="filter-tab" data-filter="webp">WebP</button>
                <button class="filter-tab" data-filter="jpg">JPG/JPEG</button>
                <button class="filter-tab" data-filter="png">PNG</button>
            </div>
            
            <div class="library-selection-bar" id="selectionBar" style="display: none;">
                <span id="selectedCount">0 images selected</span>
                <div class="selection-actions">
                    <button id="convertSelectedBtn" class="btn-small">
                        <i class="fas fa-exchange-alt"></i> Convert
                    </button>
                    <button id="findSimilarSelectedBtn" class="btn-small">
                        <i class="fas fa-search"></i> Find Similar
                    </button>
                    <button id="clearSelectionBtn" class="btn-small">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Converter Section
        const converterSection = document.createElement('div');
        converterSection.className = 'panel-section converter-section';
        converterSection.id = 'converterSection';
        converterSection.innerHTML = `
            <h3><i class="fas fa-exchange-alt"></i> Format Converter</h3>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-file-image"></i> Convert To
                </label>
                <div style="display: flex; gap: 10px;">
                    <select id="conversionTargetFormat" class="form-control">
                        <option value="jpg">JPG/JPEG - Best compatibility</option>
                        <option value="webp" selected>WebP - Best compression</option>
                        <option value="png">PNG - Lossless quality</option>
                    </select>
                </div>
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-cog"></i> Quality
                    <span class="value-display" id="qualityValue">85</span>
                </label>
                <input type="range" id="conversionQuality" min="10" max="100" value="85" class="slider">
            </div>
            
            <div class="control-group">
                <label>
                    <i class="fas fa-arrows-alt"></i> Resize Options
                </label>
                <div class="filter-options">
                    <label class="checkbox">
                        <input type="checkbox" id="resizeOnConvert">
                        <span>Resize images</span>
                    </label>
                    <div id="resizeControls" style="display: none; margin-left: 20px;">
                        <select id="resizeDimension" class="form-control-small">
                            <option value="1920">1920px (Full HD)</option>
                            <option value="1280">1280px (HD)</option>
                            <option value="800">800px (Web)</option>
                            <option value="400">400px (Thumbnail)</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="button-group">
                <button id="batchConvertBtn" class="btn btn-primary">
                    <i class="fas fa-layer-group"></i> Batch Convert All
                </button>
                <button id="convertOptionsBtn" class="btn btn-secondary">
                    <i class="fas fa-cog"></i> Advanced Options
                </button>
            </div>
        `;
        
        // Insert sections at the beginning of control panel
        if (controlPanel.firstChild) {
            controlPanel.insertBefore(converterSection, controlPanel.firstChild);
            controlPanel.insertBefore(librarySection, controlPanel.firstChild);
        } else {
            controlPanel.appendChild(librarySection);
            controlPanel.appendChild(converterSection);
        }
        
        // Add Library tab to results area
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            const libraryTab = document.createElement('button');
            libraryTab.className = 'tab-btn';
            libraryTab.dataset.tab = 'library';
            libraryTab.innerHTML = `
                <i class="fas fa-images"></i> Image Library
            `;
            tabs.appendChild(libraryTab);
            
            // Add library tab content
            const tabContents = document.querySelectorAll('.tab-content');
            const lastTabContent = tabContents[tabContents.length - 1];
            
            const libraryTabContent = document.createElement('div');
            libraryTabContent.className = 'tab-content';
            libraryTabContent.id = 'library-tab';
            libraryTabContent.innerHTML = `
                <div class="tab-header">
                    <h3><i class="fas fa-layer-group"></i> Image Library</h3>
                    <div class="tab-actions">
                        <span id="libraryTotalCount">0 images</span>
                        <button id="exportLibraryBtn" class="btn-small">
                            <i class="fas fa-download"></i> Export
                        </button>
                        <button id="clearLibraryCacheBtn" class="btn-small">
                            <i class="fas fa-trash"></i> Clear Cache
                        </button>
                    </div>
                </div>
                
                <div class="library-grid-container" id="libraryGridContainer">
                    <div class="empty-state">
                        <i class="fas fa-images"></i>
                        <h4>Loading Image Library...</h4>
                        <p>Please wait while images are loaded</p>
                    </div>
                </div>
            `;
            
            if (lastTabContent) {
                lastTabContent.parentNode.insertBefore(libraryTabContent, lastTabContent.nextSibling);
            }
        }
        
        // Add Converter Results tab
        const converterTab = document.createElement('button');
        converterTab.className = 'tab-btn';
        converterTab.dataset.tab = 'converter';
        converterTab.innerHTML = `
            <i class="fas fa-exchange-alt"></i> Converted Images
        `;
        document.querySelector('.tabs').appendChild(converterTab);
        
        const converterTabContent = document.createElement('div');
        converterTabContent.className = 'tab-content';
        converterTabContent.id = 'converter-tab';
        converterTabContent.innerHTML = `
            <div class="tab-header">
                <h3><i class="fas fa-file-export"></i> Converted Images</h3>
                <div class="tab-actions">
                    <span id="convertedCount">0 images converted</span>
                    <button id="downloadAllConvertedBtn" class="btn-small">
                        <i class="fas fa-download"></i> Download All
                    </button>
                    <button id="clearConvertedBtn" class="btn-small">
                        <i class="fas fa-trash"></i> Clear History
                    </button>
                </div>
            </div>
            <div class="groups-container" id="convertedImagesContainer">
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h4>No Converted Images</h4>
                    <p>Use the converter to transform images between formats</p>
                </div>
            </div>
        `;
        
        document.querySelector('.results-area').appendChild(converterTabContent);
        
        this.addLibraryStyles();
    }

    addLibraryStyles() {
        if (document.getElementById('library-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'library-styles';
        style.textContent = `
            .library-section {
                margin-bottom: 20px;
            }
            
            .library-badge {
                background: var(--accent-color);
                color: var(--bg-primary);
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-left: 8px;
            }
            
            .library-controls {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .library-view-controls {
                display: flex;
                gap: 5px;
            }
            
            .view-btn {
                padding: 6px 10px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                color: var(--text-secondary);
            }
            
            .view-btn.active {
                background: var(--accent-color);
                color: var(--bg-primary);
                border-color: var(--accent-color);
            }
            
            .library-search {
                position: relative;
                width: 100%;
            }
            
            .search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-secondary);
                font-size: 0.9rem;
            }
            
            #librarySearch {
                width: 100%;
                padding-left: 35px;
            }
            
            .library-filter-tabs {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }
            
            .filter-tab {
                padding: 4px 10px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 0.8rem;
                cursor: pointer;
            }
            
            .filter-tab.active {
                background: var(--accent-color);
                color: var(--bg-primary);
                border-color: var(--accent-color);
            }
            
            .library-selection-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: rgba(79, 195, 247, 0.1);
                border-radius: var(--radius-md);
                margin-top: 10px;
            }
            
            .selection-actions {
                display: flex;
                gap: 8px;
            }
            
            /* Library Grid Styles */
            .library-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
                padding: 10px 0;
            }
            
            .library-grid.list-view {
                grid-template-columns: 1fr;
            }
            
            .library-item {
                position: relative;
                background: var(--bg-secondary);
                border-radius: var(--radius-md);
                border: 2px solid transparent;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .library-item:hover {
                transform: translateY(-2px);
                border-color: var(--accent-color);
                box-shadow: 0 4px 12px var(--shadow-color);
            }
            
            .library-item.selected {
                border-color: var(--success-color);
                background: rgba(76, 175, 80, 0.1);
            }
            
            .library-item-thumbnail {
                width: 100%;
                height: 140px;
                object-fit: cover;
                display: block;
            }
            
            .library-item-info {
                padding: 10px;
            }
            
            .library-item-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .library-item-meta {
                display: flex;
                justify-content: space-between;
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .library-item-badges {
                position: absolute;
                top: 8px;
                left: 8px;
                right: 8px;
                display: flex;
                justify-content: space-between;
                z-index: 2;
            }
            
            .format-badge {
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .annotation-badge {
                background: var(--success-color);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.7rem;
                font-weight: bold;
            }
            
            .library-checkbox {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 20px;
                height: 20px;
                background: white;
                border: 2px solid var(--accent-color);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--bg-primary);
                z-index: 3;
            }
            
            .library-item.selected .library-checkbox {
                background: var(--success-color);
                border-color: var(--success-color);
            }
            
            .library-item.selected .library-checkbox::after {
                content: '✓';
                color: white;
                font-weight: bold;
            }
            
            /* List View Styles */
            .list-view .library-item {
                display: flex;
                align-items: center;
                padding: 10px;
            }
            
            .list-view .library-item-thumbnail {
                width: 60px;
                height: 60px;
                margin-right: 15px;
            }
            
            .list-view .library-item-info {
                flex: 1;
                padding: 0;
            }
            
            .list-view .library-item-badges {
                position: relative;
                top: 0;
                left: 0;
                right: auto;
                margin-bottom: 5px;
            }
            
            /* Quick Actions */
            .quick-actions {
                display: flex;
                gap: 5px;
                margin-top: 8px;
            }
            
            .quick-action-btn {
                padding: 4px 8px;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: 0.7rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .quick-action-btn:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }
            
            /* Conversion Progress */
            .conversion-progress {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                background: var(--bg-card);
                border-radius: var(--radius-lg);
                padding: 15px;
                border: 1px solid var(--border-color);
                box-shadow: 0 4px 12px var(--shadow-color);
                z-index: 1000;
            }
            
            .conversion-item {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .conversion-item-icon {
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-secondary);
                border-radius: 50%;
            }
            
            .conversion-item-details {
                flex: 1;
            }
            
            .conversion-item-name {
                font-size: 0.85rem;
                font-weight: 600;
                margin-bottom: 2px;
            }
            
            .conversion-item-status {
                font-size: 0.7rem;
                color: var(--text-secondary);
            }
            
            /* Similarity Search Results */
            .similarity-match {
                background: rgba(76, 175, 80, 0.1);
                border-left: 3px solid var(--success-color);
            }
            
            .similarity-score {
                font-size: 0.8rem;
                color: var(--success-color);
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        setTimeout(() => {
            // View toggle
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                    e.target.closest('.view-btn').classList.add('active');
                    this.currentView = e.target.closest('.view-btn').dataset.view;
                    this.displayLibraryGrid(this.getFilteredImages());
                });
            });
            
            // Library search
            const searchInput = document.getElementById('librarySearch');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterLibrary(e.target.value);
                });
            }
            
            // Filter tabs
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.addEventListener('click', (e) => {
                    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');
                    this.filterLibraryByType(e.target.dataset.filter);
                });
            });
            
            // Refresh library
            const refreshBtn = document.getElementById('refreshLibraryBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.loadLibraryImages());
            }
            
            // Convert selected
            const convertSelectedBtn = document.getElementById('convertSelectedBtn');
            if (convertSelectedBtn) {
                convertSelectedBtn.addEventListener('click', () => this.convertSelectedImages());
            }
            
            // Find similar from selected
            const findSimilarBtn = document.getElementById('findSimilarSelectedBtn');
            if (findSimilarBtn) {
                findSimilarBtn.addEventListener('click', () => this.findSimilarFromSelection());
            }
            
            // Clear selection
            const clearSelectionBtn = document.getElementById('clearSelectionBtn');
            if (clearSelectionBtn) {
                clearSelectionBtn.addEventListener('click', () => this.clearSelection());
            }
            
            // Batch convert all
            const batchConvertBtn = document.getElementById('batchConvertBtn');
            if (batchConvertBtn) {
                batchConvertBtn.addEventListener('click', () => this.batchConvertAll());
            }
            
            // Resize option toggle
            const resizeCheckbox = document.getElementById('resizeOnConvert');
            if (resizeCheckbox) {
                resizeCheckbox.addEventListener('change', (e) => {
                    const resizeControls = document.getElementById('resizeControls');
                    resizeControls.style.display = e.target.checked ? 'block' : 'none';
                });
            }
            
            // Quality slider
            const qualitySlider = document.getElementById('conversionQuality');
            const qualityValue = document.getElementById('qualityValue');
            if (qualitySlider && qualityValue) {
                qualitySlider.addEventListener('input', (e) => {
                    qualityValue.textContent = e.target.value;
                });
            }
            
            // Library tab activation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                if (btn.dataset.tab === 'library') {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        e.target.classList.add('active');
                        document.getElementById('library-tab').classList.add('active');
                        
                        this.displayLibraryGrid(this.getFilteredImages());
                    });
                }
                
                if (btn.dataset.tab === 'converter') {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        e.target.classList.add('active');
                        document.getElementById('converter-tab').classList.add('active');
                        
                        this.displayConvertedImages();
                    });
                }
            });
            
            // Export library
            const exportBtn = document.getElementById('exportLibraryBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportLibrary());
            }
            
            // Clear cache
            const clearCacheBtn = document.getElementById('clearLibraryCacheBtn');
            if (clearCacheBtn) {
                clearCacheBtn.addEventListener('click', () => this.clearImageCache());
            }
            
            // Download all converted
            const downloadAllBtn = document.getElementById('downloadAllConvertedBtn');
            if (downloadAllBtn) {
                downloadAllBtn.addEventListener('click', () => this.downloadAllConverted());
            }
            
            // Clear converted
            const clearConvertedBtn = document.getElementById('clearConvertedBtn');
            if (clearConvertedBtn) {
                clearConvertedBtn.addEventListener('click', () => this.clearConvertedHistory());
            }
            
        }, 100);
    }

    async loadLibraryImages() {
        if (!this.app.images || this.app.images.length === 0) {
            setTimeout(() => {
                if (this.app.images && this.app.images.length > 0) {
                    this.processLibraryImages();
                }
            }, 500);
            return;
        }
        
        this.processLibraryImages();
    }

    processLibraryImages() {
        const libraryCount = document.getElementById('libraryCount');
        const libraryTotalCount = document.getElementById('libraryTotalCount');
        
        if (libraryCount) {
            libraryCount.textContent = this.app.images.length;
        }
        
        if (libraryTotalCount) {
            libraryTotalCount.textContent = `${this.app.images.length} images`;
        }
        
        this.displayLibraryGrid(this.app.images);
    }

    getFilteredImages() {
        let images = [...this.app.images];
        const activeFilter = document.querySelector('.filter-tab.active')?.dataset.filter || 'all';
        
        switch (activeFilter) {
            case 'annotated':
                images = images.filter(img => img.hasAnnotations);
                break;
            case 'unannotated':
                images = images.filter(img => !img.hasAnnotations);
                break;
            case 'webp':
                images = images.filter(img => img.name.toLowerCase().endsWith('.webp'));
                break;
            case 'jpg':
                images = images.filter(img => 
                    img.name.toLowerCase().endsWith('.jpg') || 
                    img.name.toLowerCase().endsWith('.jpeg')
                );
                break;
            case 'png':
                images = images.filter(img => img.name.toLowerCase().endsWith('.png'));
                break;
        }
        
        const searchTerm = document.getElementById('librarySearch')?.value.toLowerCase();
        if (searchTerm) {
            images = images.filter(img => 
                img.name.toLowerCase().includes(searchTerm) ||
                (img.annotations && img.annotations.some(ann => 
                    ann.class && ann.class.toLowerCase().includes(searchTerm)
                ))
            );
        }
        
        return images;
    }

    displayLibraryGrid(images) {
        const container = document.getElementById('libraryGridContainer');
        if (!container) return;
        
        if (!images || images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h4>No Images Found</h4>
                    <p>No images match your current filters</p>
                </div>
            `;
            return;
        }
        
        const gridClass = this.currentView === 'grid' ? 'library-grid' : 'library-grid list-view';
        
        container.innerHTML = `
            <div class="${gridClass}" id="libraryGrid">
                ${images.map(image => this.createLibraryItemHTML(image)).join('')}
            </div>
        `;
        
        this.attachLibraryItemEvents();
    }

    createLibraryItemHTML(image) {
        const format = image.name.split('.').pop().toLowerCase();
        const isSelected = this.selectedImages.has(image.name);
        const annotations = this.app.annotations[image.name] || [];
        const classNames = [...new Set(annotations.map(a => a.class))].join(', ');
        
        return `
            <div class="library-item ${isSelected ? 'selected' : ''}" data-image-name="${image.name}">
                <div class="library-item-badges">
                    <span class="format-badge">${format}</span>
                    ${image.hasAnnotations ? 
                        `<span class="annotation-badge">
                            <i class="fas fa-tag"></i> ${annotations.length}
                        </span>` : ''
                    }
                </div>
                
                <div class="library-checkbox"></div>
                
                <img src="${image.url}" alt="${image.name}" class="library-item-thumbnail" 
                     onerror="this.src='https://via.placeholder.com/160x140?text=Error'">
                
                <div class="library-item-info">
                    <div class="library-item-name" title="${image.name}">
                        ${image.name.substring(0, 25)}${image.name.length > 25 ? '...' : ''}
                    </div>
                    
                    <div class="library-item-meta">
                        <span>${image.width || '?'}x${image.height || '?'}</span>
                        <span>${this.formatFileSize(image.size || 0)}</span>
                    </div>
                    
                    ${classNames ? `
                        <div style="font-size: 0.7rem; color: var(--accent-color); margin-top: 4px;">
                            <i class="fas fa-tags"></i> ${classNames}
                        </div>
                    ` : ''}
                    
                    <div class="quick-actions">
                        <button class="quick-action-btn convert-quick" title="Convert format">
                            <i class="fas fa-exchange-alt"></i> Convert
                        </button>
                        <button class="quick-action-btn find-similar-quick" title="Find similar images">
                            <i class="fas fa-search"></i> Similar
                        </button>
                        <button class="quick-action-btn view-details" title="View details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachLibraryItemEvents() {
        // Item selection
        document.querySelectorAll('.library-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.quick-action-btn')) return;
                
                const imageName = item.dataset.imageName;
                this.toggleImageSelection(imageName, item);
            });
        });
        
        // Convert quick action
        document.querySelectorAll('.convert-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.library-item');
                const imageName = item.dataset.imageName;
                const image = this.app.images.find(img => img.name === imageName);
                if (image) {
                    this.showConversionDialog(image);
                }
            });
        });
        
        // Find similar quick action
        document.querySelectorAll('.find-similar-quick').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.library-item');
                const imageName = item.dataset.imageName;
                this.findSimilarImages(imageName);
            });
        });
        
        // View details
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.library-item');
                const imageName = item.dataset.imageName;
                this.showImageDetails(imageName);
            });
        });
    }

    toggleImageSelection(imageName, element) {
        if (this.selectedImages.has(imageName)) {
            this.selectedImages.delete(imageName);
            element.classList.remove('selected');
        } else {
            this.selectedImages.add(imageName);
            element.classList.add('selected');
        }
        
        this.updateSelectionBar();
    }

    updateSelectionBar() {
        const selectionBar = document.getElementById('selectionBar');
        const selectedCount = document.getElementById('selectedCount');
        
        if (this.selectedImages.size > 0) {
            selectionBar.style.display = 'flex';
            selectedCount.textContent = `${this.selectedImages.size} image${this.selectedImages.size === 1 ? '' : 's'} selected`;
        } else {
            selectionBar.style.display = 'none';
        }
    }

    clearSelection() {
        this.selectedImages.clear();
        document.querySelectorAll('.library-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        this.updateSelectionBar();
    }

    filterLibrary(searchTerm) {
        const filteredImages = this.getFilteredImages();
        this.displayLibraryGrid(filteredImages);
    }

    filterLibraryByType(filterType) {
        const filteredImages = this.getFilteredImages();
        this.displayLibraryGrid(filteredImages);
    }

    async convertSelectedImages() {
        if (this.selectedImages.size === 0) {
            this.app.showNotification('No images selected', 'warning');
            return;
        }
        
        const targetFormat = document.getElementById('conversionTargetFormat').value;
        const quality = parseInt(document.getElementById('conversionQuality').value);
        const resizeEnabled = document.getElementById('resizeOnConvert').checked;
        const resizeDimension = resizeEnabled ? 
            parseInt(document.getElementById('resizeDimension').value) : null;
        
        const imagesToConvert = this.app.images.filter(img => 
            this.selectedImages.has(img.name)
        );
        
        await this.performConversion(imagesToConvert, targetFormat, quality, resizeDimension);
        this.clearSelection();
    }

    async batchConvertAll() {
        const targetFormat = document.getElementById('conversionTargetFormat').value;
        const quality = parseInt(document.getElementById('conversionQuality').value);
        const resizeEnabled = document.getElementById('resizeOnConvert').checked;
        const resizeDimension = resizeEnabled ? 
            parseInt(document.getElementById('resizeDimension').value) : null;
        
        const imagesToConvert = this.app.images.filter(img => {
            const ext = img.name.split('.').pop().toLowerCase();
            return ext !== targetFormat && 
                   !(targetFormat === 'jpg' && ['jpg', 'jpeg'].includes(ext));
        });
        
        if (imagesToConvert.length === 0) {
            this.app.showNotification('No images to convert', 'info');
            return;
        }
        
        if (!confirm(`Convert ${imagesToConvert.length} images to ${targetFormat.toUpperCase()}?`)) {
            return;
        }
        
        await this.performConversion(imagesToConvert, targetFormat, quality, resizeDimension);
    }

    async performConversion(images, targetFormat, quality, resizeDimension = null) {
        this.isConverting = true;
        this.showConversionProgress(true);
        
        try {
            let convertedCount = 0;
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                
                this.updateConversionProgress(
                    `Converting ${image.name}... (${i + 1}/${images.length})`,
                    (i / images.length) * 100
                );
                
                try {
                    const result = await this.convertImageFormat(
                        image.url,
                        targetFormat,
                        quality,
                        resizeDimension
                    );
                    
                    const convertedImage = {
                        ...result,
                        originalName: image.name,
                        originalUrl: image.url,
                        originalFormat: image.name.split('.').pop().toLowerCase(),
                        targetFormat: targetFormat,
                        timestamp: Date.now(),
                        hasAnnotations: image.hasAnnotations,
                        annotationCount: image.annotationCount,
                        annotations: this.app.annotations[image.name]
                    };
                    
                    this.conversionQueue.push(convertedImage);
                    convertedCount++;
                    
                    // Cache the converted image
                    this.imageCache.set(`${image.name}_${targetFormat}`, convertedImage);
                    
                } catch (error) {
                    console.error(`Error converting ${image.name}:`, error);
                    this.app.showNotification(`Failed to convert ${image.name}`, 'error');
                }
                
                // Allow UI to update
                if (i % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            this.displayConvertedImages();
            this.app.showNotification(
                `Successfully converted ${convertedCount} images to ${targetFormat.toUpperCase()}`,
                'success'
            );
            
        } catch (error) {
            console.error('Conversion error:', error);
            this.app.showNotification('Conversion failed: ' + error.message, 'error');
        } finally {
            this.isConverting = false;
            this.showConversionProgress(false);
        }
    }

    convertImageFormat(imageUrl, targetFormat, quality = 85, maxDimension = null) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Resize if max dimension specified
                    if (maxDimension) {
                        if (width > height && width > maxDimension) {
                            height = Math.round(height * (maxDimension / width));
                            width = maxDimension;
                        } else if (height > maxDimension) {
                            width = Math.round(width * (maxDimension / height));
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Apply sharpening for better quality when downscaling
                    if (maxDimension && (width < img.width || height < img.height)) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                    }
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    let mimeType;
                    let fileExtension;
                    
                    switch (targetFormat) {
                        case 'jpg':
                        case 'jpeg':
                            mimeType = 'image/jpeg';
                            fileExtension = 'jpg';
                            break;
                        case 'webp':
                            mimeType = 'image/webp';
                            fileExtension = 'webp';
                            break;
                        case 'png':
                            mimeType = 'image/png';
                            fileExtension = 'png';
                            break;
                        default:
                            mimeType = 'image/jpeg';
                            fileExtension = 'jpg';
                    }
                    
                    const qualityValue = targetFormat === 'png' ? undefined : quality / 100;
                    const dataUrl = canvas.toDataURL(mimeType, qualityValue);
                    
                    // Generate filename
                    const originalName = imageUrl.split('/').pop() || 'image';
                    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                    const timestamp = Date.now();
                    const newFilename = `${nameWithoutExt}_${timestamp}.${fileExtension}`;
                    
                    // Convert to blob
                    const binaryString = atob(dataUrl.split(',')[1]);
                    const arrayBuffer = new ArrayBuffer(binaryString.length);
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    for (let i = 0; i < binaryString.length; i++) {
                        uint8Array[i] = binaryString.charCodeAt(i);
                    }
                    
                    const blob = new Blob([uint8Array], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    
                    resolve({
                        url: url,
                        blob: blob,
                        dataUrl: dataUrl,
                        filename: newFilename,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        convertedWidth: width,
                        convertedHeight: height,
                        format: targetFormat,
                        size: blob.size,
                        mimeType: mimeType
                    });
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    async findSimilarImages(imageName) {
        const sourceImage = this.app.images.find(img => img.name === imageName);
        if (!sourceImage) return;
        
        this.app.showNotification(`Finding similar images to ${sourceImage.name}...`, 'info');
        
        // Calculate hash for source image if not already calculated
        let sourceHash;
        if (this.app.currentAnalysis?.hashes?.has(sourceImage.name)) {
            sourceHash = this.app.currentAnalysis.hashes.get(sourceImage.name).hash;
        } else {
            sourceHash = await ImageAnalysisApp.calculateHash(sourceImage.url, 'pHash', false);
        }
        
        // Calculate hashes for all other images
        const similarImages = [];
        const threshold = parseInt(document.getElementById('similarityThreshold')?.value || 28);
        
        for (const image of this.app.images) {
            if (image.name === sourceImage.name) continue;
            
            let targetHash;
            if (this.app.currentAnalysis?.hashes?.has(image.name)) {
                targetHash = this.app.currentAnalysis.hashes.get(image.name).hash;
            } else {
                targetHash = await ImageAnalysisApp.calculateHash(image.url, 'pHash', false);
            }
            
            const distance = ImageAnalysisApp.hammingDistance(sourceHash, targetHash);
            
            if (distance <= threshold) {
                similarImages.push({
                    ...image,
                    similarity: ((64 - distance) / 64 * 100).toFixed(1),
                    distance: distance
                });
            }
        }
        
        // Sort by similarity (closest first)
        similarImages.sort((a, b) => a.distance - b.distance);
        
        // Display results
        this.displaySimilarityResults(sourceImage, similarImages);
    }

    async findSimilarFromSelection() {
        if (this.selectedImages.size === 0) {
            this.app.showNotification('No images selected', 'warning');
            return;
        }
        
        const selectedImage = this.app.images.find(img => 
            img.name === Array.from(this.selectedImages)[0]
        );
        
        if (selectedImage) {
            await this.findSimilarImages(selectedImage.name);
            this.clearSelection();
        }
    }

    displaySimilarityResults(sourceImage, similarImages) {
        const container = document.getElementById('groupsContainer');
        
        if (similarImages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h4>No Similar Images Found</h4>
                    <p>No images similar to "${sourceImage.name}" were found</p>
                    <button class="btn btn-secondary" style="margin-top: 20px;" onclick="document.querySelector('.tab-btn[data-tab=\\'similarity\\']').click()">
                        <i class="fas fa-sliders-h"></i> Adjust Threshold
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="group-card expanded similarity-match">
                <div class="group-header">
                    <div class="group-title">
                        <span class="group-badge">Source Image</span>
                        <span>${sourceImage.name}</span>
                    </div>
                    <div class="group-stats">
                        <span><i class="fas fa-ruler-combined"></i> Reference</span>
                    </div>
                </div>
                <div class="group-images expanded">
                    <div class="image-item">
                        <img src="${sourceImage.url}" alt="${sourceImage.name}" class="image-thumbnail">
                        <div class="image-info">
                            <span class="image-name">${sourceImage.name}</span>
                            <span class="image-distance">Reference</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="group-card expanded">
                <div class="group-header">
                    <div class="group-title">
                        <span class="group-badge">Similar Images</span>
                        <span>${similarImages.length} found</span>
                    </div>
                    <div class="group-stats">
                        <span><i class="fas fa-chart-line"></i> Similarity Score</span>
                    </div>
                </div>
                <div class="group-images expanded">
                    ${similarImages.map((img, index) => `
                        <div class="image-item" onclick="window.imageAnalysisApp.formatConverter.showImageComparison('${img.name}', '${sourceImage.name}')">
                            <img src="${img.url}" alt="${img.name}" class="image-thumbnail">
                            <div class="image-info">
                                <span class="image-name">${index + 1}. ${img.name.substring(0, 15)}...</span>
                                <span class="image-distance similarity-score">
                                    ${img.similarity}% match
                                </span>
                            </div>
                            <div class="format-tag" style="background: var(--success-color);">
                                ${img.distance} distance
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Switch to similarity tab
        document.querySelector('.tab-btn[data-tab="similarity"]').click();
    }

    showImageComparison(imageName1, imageName2) {
        const image1 = this.app.images.find(img => img.name === imageName1);
        const image2 = this.app.images.find(img => img.name === imageName2);
        
        if (!image1 || !image2) return;
        
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        // Calculate hash distance
        let distance = 0;
        if (this.app.currentAnalysis?.hashes) {
            const hash1 = this.app.currentAnalysis.hashes.get(image1.name)?.hash;
            const hash2 = this.app.currentAnalysis.hashes.get(image2.name)?.hash;
            if (hash1 && hash2) {
                distance = ImageAnalysisApp.hammingDistance(hash1, hash2);
            }
        }
        
        const similarity = ((64 - distance) / 64 * 100).toFixed(1);
        
        body.innerHTML = `
            <div class="comparison-grid">
                <div class="comparison-image">
                    <img src="${image1.url}" alt="${image1.name}">
                    <h4>${image1.name}</h4>
                    <div class="comparison-info">
                        <p><strong>Format:</strong> ${image1.name.split('.').pop()}</p>
                        ${image1.hasAnnotations ? '<p><span class="annotation-badge">Annotated</span></p>' : ''}
                    </div>
                </div>
                <div class="comparison-image">
                    <img src="${image2.url}" alt="${image2.name}">
                    <h4>${image2.name}</h4>
                    <div class="comparison-info">
                        <p><strong>Format:</strong> ${image2.name.split('.').pop()}</p>
                        ${image2.hasAnnotations ? '<p><span class="annotation-badge">Annotated</span></p>' : ''}
                    </div>
                </div>
            </div>
            <div class="comparison-info" style="margin-top: 20px;">
                <h4>Similarity Analysis</h4>
                <p><strong>Hamming Distance:</strong> ${distance}</p>
                <p><strong>Similarity:</strong> ${similarity}%</p>
                <div class="similarity-meter" style="position: relative; height: 20px; margin-top: 10px;">
                    <div class="similarity-pointer" style="left: ${(distance / 64) * 100}%"></div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    showConversionDialog(image) {
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        body.innerHTML = `
            <div style="padding: 20px;">
                <h4 style="margin-bottom: 20px;">Convert Image Format</h4>
                <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                    <div style="flex: 1;">
                        <img src="${image.url}" alt="${image.name}" style="width: 100%; border-radius: 8px;">
                        <p style="margin-top: 10px;"><strong>Original:</strong> ${image.name.split('.').pop().toUpperCase()}</p>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                        <i class="fas fa-arrow-right" style="font-size: 2rem; color: var(--accent-color); align-self: center;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px;">
                            <label style="display: block; margin-bottom: 10px;">Convert to:</label>
                            <select id="singleConversionFormat" class="form-control" style="margin-bottom: 15px;">
                                <option value="jpg">JPG/JPEG</option>
                                <option value="webp" selected>WebP</option>
                                <option value="png">PNG</option>
                            </select>
                            
                            <label style="display: block; margin-bottom: 10px;">Quality:</label>
                            <input type="range" id="singleConversionQuality" min="10" max="100" value="85" class="slider" style="margin-bottom: 5px;">
                            <span id="singleQualityValue" style="display: block; text-align: right; font-size: 0.9rem; color: var(--accent-color);">85%</span>
                            
                            <button id="executeSingleConversion" class="btn btn-primary" style="margin-top: 20px; width: 100%;">
                                <i class="fas fa-exchange-alt"></i> Convert
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Setup quality slider
        const qualitySlider = document.getElementById('singleConversionQuality');
        const qualityValue = document.getElementById('singleQualityValue');
        
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = `${e.target.value}%`;
            });
        }
        
        // Setup convert button
        const convertBtn = document.getElementById('executeSingleConversion');
        if (convertBtn) {
            convertBtn.addEventListener('click', async () => {
                const targetFormat = document.getElementById('singleConversionFormat').value;
                const quality = parseInt(document.getElementById('singleConversionQuality').value);
                
                modal.style.display = 'none';
                
                await this.performConversion([image], targetFormat, quality);
            });
        }
    }

    showImageDetails(imageName) {
        const image = this.app.images.find(img => img.name === imageName);
        if (!image) return;
        
        const annotations = this.app.annotations[imageName] || [];
        
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        body.innerHTML = `
            <div style="display: flex; gap: 30px;">
                <div style="flex: 1;">
                    <img src="${image.url}" alt="${image.name}" style="width: 100%; border-radius: 8px;">
                </div>
                <div style="flex: 1;">
                    <h4 style="margin-bottom: 15px;">Image Details</h4>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: var(--text-secondary);">Filename:</td>
                            <td style="padding: 8px 0; font-weight: 600;">${image.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: var(--text-secondary);">Format:</td>
                            <td style="padding: 8px 0;"><span class="format-badge">${image.name.split('.').pop()}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: var(--text-secondary);">Dimensions:</td>
                            <td style="padding: 8px 0;">${image.width || '?'} x ${image.height || '?'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: var(--text-secondary);">File Size:</td>
                            <td style="padding: 8px 0;">${this.formatFileSize(image.size || 0)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: var(--text-secondary);">Annotations:</td>
                            <td style="padding: 8px 0;">${annotations.length}</td>
                        </tr>
                    </table>
                    
                    ${annotations.length > 0 ? `
                        <h4 style="margin: 20px 0 10px;">Annotations</h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${annotations.map(ann => `
                                <div style="padding: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 5px;">
                                    <strong style="color: var(--accent-color);">${ann.class}</strong>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                        [x:${ann.x.toFixed(1)}, y:${ann.y.toFixed(1)}, w:${ann.width.toFixed(1)}, h:${ann.height.toFixed(1)}]
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-primary" onclick="window.imageAnalysisApp.formatConverter.findSimilarImages('${image.name}')">
                            <i class="fas fa-search"></i> Find Similar
                        </button>
                        <button class="btn btn-secondary" onclick="window.imageAnalysisApp.formatConverter.showConversionDialog(${JSON.stringify(image)})">
                            <i class="fas fa-exchange-alt"></i> Convert
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }

    displayConvertedImages() {
        const container = document.getElementById('convertedImagesContainer');
        const countElement = document.getElementById('convertedCount');
        
        if (this.conversionQueue.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h4>No Converted Images</h4>
                    <p>Use the converter to transform images between formats</p>
                </div>
            `;
            if (countElement) countElement.textContent = '0 images converted';
            return;
        }
        
        if (countElement) {
            countElement.textContent = `${this.conversionQueue.length} image${this.conversionQueue.length === 1 ? '' : 's'} converted`;
        }
        
        // Group by date
        const grouped = this.groupConversionsByDate();
        
        container.innerHTML = Object.entries(grouped).map(([date, conversions]) => `
            <div class="group-card">
                <div class="group-header">
                    <div class="group-title">
                        <span class="group-badge">${date}</span>
                        <span>${conversions.length} conversion${conversions.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="group-stats">
                        <span><i class="fas fa-database"></i> ${this.formatTotalSize(conversions)}</span>
                        <span><i class="fas fa-chevron-down"></i></span>
                    </div>
                </div>
                <div class="group-images expanded">
                    ${conversions.map((img, index) => `
                        <div class="image-item">
                            <img src="${img.url}" alt="${img.filename}" class="image-thumbnail">
                            <div class="converted-badge">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <div class="format-tag">${img.format}</div>
                            <div class="image-info">
                                <span class="image-name">${img.filename}</span>
                                <span class="image-distance">${(img.size / 1024).toFixed(1)} KB</span>
                            </div>
                            <div class="quick-actions" style="position: absolute; bottom: 45px; left: 8px; right: 8px;">
                                <button class="quick-action-btn download-btn" style="flex: 1;" data-url="${img.url}" data-filename="${img.filename}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                                <button class="quick-action-btn info-btn" data-index="${this.conversionQueue.indexOf(img)}">
                                    <i class="fas fa-info-circle"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        // Attach download events
        container.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                this.downloadConvertedImage(url, filename);
            });
        });
        
        container.querySelectorAll('.info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.showConversionDetails(this.conversionQueue[index]);
            });
        });
    }

    groupConversionsByDate() {
        const groups = {};
        
        this.conversionQueue.forEach(img => {
            const date = new Date(img.timestamp).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(img);
        });
        
        return groups;
    }

    formatTotalSize(conversions) {
        const totalBytes = conversions.reduce((sum, img) => sum + img.size, 0);
        return this.formatFileSize(totalBytes);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadConvertedImage(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.app.showNotification(`Downloaded ${filename}`, 'success');
    }

    downloadAllConverted() {
        if (this.conversionQueue.length === 0) {
            this.app.showNotification('No converted images to download', 'warning');
            return;
        }
        
        // Download individually with delay
        this.conversionQueue.forEach((img, index) => {
            setTimeout(() => {
                this.downloadConvertedImage(img.url, img.filename);
            }, index * 200);
        });
        
        this.app.showNotification(`Downloading ${this.conversionQueue.length} images...`, 'info');
    }

    clearConvertedHistory() {
        // Revoke object URLs
        this.conversionQueue.forEach(img => {
            URL.revokeObjectURL(img.url);
        });
        
        this.conversionQueue = [];
        this.displayConvertedImages();
        this.app.showNotification('Conversion history cleared', 'info');
    }

    clearImageCache() {
        // Clear cached images
        this.imageCache.clear();
        
        // Revoke all object URLs from converted images
        this.conversionQueue.forEach(img => {
            URL.revokeObjectURL(img.url);
        });
        
        this.conversionQueue = [];
        this.app.showNotification('Image cache cleared', 'success');
    }

    exportLibrary() {
        const exportData = {
            timestamp: new Date().toISOString(),
            totalImages: this.app.images.length,
            annotatedImages: this.app.images.filter(img => img.hasAnnotations).length,
            formats: this.getFormatStatistics(),
            images: this.app.images.map(img => ({
                name: img.name,
                format: img.name.split('.').pop(),
                hasAnnotations: img.hasAnnotations,
                annotationCount: img.annotationCount,
                size: img.size,
                classes: this.getImageClasses(img.name)
            }))
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `image_library_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.app.showNotification('Library exported successfully', 'success');
    }

    getFormatStatistics() {
        const stats = {};
        
        this.app.images.forEach(img => {
            const format = img.name.split('.').pop().toLowerCase();
            stats[format] = (stats[format] || 0) + 1;
        });
        
        return stats;
    }

    getImageClasses(imageName) {
        const annotations = this.app.annotations[imageName];
        if (!annotations) return [];
        
        return [...new Set(annotations.map(a => a.class))];
    }

    showConversionProgress(show) {
        let progressElement = document.getElementById('conversionProgress');
        
        if (!progressElement) {
            const converterSection = document.getElementById('converterSection');
            if (converterSection) {
                progressElement = document.createElement('div');
                progressElement.id = 'conversionProgress';
                progressElement.className = 'conversion-progress';
                progressElement.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 300px;
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 15px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 4px 12px var(--shadow-color);
                    z-index: 1000;
                `;
                document.body.appendChild(progressElement);
            }
        }
        
        if (progressElement) {
            progressElement.style.display = show ? 'block' : 'none';
        }
    }

    updateConversionProgress(text, percent) {
        let progressElement = document.getElementById('conversionProgress');
        
        if (!progressElement) {
            this.showConversionProgress(true);
            progressElement = document.getElementById('conversionProgress');
        }
        
        if (progressElement) {
            progressElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div class="conversion-item-icon">
                        <i class="fas fa-sync-alt" style="color: var(--accent-color);"></i>
                    </div>
                    <div class="conversion-item-details">
                        <div class="conversion-item-name">Converting Images</div>
                        <div class="conversion-item-status">${text}</div>
                    </div>
                </div>
                <div class="progress-bar" style="margin-bottom: 5px;">
                    <div class="progress-fill" style="width: ${percent}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary);">
                    <span>${Math.round(percent)}% complete</span>
                    <span>${this.conversionQueue.length} converted</span>
                </div>
            `;
        }
    }

    showConversionDetails(imageData) {
        const modal = document.getElementById('comparisonModal');
        const body = document.getElementById('comparisonBody');
        
        const compressionRatio = imageData.originalWidth && imageData.originalHeight ?
            ((imageData.size / (imageData.originalWidth * imageData.originalHeight * 3)) * 100).toFixed(1) : 'N/A';
        
        body.innerHTML = `
            <div class="comparison-grid">
                <div class="comparison-image">
                    <h4>Original Image</h4>
                    <img src="${imageData.originalUrl}" alt="Original" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;">
                    <div class="comparison-info" style="margin-top: 15px;">
                        <p><strong>Filename:</strong> ${imageData.originalName}</p>
                        <p><strong>Format:</strong> ${imageData.originalFormat.toUpperCase()}</p>
                        <p><strong>Dimensions:</strong> ${imageData.originalWidth || '?'}x${imageData.originalHeight || '?'}</p>
                    </div>
                </div>
                <div class="comparison-image">
                    <h4>Converted Image</h4>
                    <img src="${imageData.url}" alt="Converted" style="width: 100%; max-height: 200px; object-fit: contain; border-radius: 8px;">
                    <div class="comparison-info" style="margin-top: 15px;">
                        <p><strong>Filename:</strong> ${imageData.filename}</p>
                        <p><strong>Format:</strong> ${imageData.format.toUpperCase()}</p>
                        <p><strong>Dimensions:</strong> ${imageData.convertedWidth}x${imageData.convertedHeight}</p>
                        <p><strong>File Size:</strong> ${(imageData.size / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
            </div>
            <div class="comparison-info" style="margin-top: 20px;">
                <h4>Conversion Details</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">Size Reduction:</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color); font-weight: bold; color: var(--success-color);">
                            ${imageData.originalWidth && imageData.originalHeight ? 
                                `${((1 - (imageData.size / (imageData.originalWidth * imageData.originalHeight * 3))) * 100).toFixed(1)}%` : 
                                'N/A'}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">Compression Ratio:</td>
                        <td style="padding: 8px; border-bottom: 1px solid var(--border-color);">${compressionRatio}%</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px;">Conversion Time:</td>
                        <td style="padding: 8px;">${new Date(imageData.timestamp).toLocaleString()}</td>
                    </tr>
                </table>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-primary" style="flex: 1;" onclick="window.imageAnalysisApp.formatConverter.downloadConvertedImage('${imageData.url}', '${imageData.filename}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-secondary" style="flex: 1;" onclick="window.imageAnalysisApp.formatConverter.findSimilarImages('${imageData.originalName}')">
                        <i class="fas fa-search"></i> Find Similar
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
}

// Initialize the library manager after the main app is created
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize
    const checkAppInterval = setInterval(() => {
        if (window.imageAnalysisApp) {
            clearInterval(checkAppInterval);
            // Add library manager to the app instance
            window.imageAnalysisApp.formatConverter = new ImageLibraryManager(window.imageAnalysisApp);
        }
    }, 100);
});