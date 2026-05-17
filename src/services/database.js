// ========== database.js ==========
import { openDB } from 'idb'

const DB_NAME = 'DocAnalyzerDB'
const DB_VERSION = 8  // Incremented version
const STORE_NAME = 'chatHistory'
const SEMANTIC_STORE = 'semantic_store'
const PAPERS_STORE = 'papers_store'
const SERVICE_FLOWS_STORE = 'service_flows'  // NEW STORE FOR SERVICE CONFIGURATIONS

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
        
        // Create semantic_store for sentence storage
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
        
        // Create papers_store for paper metadata
        if (!db.objectStoreNames.contains(PAPERS_STORE)) {
          const papersStore = db.createObjectStore(PAPERS_STORE, {
            keyPath: 'id',
            autoIncrement: true
          })
          papersStore.createIndex('documentId', 'documentId')
          papersStore.createIndex('title', 'title')
          papersStore.createIndex('timestamp', 'timestamp')
        }
        
        // CREATE NEW SERVICE FLOWS STORE
        if (!db.objectStoreNames.contains(SERVICE_FLOWS_STORE)) {
          const serviceStore = db.createObjectStore(SERVICE_FLOWS_STORE, {
            keyPath: 'serviceId'
          })
          serviceStore.createIndex('name', 'name')
          serviceStore.createIndex('createdAt', 'createdAt')
          serviceStore.createIndex('updatedAt', 'updatedAt')
          serviceStore.createIndex('isActive', 'isActive')
        }
        
        // Handle upgrades from older versions
        if (oldVersion < 6) {
          console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`)
          // Migration logic if needed
        }
      }
    })
    return this.db
  }

  // ========== NEW SERVICE FLOW METHODS ==========

  /**
   * Save service flow configuration to database
   * @param {Object} serviceConfig - Service configuration object
   * @returns {Promise} - IDB request promise
   */
  async saveServiceFlow(serviceConfig) {
   const service = {
    ...serviceConfig,
    createdAt: serviceConfig.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: serviceConfig.isActive !== undefined ? 
              (serviceConfig.isActive ? 1 : 0) : 1 // Store as number
  }
  return await this.db.put(SERVICE_FLOWS_STORE, service)
  }
  /**
   * Get service flow configuration by ID
   * @param {string} serviceId - Service identifier
   * @returns {Promise<Object|null>} - Service configuration or null
   */
  async getServiceFlow(serviceId) {
    try {
      return await this.db.get(SERVICE_FLOWS_STORE, serviceId)
    } catch (error) {
      console.error('Error getting service flow:', error)
      return null
    }
  }

  /**
   * Get all active service flows
   * @param {number} limit - Maximum number of services to return
   * @returns {Promise<Array>} - Array of service configurations
   */
  async getAllServiceFlows(limit = 50) {
    const tx = this.db.transaction(SERVICE_FLOWS_STORE, 'readonly')
    const store = tx.objectStore(SERVICE_FLOWS_STORE)
    const index = store.index('isActive')
    
    let cursor = await index.openCursor(IDBKeyRange.only(true))
    const results = []
    
    while (cursor && results.length < limit) {
      results.push(cursor.value)
      cursor = await cursor.continue()
    }
    
    return results
  }

  /**
   * Get service flows by name (partial match)
   * @param {string} name - Service name to search for
   * @returns {Promise<Array>} - Array of matching services
   */
  async getServiceFlowsByName(name) {
    const allServices = await this.getAllServiceFlows()
    const searchTerm = name.toLowerCase()
    
    return allServices.filter(service => 
      service.name.toLowerCase().includes(searchTerm) ||
      service.serviceId.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * Delete service flow
   * @param {string} serviceId - Service identifier
   * @returns {Promise} - IDB request promise
   */
  async deleteServiceFlow(serviceId) {
    return await this.db.delete(SERVICE_FLOWS_STORE, serviceId)
  }

  /**
   * Update service flow
   * @param {string} serviceId - Service identifier
   * @param {Object} updates - Partial service configuration
   * @returns {Promise} - IDB request promise
   */
  async updateServiceFlow(serviceId, updates) {
    const existing = await this.getServiceFlow(serviceId)
    if (!existing) {
      throw new Error(`Service ${serviceId} not found`)
    }
    
    const updatedService = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    return await this.db.put(SERVICE_FLOWS_STORE, updatedService)
  }

  /**
   * Import default service flows (one-time function)
   * @returns {Promise<Array>} - Array of saved service IDs
   */
  async importDefaultServices() {
 // In importDefaultServices:
const defaultServices = [
  {
    serviceId: 'iftms',
    name: 'Integrated Freight Management System',
    steps: [
      { id: 1, sessionKey: 'licenseValidated', flag: 'awaitingBusinessLicense' },
      { id: 2, sessionKey: 'isLibreValidated', flag: 'awaitingVehicleInfo' },
      { id: 3, sessionKey: 'isDriverValidated', flag: 'awaitingDriverInfo' },
      { id: 4, sessionKey: 'isInsValidated', flag: 'awaitingInsuranceInfo' }
    ],
    initKey: 'isIftmsInit',
    stepKey: 'currentStep',
    validationLogic: `
if (licenseValidated && currentStep < 2) currentStep = 2;
if (isLibreValidated && !isInsValidated && currentStep < 3) currentStep = 3;
if (isDriverValidated && !isInsValidated && currentStep < 4) currentStep = 4;
    `,
    flagLogic: `
if (currentStep === 1) { awaitingBusinessLicense = true; awaitingVehicleInfo = false; awaitingDriverInfo = false; }
if (currentStep === 2) { awaitingBusinessLicense = false; awaitingVehicleInfo = true; awaitingDriverInfo = false; }
if (currentStep === 3) { awaitingBusinessLicense = false; awaitingVehicleInfo = false; awaitingDriverInfo = true; }
if (currentStep === 4) { awaitingBusinessLicense = false; awaitingVehicleInfo = false; awaitingDriverInfo = false; }
    `,
    createdAt: new Date().toISOString(),
    isActive: 1 // Store as number
  },
  // ... rest of services
]
 
    const results = []
    for (const service of defaultServices) {
      try {
        await this.saveServiceFlow(service)
        results.push(service.serviceId)
        console.log(`✅ Saved default service: ${service.name}`)
      } catch (error) {
        console.error(`❌ Failed to save service ${service.serviceId}:`, error)
      }
    }
    
    return results
  }

  /**
   * Export all service flows as JSON
   * @returns {Promise<string>} - JSON string of all services
   */
  async exportServiceFlows() {
    const services = await this.getAllServiceFlows()
    return JSON.stringify(services, null, 2)
  }

  /**
   * Import service flows from JSON
   * @param {string} jsonString - JSON string of service configurations
   * @returns {Promise<Array>} - Array of imported service IDs
   */
  async importServiceFlows(jsonString) {
    const services = JSON.parse(jsonString)
    const results = []
    
    for (const service of services) {
      try {
        await this.saveServiceFlow(service)
        results.push(service.serviceId)
      } catch (error) {
        console.error(`Failed to import service ${service.serviceId}:`, error)
      }
    }
    
    return results
  }

  // ========== EXISTING METHODS (KEPT AS IS) ==========

  async saveChatMessage(messageData) {
    const message = {
      ...messageData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(STORE_NAME, message)
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

  async saveSemanticSentence(sentenceData) {
    const sentence = {
      ...sentenceData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(SEMANTIC_STORE, sentence)
  }

  async savePaperMetadata(paperData) {
    const paper = {
      ...paperData,
      timestamp: new Date().toISOString()
    }
    return await this.db.add(PAPERS_STORE, paper)
  }

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

  async getTopSentencesByPaperId(paperId, limit = 10) {
    const sentences = await this.getSentencesByPaperId(paperId, 1000)
    return sentences
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

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