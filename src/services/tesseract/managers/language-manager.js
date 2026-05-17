import { openDB } from 'idb';
import { TESSERACT_CONFIG } from '../../config/tesseract-config.js';

export class LanguageManager {
    constructor() {
        this.dbName = 'tesseract-lang-store';
        this.storeName = 'traineddata';
        this.db = null;
        this.languages = TESSERACT_CONFIG.languages;
    }

    async init() {
        await this.openDatabase();
        console.log('✅ Tesseract Language manager initialized');
    }

    async openDatabase() {
        this.db = await openDB(this.dbName, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('traineddata')) {
                    db.createObjectStore('traineddata');
                }
            }
        });
        return this.db;
    }

    async set(key, value) {
        return this.db.put('traineddata', value, key);
    }

    async get(key) {
        return this.db.get('traineddata', key);
    }

    async checkAvailableLanguages() {
        const keys = await this.getAllKeys();
        return Object.keys(this.languages).filter(langCode => {
            const key = `./${langCode}.traineddata`;
            return keys.includes(key);
        });
    }

    async getAllKeys() {
        return this.db.getAllKeys('traineddata');
    }

    async loadLocalLanguage(langCode) {
        const lang = this.languages[langCode];
        if (!lang) {
            throw new Error(`Language ${langCode} not supported`);
        }

        console.log(`📁 Loading local ${lang.name} file from: ${lang.localPath}`);
        
        try {
            const response = await fetch(lang.localPath);
            if (!response.ok) {
                throw new Error(`Failed to load local file: HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const key = `./${langCode}.traineddata`;
            await this.set(key, uint8Array);
            
            console.log(`✅ ${lang.name} loaded from local file to IndexedDB`);
            return uint8Array;
            
        } catch (error) {
            console.error(`❌ Failed to load local ${lang.name} file:`, error);
            throw error;
        }
    }

    async isLanguageAvailable(langCode) {
        const key = `./${langCode}.traineddata`;
        try {
            const data = await this.get(key);
            return data instanceof Uint8Array && data.length > 0;
        } catch (error) {
            console.warn(`Error checking language availability for ${langCode}:`, error);
            return false;
        }
    }
}