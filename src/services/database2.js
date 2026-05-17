import { openDB } from 'idb'

const DB_NAME = 'DocAnalyzerDB'
const DB_VERSION = 5  // Incremented version
const STORE_NAME = 'chatHistory'
const service_store = 'services'
const STEP_RESPONSES = 'step-responses'
const IFTMS_STORE = 'sys-store'
const SEMANTIC_STORE = 'semantic_store'  // New store for semantic storage
const PAPERS_STORE = 'papers_store'      // New store for paper summarization

class Database {
  constructor() {
    this.db = null
  }

  async init() {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create chatHistory store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          })
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('sessionId', 'sessionId')
        }
        
        // Create services store if it doesn't exist
        if (!db.objectStoreNames.contains(service_store)) {
          const storeS = db.createObjectStore(service_store, {
            keyPath: 'id',
            autoIncrement: true
          })
          storeS.createIndex('userdoc', 'userdoc')
          storeS.createIndex('timestamp', 'timestamp')
          storeS.createIndex('sessionId', 'sessionId')
        }
        
        // Create step-responses store if it doesn't exist
        if (!db.objectStoreNames.contains(STEP_RESPONSES)) {
          const storeS = db.createObjectStore(STEP_RESPONSES, {
            keyPath: 'id',
            autoIncrement: true
          })
          storeS.createIndex('timestamp', 'timestamp')
          storeS.createIndex('sessionId', 'sessionId')
        }
        
        // Create sys-store if it doesn't exist
        if (!db.objectStoreNames.contains(IFTMS_STORE)) {
          const storeS = db.createObjectStore(IFTMS_STORE, {
            keyPath: 'id',
            autoIncrement: true
          })
          storeS.createIndex('timestamp', 'timestamp')
          storeS.createIndex('sessionId', 'sessionId')
          storeS.createIndex('sys', 'sys')
        }
        
        // Create semantic_store for sentence storage (NEW)
        if (!db.objectStoreNames.contains(SEMANTIC_STORE)) {
          const semanticStore = db.createObjectStore(SEMANTIC_STORE, {
            keyPath: 'id',
            autoIncrement: true
          })
          semanticStore.createIndex('paperId', 'paperId')
          semanticStore.createIndex('section', 'section')
          semanticStore.createIndex('score', 'score')
          semanticStore.createIndex('timestamp', 'timestamp')
        }
        
        // Create papers_store for paper metadata (NEW)
        if (!db.objectStoreNames.contains(PAPERS_STORE)) {
          const papersStore = db.createObjectStore(PAPERS_STORE, {
            keyPath: 'id',
            autoIncrement: true
          })
          papersStore.createIndex('documentId', 'documentId')
          papersStore.createIndex('title', 'title')
          papersStore.createIndex('timestamp', 'timestamp')
        }
        
        // Handle upgrades from older versions
        if (oldVersion < 5) {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`)
          // Any migration logic would go here
        }
      }
    })
    return this.db
  }

  // Existing methods...
  async saveChatMessage(messageData) {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(STORE_NAME, message)
  }

  async saveServiceStats(messageData) {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(service_store, message)
  }

  async saveStepResponses(messageData) {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(STEP_RESPONSES, message)
  }

  async saveIFTMstate(messageData) {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(IFTMS_STORE, message)
  }

  async getServiceHistory(limit = 100) {
    const tx = this.db.transaction(service_store, 'readonly')
    const store = tx.objectStore(service_store)
    const index = store.index('timestamp')
    
    let cursor = await index.openCursor(null, 'prev')
    const results = []
    
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results
  }

  async getChatHistory(limit = 100) {
    const tx = this.db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    
    let cursor = await index.openCursor(null, 'prev')
    const results = []
    
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results
  }

  async getAllChatHistory() {
    return await this.db.getAll(STORE_NAME)
  }

  async saveDocument(documentData) {
    return this.saveChatMessage({
      type: 'document',
      content: JSON.stringify(documentData),
      sessionId: 'doc_' + Date.now()
    })
  }

  // NEW METHODS FOR SMART SUMMARIZATION
  
  /**
   * Save sentences with semantic metadata
   * @param {Object} sentenceData - Sentence with metadata
   * @returns {Promise} - IDB request promise
   */
  async saveSemanticSentence(sentenceData) {
    const sentence = {
      ...sentenceData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(SEMANTIC_STORE, sentence)
  }

  /**
   * Save paper metadata
   * @param {Object} paperData - Paper metadata
   * @returns {Promise} - IDB request promise
   */
  async savePaperMetadata(paperData) {
    const paper = {
      ...paperData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(PAPERS_STORE, paper)
  }

  /**
   * Get sentences by paper ID
   * @param {string} paperId - Paper identifier
   * @param {number} limit - Maximum number of sentences to return
   * @returns {Promise<Array>} - Array of sentences
   */
  async getSentencesByPaperId(paperId, limit = 100) {
    const tx = this.db.transaction(SEMANTIC_STORE, 'readonly')
    const store = tx.objectStore(SEMANTIC_STORE)
    const index = store.index('paperId')
    
    let cursor = await index.openCursor(IDBKeyRange.only(paperId))
    const results = []
    
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results
  }

  /**
   * Get top sentences by score for a paper
   * @param {string} paperId - Paper identifier
   * @param {number} limit - Number of top sentences to return
   * @returns {Promise<Array>} - Sorted array of sentences by score
   */
  async getTopSentencesByPaperId(paperId, limit = 10) {
    const sentences = await this.getSentencesByPaperId(paperId, 1000)
    
    // Sort by score in descending order
    return sentences
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Get paper metadata by document ID
   * @param {string} documentId - Document identifier
   * @returns {Promise<Object|null>} - Paper metadata or null
   */
  async getPaperByDocumentId(documentId) {
    const tx = this.db.transaction(PAPERS_STORE, 'readonly')
    const store = tx.objectStore(PAPERS_STORE)
    const index = store.index('documentId')
    
    const cursor = await index.openCursor(IDBKeyRange.only(documentId))
    if (cursor) {
      return cursor.value
    }
    return null
  }

  /**
   * Batch save sentences for a paper
   * @param {string} paperId - Paper identifier
   * @param {Array} sentences - Array of sentence objects
   * @returns {Promise} - Promise resolving when all sentences are saved
   */
  async batchSaveSentences(paperId, sentences) {
    const tx = this.db.transaction(SEMANTIC_STORE, 'readwrite')
    const store = tx.objectStore(SEMANTIC_STORE)
    
    const promises = sentences.map(sentence => {
      const sentenceWithMetadata = {
        ...sentence,
        paperId,
        timestamp: new Date().toISOString()
      }
      return store.add(sentenceWithMetadata)
    })
    
    return Promise.all(promises)
  }

  /**
   * Clear all sentences for a paper
   * @param {string} paperId - Paper identifier
   * @returns {Promise} - Promise resolving when sentences are cleared
   */
  async clearPaperSentences(paperId) {
    const tx = this.db.transaction(SEMANTIC_STORE, 'readwrite')
    const store = tx.objectStore(SEMANTIC_STORE)
    const index = store.index('paperId')
    
    let cursor = await index.openCursor(IDBKeyRange.only(paperId))
    while (cursor) {
      cursor.delete()
      cursor = await cursor.continue()
    }
    
    return tx.complete
  }

  /**
   * Get all papers
   * @param {number} limit - Maximum number of papers to return
   * @returns {Promise<Array>} - Array of paper metadata
   */
  async getAllPapers(limit = 50) {
    const tx = this.db.transaction(PAPERS_STORE, 'readonly')
    const store = tx.objectStore(PAPERS_STORE)
    const index = store.index('timestamp')
    
    let cursor = await index.openCursor(null, 'prev')
    const results = []
    
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results
  }
}

export const db = new Database()