import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import nlp from 'compromise'
import { processMessage } from './nlpProcessor'
import { db } from './database.js'  // Add this import

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export class PDFAnalyzerD {
  constructor() {
    this.pdfjsLib = pdfjsLib
    this.nlp = nlp
    this.summarizationConfig = {
      maxSummarySentences: 5,
      minSentenceScore: 0.3,
      adjectiveWeight: 0.2,
      keywordMatchWeight: 0.8
    }
  }

  async init() {
    console.log('PDF Analyzer initialized with PDF.js and Compromise')
  }

  async analyzeDocument(file) {
    try {
      const fileBuffer = await file.arrayBuffer()
      const pdf = await this.pdfjsLib.getDocument(fileBuffer).promise
      
      // Extract metadata and text
      const { finalTitle, firstPageContent } = await this.extractDocumentMetadata(pdf)
      const { text, pages, paragraphs } = await this.extractFullText(pdf)
      
      // Enhanced classification using robust methods
      const analysis = await this.classifyDocument(text, finalTitle)

      // Store document for semantic analysis
      if (analysis.documentType === "Academic Paper") {
        await this.storeDocumentForSummarization(text, finalTitle, file.name)
      }

      analysis.fileName = file.name
      analysis.fileSize = file.size
      analysis.pages = pages
      analysis.firstPageContent = firstPageContent
      analysis.fullText = text
      
      return analysis
      
    } catch (error) {
      console.error('PDF analysis error:', error)
      throw new Error(`PDF analysis failed: ${error.message}`)
    }
  }

  // NEW: Store document for semantic summarization
  async storeDocumentForSummarization(text, title, fileName) {
    try {
      const documentId = 'doc_' + Date.now()
      
      // Parse document into sections and sentences
      const sections = this.parseDocumentIntoSections(text)
      
      // Save paper metadata
      await db.savePaperMetadata({
        documentId,
        title: title || fileName,
        fileName,
        sectionCount: sections.length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        storedAt: new Date().toISOString()
      })
      
      // Process each section
      for (const section of sections) {
        const sentences = this.splitIntoSentences(section.content)
        
        for (const sentence of sentences) {
          // Extract semantic metadata
          const tags = this.extractGrammarTags(sentence)
          const semanticHint = this.extractSemanticHint(sentence)
          const baseScore = this.calculateSentenceBaseScore(sentence, tags)
          
          // Save sentence with metadata
          await db.saveSemanticSentence({
            paperId: documentId,
            text: sentence,
            section: section.title,
            tags: tags,
            semanticHint: semanticHint,
            score: baseScore,
            wordCount: sentence.split(/\s+/).length,
            hasNumbers: /\d/.test(sentence),
            hasAdjectives: tags.includes('#Adjective'),
            hasVerbs: tags.includes('#Verb')
          })
        }
      }
      
      console.log(`Document ${documentId} stored for semantic analysis`)
      return documentId
      
    } catch (error) {
      console.error('Error storing document for summarization:', error)
      return null
    }
  }

  // NEW: Parse document into sections
  parseDocumentIntoSections(text) {
    const sectionTitles = [
      'Abstract', 'Introduction', 'Methodology', 'Methods', 
      'Results', 'Findings', 'Discussion', 'Conclusion', 
      'References', 'Bibliography'
    ]
    
    const sections = []
    const lines = text.split('\n')
    let currentSection = { title: 'Preliminary', content: '' }
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Check if line is a section header
      const isSectionHeader = sectionTitles.some(title => 
        trimmedLine.toLowerCase().includes(title.toLowerCase()) && 
        trimmedLine.length < 100
      )
      
      if (isSectionHeader && currentSection.content.length > 0) {
        // Save current section
        sections.push({ ...currentSection })
        // Start new section
        currentSection = { 
          title: trimmedLine, 
          content: '' 
        }
      } else {
        currentSection.content += line + '\n'
      }
    }
    
    // Add the last section
    if (currentSection.content.length > 0) {
      sections.push({ ...currentSection })
    }
    
    return sections
  }

  // NEW: Split text into sentences
  splitIntoSentences(text) {
    // Simple sentence splitting
    return text
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1|')
      .split('|')
      .filter(sentence => sentence.trim().length > 10)
      .map(sentence => sentence.trim())
  }

  // NEW: Extract grammar tags
  extractGrammarTags(sentence) {
    try {
      const doc = this.nlp(sentence)
      const tags = []
      
      if (doc.has('#Noun')) tags.push('#Noun')
      if (doc.has('#Verb')) tags.push('#Verb')
      if (doc.has('#Adjective')) tags.push('#Adjective')
      if (doc.has('#Adverb')) tags.push('#Adverb')
      if (doc.has('#Value')) tags.push('#Value')
      
      return tags
    } catch (error) {
      console.error('Error extracting grammar tags:', error)
      return []
    }
  }

  // NEW: Extract semantic hint
  extractSemanticHint(sentence) {
    const lowerSentence = sentence.toLowerCase()
    
    if (lowerSentence.includes('conclusion') || lowerSentence.includes('conclude')) {
      return 'conclusion'
    } else if (lowerSentence.includes('result') || lowerSentence.includes('finding')) {
      return 'finding'
    } else if (lowerSentence.includes('method') || lowerSentence.includes('procedure')) {
      return 'method'
    } else if (lowerSentence.includes('suggest') || lowerSentence.includes('recommend')) {
      return 'recommendation'
    } else if (lowerSentence.includes('limitation') || lowerSentence.includes('challenge')) {
      return 'limitation'
    } else if (lowerSentence.includes('future') || lowerSentence.includes('further')) {
      return 'future_work'
    }
    
    return 'general'
  }

  // NEW: Calculate base sentence score
  calculateSentenceBaseScore(sentence, tags) {
    let score = 0.5 // Base score
    
    // Add weight for adjectives
    if (tags.includes('#Adjective')) {
      score += this.summarizationConfig.adjectiveWeight
    }
    
    // Add weight for verbs
    if (tags.includes('#Verb')) {
      score += 0.1
    }
    
    // Adjust for sentence length (optimal length gets higher score)
    const wordCount = sentence.split(/\s+/).length
    if (wordCount >= 8 && wordCount <= 25) {
      score += 0.1
    }
    
    // Penalize very short or very long sentences
    if (wordCount < 5 || wordCount > 40) {
      score -= 0.1
    }
    
    return Math.min(Math.max(score, 0.1), 1.0)
  }

  // NEW: Score sentence based on keywords
  scoreSentence(sentence, keywords) {
    const lowerSentence = sentence.toLowerCase()
    let matchCount = 0
    
    // Count keyword matches
    keywords.forEach(keyword => {
      if (lowerSentence.includes(keyword.toLowerCase())) {
        matchCount++
      }
    })
    
    // Extract grammar tags for additional weighting
    const tags = this.extractGrammarTags(sentence)
    const hasAdjective = tags.includes('#Adjective')
    
    // Calculate final score
    const keywordScore = matchCount * this.summarizationConfig.keywordMatchWeight
    const adjectiveBonus = hasAdjective ? this.summarizationConfig.adjectiveWeight : 0
    
    return keywordScore + adjectiveBonus
  }

  // NEW: Generate smart summary
  async generateSmartSummary(documentId, keywords = [], options = {}) {
    const {
      format = 'paragraph',
      maxSentences = this.summarizationConfig.maxSummarySentences,
      groupBySection = false,
      highlightKeywords = false
    } = options
    
    try {
      // Get all sentences for the document
      const sentences = await db.getSentencesByPaperId(documentId, 1000)
      
      if (sentences.length === 0) {
        return 'No sentences available for summarization.'
      }
      
      // Score each sentence based on keywords
      const scoredSentences = sentences.map(sentence => ({
        ...sentence,
        dynamicScore: this.scoreSentence(sentence.text, keywords)
      }))
      
      // Sort by dynamic score (descending)
      scoredSentences.sort((a, b) => b.dynamicScore - a.dynamicScore)
      
      // Filter by minimum score
      const filteredSentences = scoredSentences.filter(
        s => s.dynamicScore >= this.summarizationConfig.minSentenceScore
      )
      
      // Take top sentences
      const topSentences = filteredSentences.slice(0, maxSentences)
      
      // Format the summary
      let summary
      
      if (groupBySection) {
        // Group by section
        const sections = {}
        topSentences.forEach(sentence => {
          if (!sections[sentence.section]) {
            sections[sentence.section] = []
          }
          sections[sentence.section].push(sentence)
        })
        
        summary = Object.entries(sections)
          .map(([sectionName, sectionSentences]) => {
            const sectionText = sectionSentences
              .map(s => this.formatSentence(s.text, keywords, highlightKeywords))
              .join(' ')
            return `**${sectionName}**: ${sectionText}`
          })
          .join('\n\n')
          
      } else if (format === 'bullets') {
        // Bullet point format
        summary = topSentences
          .map(s => `• ${this.formatSentence(s.text, keywords, highlightKeywords)}`)
          .join('\n')
          
      } else {
        // Paragraph format (default)
        summary = topSentences
          .map(s => this.formatSentence(s.text, keywords, highlightKeywords))
          .join(' ')
      }
      
      return summary
      
    } catch (error) {
      console.error('Error generating smart summary:', error)
      return 'Unable to generate summary at this time.'
    }
  }

  // NEW: Format sentence with keyword highlighting
  formatSentence(sentence, keywords, highlight = false) {
    if (!highlight || keywords.length === 0) {
      return sentence
    }
    
    let formatted = sentence
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      formatted = formatted.replace(regex, match => `<span class="keyword-highlight">${match}</span>`)
    })
    
    return formatted
  }

  // NEW: Generate summary by paper ID (public interface)
  async summarizePaper(paperId, keywords, callback) {
    try {
      const summary = await this.generateSmartSummary(paperId, keywords, {
        format: 'paragraph',
        maxSentences: 5
      })
      
      if (callback && typeof callback === 'function') {
        callback(summary)
      }
      
      return summary
    } catch (error) {
      console.error('Error in summarizePaper:', error)
      if (callback && typeof callback === 'function') {
        callback('Error generating summary')
      }
      return 'Error generating summary'
    }
  }

  // NEW: Generate bullet point summary
  async generateBulletSummary(documentId, keywords, maxPoints = 5) {
    return this.generateSmartSummary(documentId, keywords, {
      format: 'bullets',
      maxSentences: maxPoints
    })
  }

  // NEW: Generate section-based summary
  async generateSectionSummary(documentId, keywords) {
    return this.generateSmartSummary(documentId, keywords, {
      groupBySection: true,
      maxSentences: 10
    })
  }

  // NEW: Get summarization statistics
  async getSummarizationStats(documentId) {
    try {
      const sentences = await db.getSentencesByPaperId(documentId)
      const paper = await db.getPaperByDocumentId(documentId)
      
      if (!paper) {
        return null
      }
      
      return {
        paperId: documentId,
        title: paper.title,
        totalSentences: sentences.length,
        sections: [...new Set(sentences.map(s => s.section))],
        avgSentenceScore: sentences.reduce((sum, s) => sum + s.score, 0) / sentences.length,
        storedAt: paper.timestamp
      }
    } catch (error) {
      console.error('Error getting summarization stats:', error)
      return null
    }
  }

  // NEW: Adjust summarization configuration
  setSummarizationConfig(config) {
    this.summarizationConfig = {
      ...this.summarizationConfig,
      ...config
    }
  }

  // Existing methods (unchanged)...
  extractServiceSpecificData(analysis, service) {
    const extractedData = {}
    
    if (service === 'iftms') {
      if (analysis.extractedData?.licenseNumber) {
        extractedData.licenseNumber = analysis.extractedData.licenseNumber
      }
      if (analysis.extractedData?.vehicleInfo) {
        extractedData.vehicleInfo = analysis.extractedData.vehicleInfo
      }
    } else if (service === 'renewDoc') {
      if (analysis.extractedData?.businessName) {
        extractedData.businessName = analysis.extractedData.businessName
      }
      if (analysis.extractedData?.licenseNumber) {
        extractedData.licenseNumber = analysis.extractedData.licenseNumber
      }
    }
    
    return extractedData
  }

  extractLicenseNumber(text) {
    // Extract business license number patterns
    const licensePatterns = [
      /\b\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}\b/, // 14/668/5068/2004
      /\bBL\d{8,12}\b/i, // BL123456789
      /\bLIC\d{8,12}\b/i, // LIC123456789
    ]
    
    for (const pattern of licensePatterns) {
      const match = text.match(pattern)
      if (match) return match[0]
    }
    
    return null
  }

  async extractFromDocument(document, service) {
    try {
      let extractedData = {}
      
      // For PDF files
      if (document.type === 'application/pdf') {
        const analysis = await this.analyzeDocument(document)
        extractedData = this.extractServiceSpecificData(analysis, service)
      }
      // For image files
      else if (document.type.startsWith('image/')) {
        // Note: teSsAna reference - you may need to import or define this
        // const text = await teSsAna.analyzeDocument(document)
        // const analysis = teSsAna.classifyDocument(text, document.name)
        // extractedData = this.extractServiceSpecificData(analysis, service)
      }
      
      return extractedData
    } catch (error) {
      console.error('Error extracting from document:', error)
      return {}
    }
  }

  async extractDocumentMetadata(pdf) {
    const firstPage = await pdf.getPage(1)
    const textContent = await firstPage.getTextContent()
    const firstPageText = textContent.items.map(item => item.str).join('\n')
    
    // Your existing metadata extraction logic
    const coverTitle = this.extractTitleFromCover(firstPageText)
    const cleanCoverTitle = this.cleanResearchTitle(coverTitle)
    const cleanFileName = this.cleanResearchTitle(pdf._pdfInfo?.title || "")
    
    let finalTitle = cleanCoverTitle
    
    if (cleanFileName && !this.titlesMatch(cleanCoverTitle, cleanFileName)) {
      finalTitle = `${cleanCoverTitle}`
    }
    
    return {
      coverTitle: cleanCoverTitle,
      fileNameTitle: cleanFileName,
      finalTitle,
      firstPageContent: firstPageText
    }
  }

  async extractFullText(pdf) {
    let text = ''
    let paragraphs = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      text += pageText + '\n'
      
      // Your existing paragraph detection logic
      let currentY = null
      let currentParagraph = ''
      
      textContent.items.forEach(item => {
        if (currentY !== null && Math.abs(item.transform[5] - currentY) > 15) {
          if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim())
          }
          currentParagraph = ''
        }
        currentY = item.transform[5]
        currentParagraph += item.str + ' '
      })
      
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim())
      }
    }
    
    return { text, paragraphs, pages: pdf.numPages }
  }

  // Add your existing utility methods
  extractTitleFromCover(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 10)
    return lines.length > 0 ? lines[0] : 'Untitled Document'
  }

  cleanResearchTitle(title) {
    return title.replace(/[^\w\sሀ-ፕ]/g, '').trim()
  }

  titlesMatch(title1, title2) {
    return this.similarity(title1.toLowerCase(), title2.toLowerCase()) > 0.7
  }

  similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1
    
    if (longer === shorter) return 1.0
    
    const distance = this.editDistance(longer, shorter)
    return (longer.length - distance) / parseFloat(longer.length)
  }

  editDistance(s1, s2) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()
    
    const costs = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j
        } else {
          if (j > 0) {
            let newValue = costs[j - 1]
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
            }
            costs[j - 1] = lastValue
            lastValue = newValue
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  // Your existing classification methods
  async classifyDocument(text, fileName) {
    const headerTerms = this.extractHeaderTerms(text)
    const cintent = sessionStorage.getItem('intent')
    const headerClassification = this.classifyByHeaderTerms(headerTerms)
    
    if (headerClassification) {
      return {
        documentName: fileName.replace(/\.[^/.]+$/, "") || 'Unknown Document',
        documentType: headerClassification.type,
        typeClass: headerClassification.class,
        confidence: headerClassification.confidence,
        topics: this.extractTopics(text),
        keywords: headerClassification.keywords,
        summary: this.generateSummary(text, headerTerms),
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        timestamp: new Date().toISOString(),
        headerTerms: headerTerms
      }
    }

    // Fallback to content-based classification
    const lowerText = text.toLowerCase()
    
    let type = "General Document"
    let typeClass = "type-other"
    let confidence = 0.3
  
    if (this.isResearchPaper(text, headerTerms)) {
      type = "Academic Paper"
      typeClass = "type-research"
      confidence = 0.85
      
      if (!cintent) {
        sessionStorage.setItem('intnt', 'analyzeResearch')
      }
    } else if (this.isVehicleOwnershipDoc(text, headerTerms)) {
      type = "Libre"
      typeClass = "type-libre"
      confidence = 0.85
      if (!cintent) {
        sessionStorage.setItem('intnt', 'iftms')
      }
    } else if (this.isLegalDocument(text, headerTerms)) {
      type = "Legal Document"
      typeClass = "type-legal"
      confidence = 0.8
      if (!cintent) {
        sessionStorage.setItem('intnt', 'analyzeLegal')
      }
    } else if (this.isGovernmentDocument(text, headerTerms)) {
      type = "Government Document"
      typeClass = "type-government"
      confidence = 0.75
    } else if (this.isFinancialDocument(text, headerTerms)) {
      type = "Financial Document"
      typeClass = "type-financial"
      confidence = 0.7
    }
    
    const topics = this.extractTopics(text)
    const keywords = this.extractKeywords(text)
    const currentIntent = sessionStorage.getItem('currentService')
    const Edata = {
      documentType: type,
      typeClass: typeClass,
      confidence: confidence,
    }
    
    if (currentIntent === 'iftms') {
      return await processMessage(currentIntent, Edata, false, true)
    }
    
    return {
      documentName: fileName.replace(/\.[^/.]+$/, "") || 'Unknown Document',
      documentType: type,
      typeClass: typeClass,
      confidence: confidence,
      topics: topics,
      keywords: keywords,
      summary: this.generateSummary(text, headerTerms),
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      timestamp: new Date().toISOString(),
      headerTerms: headerTerms
    }
  }

  extractHeaderTerms(text) {
    try {
      const lines = text.split('\n').slice(0, 15).join('\n')
      const doc = this.nlp(lines)
      
      const nouns = doc.nouns().out('array')
      const nounPhrases = doc.match('#Noun+').out('array')
      
      const allTerms = [...new Set([...nouns, ...nounPhrases])]
      
      return allTerms
        .filter(term =>
          term.length > 3 &&
          !/\d/.test(term) &&
          !['page', 'date', 'author', 'version', 'section'].includes(term.toLowerCase())
        )
        .slice(0, 10)
    } catch (e) {
      console.error("Error extracting header terms:", e)
      return []
    }
  }

  classifyByHeaderTerms(headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const cintent = sessionStorage.getItem('intent')
    
    // Research Paper detection
    const researchTerms = ['study', 'research', 'analysis', 'experiment', 'hypothesis', 'methodology', 'results', 'findings']
    if (researchTerms.some(term => termString.includes(term))) {
      if (!cintent) {
        sessionStorage.setItem('intnt', 'analyzeResearch')
      }
      return {
        type: "Academic Paper",
        class: "type-research",
        confidence: 0.85,
        keywords: researchTerms
          .filter(term => termString.includes(term))
          .map(term => ({ term, score: 0.8 }))
      }
    }
    
    // Legal Document detection
    const legalTerms = ['agreement', 'contract', 'clause', 'party', 'law', 'terms', 'condition', 'section']
    
    if (legalTerms.some(term => termString.includes(term))) {
      if (!cintent) {
        sessionStorage.setItem('intnt', 'analyzeLegal')
      }
      return {
        type: "Legal Document",
        class: "type-legal",
        confidence: 0.85,
        keywords: legalTerms
          .filter(term => termString.includes(term))
          .map(term => ({ term, score: 0.8 }))
      }
    }
    
    // Financial Document detection
    const financialTerms = ['invoice', 'receipt', 'payment', 'balance', 'statement', 'total', 'amount', 'due']
    if (financialTerms.some(term => termString.includes(term))) {
      return {
        type: "Financial Document",
        class: "type-financial",
        confidence: 0.85,
        keywords: financialTerms
          .filter(term => termString.includes(term))
          .map(term => ({ term, score: 0.8 }))
      }
    }
    
    return null
  }

  // Your existing document type detection methods
  isResearchPaper(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const researchTerms = ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion', 'references']
    
    return researchTerms.some(term => termString.includes(term)) ||
           /(abstract|introduction|methodology|results|discussion|conclusion|references|bibliography)/i.test(text)
  }

  isVehicleOwnershipDoc(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const libreTerms = ['የባለንብረት መረጃ', 'ቀረጥ ከፍሏል', 'አልከፈለም', 'libre', 'vehicle registration', 'motor number', 'number of axles', 'chasis number', 'plate number', 'trailer', 'cargo']
    
    return libreTerms.some(term => termString.includes(term)) ||
           /(libre|vehice registration|vehicle ownership|motor number|number of axles|license plate|cargo)/i.test(text)
  }

  isLegalDocument(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const legalTerms = ['agreement', 'contract', 'clause', 'party', 'whereas', 'warranty', 'jurisdiction']
    
    return legalTerms.some(term => termString.includes(term)) ||
           /(agreement|contract|clause|party|whereas|warranty|jurisdiction)/i.test(text)
  }

  isGovernmentDocument(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const govTerms = ['license', 'permit', 'national id', 'fayda id', 'government', 'identification']
    
    return govTerms.some(term => termString.includes(term)) ||
           /(license|permit|national id|fayda id|government|identification)/i.test(text)
  }

  isFinancialDocument(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const financialTerms = ['invoice', 'receipt', 'payment', 'amount', 'balance', 'statement', 'tax']
    
    return financialTerms.some(term => termString.includes(term)) ||
           /(invoice|receipt|payment|amount|balance|statement|tax)/i.test(text)
  }

  async extractLicenseNumber(text, language) {
    // Your existing implementation
    const licenseMatch = text.match(/^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/)
    return licenseMatch ? licenseMatch[0] : null
  }

  formatLicenseNumber(licenseNumber) {
    return licenseNumber.replace(/[^\d\/]/g, '')
  }

  isValidLicenseFormat(licenseNumber) {
    const formatted = this.formatLicenseNumber(licenseNumber)
    const licenseRegex = /^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/
    return licenseRegex.test(formatted)
  }

  extractTopics(text) {
    const words = text.toLowerCase().split(/\s+/)
    const wordFreq = {}
    
    words.forEach(word => {
      if (word.length > 4 && !this.isCommonWord(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }
    })
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word)
  }

  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/)
    const wordFreq = {}
    
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }
    })
    
    const maxFreq = Math.max(...Object.values(wordFreq))
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({
        term,
        score: count / maxFreq
      }))
  }

  isCommonWord(word) {
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'your', 'have', 'with', 'this', 'that', 'from']
    return commonWords.includes(word)
  }

  generateSummary(text, headerTerms = []) {
    // Your existing summary generation logic
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const firstFewSentences = sentences.slice(0, 6).join('. ')
    
    if (headerTerms.length > 0) {
      return `Document about ${headerTerms.slice(0, 3).join(', ')}. ${firstFewSentences}...`
    }
    
    return `${firstFewSentences}...`
  }

  showLoading(show) {
    // Your existing loading logic
    const loadingEl = document.getElementById('loading')
    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none'
    }
  }
}

export const pdfAnalyzerD = new PDFAnalyzerD()


// REQUIRED FUNCTIONS (non-class functions)

/**
 * Score a sentence based on keyword matches and grammar
 * @param {string} sentence - The sentence to score
 * @param {Array<string>} keywords - Keywords to match against
 * @returns {number} - Sentence score
 */
export function scoreSentence(sentence, keywords) {
  const lower = sentence.toLowerCase()
  const matchCount = keywords.filter(k => lower.includes(k.toLowerCase())).length
  
  // Use nlp for grammar analysis
  const doc = nlp(sentence)
  const weight = doc.has('#Adjective') ? 0.2 : 0
  
  return matchCount + weight
}

/**
 * Generate a summary for a paper
 * @param {string} paperId - The paper ID
 * @param {Array<string>} keywords - Keywords for scoring
 * @param {Function} callback - Callback function to receive the summary
 */
export function summarizePaper(paperId, keywords, callback) {
  return pdfAnalyzerD.summarizePaper(paperId, keywords, callback)
}

/**
 * Generate bullet point summary
 * @param {string} documentId - Document ID
 * @param {Array<string>} keywords - Keywords
 * @param {number} maxPoints - Maximum bullet points
 * @returns {Promise<string>} - Bullet point summary
 */
export function generateBulletSummary(documentId, keywords, maxPoints = 5) {
  return pdfAnalyzerD.generateBulletSummary(documentId, keywords, maxPoints)
}

/**
 * Generate section-based summary
 * @param {string} documentId - Document ID
 * @param {Array<string>} keywords - Keywords
 * @returns {Promise<string>} - Section-based summary
 */
export function generateSectionSummary(documentId, keywords) {
  return pdfAnalyzerD.generateSectionSummary(documentId, keywords)
}

/**
 * Example usage function
 * @param {string} paperId - Paper ID
 * @param {Array<string>} keywords - Keywords for summarization
 */
export function exampleSummarizationUsage(paperId, keywords = ['sleep', 'memory', 'recall', 'performance']) {
  summarizePaper(paperId, keywords, function(summary) {
    const outputElement = document.getElementById('summaryOutput')
    if (outputElement) {
      outputElement.textContent = summary
    } else {
      console.log('Summary:', summary)
    }
  })
}

/**
 * Get summarization statistics for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<Object|null>} - Statistics object
 */
export function getSummarizationStats(documentId) {
  return pdfAnalyzerD.getSummarizationStats(documentId)
}

/**
 * Format summary with highlighted keywords
 * @param {string} summary - The summary text
 * @param {Array<string>} keywords - Keywords to highlight
 * @returns {string} - Formatted HTML with highlighted keywords
 */
export function formatSummaryWithHighlights(summary, keywords) {
  let formatted = summary
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
    formatted = formatted.replace(regex, match => 
      `<span class="keyword-highlight" data-keyword="${keyword}">${match}</span>`
    )
  })
  return formatted
}

/**
 * Initialize the database before using summarization features
 * @returns {Promise} - Promise that resolves when database is initialized
 */
export async function initializeSummarization() {
  try {
    await db.init()
    console.log('Database initialized for summarization features')
    return true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return false
  }
}