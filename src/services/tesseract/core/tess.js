import { LanguageManager } from '../managers/language-manager.js';
import { VehicleDataManager } from '../managers/vehicle-data-manager.js';
import { DocumentClassifier } from '../utils/document-classifier.js';
import { ProgressTracker } from '../utils/progress-tracker.js';
import { createWorker } from 'tesseract.js';

export class TessAna {
    constructor() {
        this.tesseractWorker = null;
        this.isInitializedT = false;
        this.initializationPromise = null;
        
        // Initialize managers
        this.languageManager = new LanguageManager();
        this.vehicleDataManager = new VehicleDataManager();
        this.documentClassifier = new DocumentClassifier();
        this.progressTracker = new ProgressTracker();
    }

    async init() {
        if (this.isInitializedT) return;
        
        console.log('🔄 Initializing Tesseract.js v6.0.1...');
        
        if (typeof createWorker === 'undefined') {
            throw new Error('Tesseract.js not loaded. Please check your imports.');
        }

        await this.languageManager.init();
        await this.loadLocalLanguagesToIndexedDB();
        
        console.log('Tesseract.js initialized with language support');
    }

    async loadLocalLanguagesToIndexedDB() {
        console.log('🔍 Loading local language files to IndexedDB...');
        
        const languages = ['eng', 'amh'];
        let loadedCount = 0;
        
        for (const langCode of languages) {
            const isAvailable = await this.languageManager.isLanguageAvailable(langCode);
            if (!isAvailable) {
                try {
                    await this.languageManager.loadLocalLanguage(langCode);
                    loadedCount++;
                    console.log(`✅ Loaded ${langCode} from local file to IndexedDB`);
                } catch (error) {
                    console.warn(`⚠️ Could not load local ${langCode} file: ${error.message}`);
                }
            } else {
                console.log(`✅ ${langCode} already available in IndexedDB`);
                loadedCount++;
            }
        }
        
        console.log(`📊 Language loading complete: ${loadedCount}/${languages.length} languages available`);
    }

    async initializeTesseract() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.isInitializedT) return;

        this.initializationPromise = (async () => {
            try {
                console.log('Initializing Tesseract OCR engine...');
                
                await this.loadLocalLanguagesToIndexedDB();
                
                console.log('Creating Tesseract worker...');
                this.tesseractWorker = await createWorker('eng+amh', 1, {
                    logger: progress => this.progressTracker.updateOCRProgress(progress)
                });

                this.isInitializedT = true;
                console.log('✅ Tesseract.js initialized successfully');
                
            } catch (error) {
                console.error('❌ Tesseract initialization failed:', error);
                this.isInitializedT = false;
                this.tesseractWorker = null;
                throw new Error(`OCR engine failed to start: ${error.message}`);
            } finally {
                this.initializationPromise = null;
            }
        })();

        return this.initializationPromise;
    }

    async analyzeDocument(file) {
        try {
            this.progressTracker.showLoading(true);
            console.log('📄 Starting document analysis for:', file.name, file.type);
            
            let text = '';
            let usedOCR = false;
            
            if (file.type.startsWith('image/')) {
                console.log('🖼️ Image file detected, initializing OCR...');
                await this.initializeTesseract();
                text = await this.performOCR(file);
                usedOCR = true;
                console.log('✅ OCR completed, text length:', text.length);
            } else if (file.type === 'application/pdf') {
                throw new Error('PDF processing handled by external PDF.js implementation');
            } else {
                throw new Error('Unsupported file type. Please use image files (JPEG, PNG, etc.)');
            }
            
            const analysis = this.documentClassifier.classifyDocument(text, file.name);
            analysis.fileName = file.name;
            analysis.fileSize = file.size;
            analysis.usedOCR = usedOCR;
            analysis.pages = analysis.pages || 1;
            
            if (typeof db !== 'undefined' && db.saveDocument) {
                await db.saveDocument(analysis);
            }
            
            this.progressTracker.showLoading(false);
            return analysis;
            
        } catch (error) {
            this.progressTracker.showLoading(false);
            console.error('❌ Analysis error:', error);
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    async performOCR(imageFile) {
        if (!this.isInitializedT || !this.tesseractWorker) {
            console.log('🔄 OCR not initialized, initializing now...');
            await this.initializeTesseract();
        }

        try {
            console.log('🔍 Starting OCR on file:', imageFile.name);
            const result = await this.tesseractWorker.recognize(imageFile, {
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            });
            
            console.log(`✅ OCR completed. Text length: ${result.data.text.length}, Confidence: ${result.data.confidence}`);
            return result.data.text || '';
            
        } catch (error) {
            console.error('❌ OCR processing failed:', error);
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    getWorkerStatus() {
        return {
            isInitialized: this.isInitializedT,
            worker: this.tesseractWorker ? 'Active' : 'None',
            initializationPromise: this.initializationPromise ? 'Pending' : 'None'
        };
    }

    async destroy() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
            this.isInitializedT = false;
        }
    }
}