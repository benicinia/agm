// client/src/services/pdfTagger.js
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import nlp from 'compromise'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

class PDFTagger {
  constructor() {
    this.pdfjsLib = pdfjsLib
    this.nlp = nlp
    this.db = null
    this.initDB()
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PDFDocumentsDB', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' })
          docStore.createIndex('userId', 'userId', { unique: false })
          docStore.createIndex('synced', 'synced', { unique: false })
          docStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
        
        // Sentences store with tags
        if (!db.objectStoreNames.contains('sentences')) {
          const sentStore = db.createObjectStore('sentences', { keyPath: 'id', autoIncrement: true })
          sentStore.createIndex('documentId', 'documentId', { unique: false })
          sentStore.createIndex('synced', 'synced', { unique: false })
          sentStore.createIndex('section', 'section', { unique: false })
          sentStore.createIndex('semanticHint', 'semanticHint', { unique: false })
          sentStore.createIndex('hasAdjectives', 'hasAdjectives', { unique: false })
          sentStore.createIndex('hasVerbs', 'hasVerbs', { unique: false })
        }
        
        // Tags store
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'id', autoIncrement: true })
          tagStore.createIndex('documentId', 'documentId', { unique: false })
          tagStore.createIndex('tagType', 'tagType', { unique: false })
          tagStore.createIndex('synced', 'synced', { unique: false })
        }
        
        // Sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
          syncStore.createIndex('synced', 'synced', { unique: false })
        }
      }
    })
  }

  async extractAndTag(file, userId) {
    try {
      // Extract text from PDF
      const fileBuffer = await file.arrayBuffer()
      const pdf = await this.pdfjsLib.getDocument(fileBuffer).promise
      
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }

      // Generate document ID
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Parse document into sections
      const sections = this.parseDocumentIntoSections(fullText)
      
      // Store document metadata
      const document = {
        id: documentId,
        userId: userId,
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdf.numPages,
        sectionCount: sections.length,
        wordCount: fullText.split(/\s+/).length,
        createdAt: new Date().toISOString(),
        synced: false,
        fullText: fullText.substring(0, 1000) // Store preview only
      }
      
      await this.saveDocument(document)
      
      // Process and tag each sentence
      let sentenceCount = 0
      const sentences = []
      const tags = []
      
      for (const section of sections) {
        const sectionSentences = this.splitIntoSentences(section.content)
        
        for (const sentenceText of sectionSentences) {
          if (sentenceText.trim().length < 10) continue
          
          // Extract tags using compromise
          const sentenceTags = this.extractTags(sentenceText)
          const semanticHint = this.extractSemanticHint(sentenceText)
          const baseScore = this.calculateBaseScore(sentenceText, sentenceTags)
          
          const sentence = {
            documentId: documentId,
            text: sentenceText,
            section: section.title,
            tags: sentenceTags,
            semanticHint: semanticHint,
            score: baseScore,
            wordCount: sentenceText.split(/\s+/).length,
            hasNumbers: /\d/.test(sentenceText),
            hasAdjectives: sentenceTags.includes('#Adjective'),
            hasVerbs: sentenceTags.includes('#Verb'),
            hasNouns: sentenceTags.includes('#Noun'),
            hasProperNouns: sentenceTags.includes('#ProperNoun'),
            hasValues: sentenceTags.includes('#Value'),
            createdAt: new Date().toISOString(),
            synced: false
          }
          
          await this.saveSentence(sentence)
          sentences.push(sentence)
          
          // Create individual tags for search
          sentenceTags.forEach(tagType => {
            const tag = {
              documentId: documentId,
              sentenceId: sentence.id,
              tagType: tagType,
              value: tagType,
              createdAt: new Date().toISOString(),
              synced: false
            }
            tags.push(tag)
          })
          
          sentenceCount++
        }
      }
      
      // Save all tags
      await this.saveTags(tags)
      
      // Add to sync queue
      await this.addToSyncQueue({
        documentId: documentId,
        type: 'document',
        action: 'create',
        data: { document, sentences, tags },
        createdAt: new Date().toISOString()
      })
      
      return {
        documentId,
        fileName: file.name,
        pageCount: pdf.numPages,
        sentenceCount,
        sectionCount: sections.length
      }
      
    } catch (error) {
      console.error('PDF tagging error:', error)
      throw error
    }
  }

  parseDocumentIntoSections(text) {
    const sectionTitles = [
      'Abstract', 'Introduction', 'Methodology', 'Methods', 
      'Results', 'Findings', 'Discussion', 'Conclusion', 
      'References', 'Bibliography', 'Appendix'
    ]
    
    const sections = []
    const lines = text.split('\n')
    let currentSection = { title: 'Preliminary', content: '' }
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      const isSectionHeader = sectionTitles.some(title => 
        trimmed.toLowerCase().includes(title.toLowerCase()) && trimmed.length < 100
      )
      
      if (isSectionHeader && currentSection.content.length > 0) {
        sections.push({ ...currentSection })
        currentSection = { title: trimmed, content: '' }
      } else {
        currentSection.content += line + '\n'
      }
    }
    
    if (currentSection.content.length > 0) {
      sections.push({ ...currentSection })
    }
    
    return sections
  }

  splitIntoSentences(text) {
    return text
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1|')
      .split('|')
      .filter(s => s.trim().length > 0)
      .map(s => s.trim())
  }

  extractTags(sentence) {
    try {
      const doc = this.nlp(sentence)
      const tags = []
      
      if (doc.has('#Noun')) tags.push('#Noun')
      if (doc.has('#Verb')) tags.push('#Verb')
      if (doc.has('#Adjective')) tags.push('#Adjective')
      if (doc.has('#Adverb')) tags.push('#Adverb')
      if (doc.has('#Value')) tags.push('#Value')
      if (doc.has('#ProperNoun')) tags.push('#ProperNoun')
      if (doc.has('#Question')) tags.push('#Question')
      if (doc.has('#Negative')) tags.push('#Negative')
      
      // Extract named entities
      const people = doc.people().out('array')
      if (people.length > 0) tags.push('#Person')
      
      const places = doc.places().out('array')
      if (places.length > 0) tags.push('#Place')
      
      const organizations = doc.organizations().out('array')
      if (organizations.length > 0) tags.push('#Organization')
      
      return tags
    } catch (error) {
      console.error('Error extracting tags:', error)
      return []
    }
  }

  extractSemanticHint(sentence) {
    const lower = sentence.toLowerCase()
    
    if (lower.includes('conclusion') || lower.includes('conclude')) return 'conclusion'
    if (lower.includes('result') || lower.includes('finding')) return 'finding'
    if (lower.includes('method') || lower.includes('procedure')) return 'method'
    if (lower.includes('suggest') || lower.includes('recommend')) return 'recommendation'
    if (lower.includes('limitation') || lower.includes('challenge')) return 'limitation'
    if (lower.includes('future') || lower.includes('further')) return 'future_work'
    if (lower.includes('introduction') || lower.includes('background')) return 'introduction'
    if (lower.includes('figure') || lower.includes('table')) return 'visual_data'
    
    return 'general'
  }

  calculateBaseScore(sentence, tags) {
    let score = 0.5
    
    if (tags.includes('#Adjective')) score += 0.2
    if (tags.includes('#Verb')) score += 0.1
    if (tags.includes('#ProperNoun')) score += 0.15
    
    const wordCount = sentence.split(/\s+/).length
    if (wordCount >= 8 && wordCount <= 25) score += 0.1
    if (wordCount < 5 || wordCount > 40) score -= 0.1
    
    return Math.max(0.1, Math.min(1.0, score))
  }

  async saveDocument(document) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['documents'], 'readwrite')
      const store = tx.objectStore('documents')
      const request = store.add(document)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveSentence(sentence) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sentences'], 'readwrite')
      const store = tx.objectStore('sentences')
      const request = store.add(sentence)
      
      request.onsuccess = (event) => {
        sentence.id = event.target.result
        resolve(sentence)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveTags(tags) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tags'], 'readwrite')
      const store = tx.objectStore('tags')
      
      let completed = 0
      tags.forEach(tag => {
        const request = store.add(tag)
        request.onsuccess = () => {
          completed++
          if (completed === tags.length) resolve()
        }
        request.onerror = () => reject(request.error)
      })
      
      if (tags.length === 0) resolve()
    })
  }

  async addToSyncQueue(item) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['syncQueue'], 'readwrite')
      const store = tx.objectStore('syncQueue')
      const request = store.add(item)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getUnsyncedItems() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['syncQueue'], 'readonly')
      const store = tx.objectStore('syncQueue')
      const index = store.index('synced')
      const request = index.getAll(false)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async markAsSynced(itemIds) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['syncQueue'], 'readwrite')
      const store = tx.objectStore('syncQueue')
      
      let completed = 0
      itemIds.forEach(id => {
        const getRequest = store.get(id)
        getRequest.onsuccess = () => {
          const item = getRequest.result
          item.synced = true
          const updateRequest = store.put(item)
          updateRequest.onsuccess = () => {
            completed++
            if (completed === itemIds.length) resolve()
          }
        }
      })
    })
  }

  async getDocumentsByUser(userId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['documents'], 'readonly')
      const store = tx.objectStore('documents')
      const index = store.index('userId')
      const request = index.getAll(userId)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getSentencesByDocument(documentId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['sentences'], 'readonly')
      const store = tx.objectStore('sentences')
      const index = store.index('documentId')
      const request = index.getAll(documentId)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getTagsByDocument(documentId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['tags'], 'readonly')
      const store = tx.objectStore('tags')
      const index = store.index('documentId')
      const request = index.getAll(documentId)
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteDocument(documentId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['documents', 'sentences', 'tags'], 'readwrite')
      
      // Delete sentences
      const sentStore = tx.objectStore('sentences')
      const sentIndex = sentStore.index('documentId')
      const sentRequest = sentIndex.getAll(documentId)
      
      sentRequest.onsuccess = () => {
        sentRequest.result.forEach(s => {
          sentStore.delete(s.id)
        })
      }
      
      // Delete tags
      const tagStore = tx.objectStore('tags')
      const tagIndex = tagStore.index('documentId')
      const tagRequest = tagIndex.getAll(documentId)
      
      tagRequest.onsuccess = () => {
        tagRequest.result.forEach(t => {
          tagStore.delete(t.id)
        })
      }
      
      // Delete document
      const docStore = tx.objectStore('documents')
      docStore.delete(documentId)
      
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

export const pdfTagger = new PDFTagger()