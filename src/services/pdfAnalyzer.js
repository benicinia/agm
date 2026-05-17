import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import nlp from 'compromise'
import { processMessage } from './nlpProcessor'
import { pdfAnalyzerD } from './pdfAnalyzer2'
import {ministriesFed,privateColleges,universities  } from "./data";
// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export class PDFAnalyzerF {
  constructor() {
    this.pdfjsLib = pdfjsLib
    this.nlp = nlp
  }

  async init() {
    console.log('PDF Analyzer initialized with PDF.js and Compromise')
  }
// Setup intent patterns

  async analyzeDocument(file) {
    /*async analyzeDocument(file,intnt,currentStep) { }
    if(intnt==='iftms') {
    }
    
    */
    try {
      const fileBuffer = await file.arrayBuffer()
      const pdf = await this.pdfjsLib.getDocument(fileBuffer).promise
      
      // Extract metadata and text
      const { finalTitle, firstPageContent } = await this.extractDocumentMetadata(pdf)
      const { text, pages } = await this.extractFullText(pdf)
      
      // Enhanced classification using robust methods
      const analysis = this.classifyDocument(text, finalTitle)
// Store document for semantic analysis
     /* if (analysis.documentType === "Academic Paper") {
       // await pdfAnalyzerD.storeDocumentForSummarization(text, finalTitle, file.name)
      } else if (analysis.documentType === "Government Document") {
        // await pdfAnalyzerD.storeDocumentForSummarization(text, finalTitle, file.name)
      } */
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
        const analysis = await pdfAnalyzerF.analyzeDocument(document)
        extractedData = this.extractServiceSpecificData(analysis, service)
      }
      // For image files
    /*  else if (document.type.startsWith('image/')) {
        const text = await teSsAna.analyzeDocument(document)
        const analysis = teSsAna.classifyDocument(text, document.name)
        extractedData = this.extractServiceSpecificData(analysis, service)
      }*/
      
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
    // Your existing implementation
    const lines = text.split('\n').filter(line => line.trim().length > 10)
    return lines.length > 0 ? lines[0] : 'Untitled Document'
  }

  cleanResearchTitle(title) {
    // Your existing implementation
    return title.replace(/[^\w\sሀ-ፕ]/g, '').trim()
  }

  titlesMatch(title1, title2) {
    // Your existing implementation
    return this.similarity(title1.toLowerCase(), title2.toLowerCase()) > 0.7
  }

  similarity(s1, s2) {
    // Your existing implementation
    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1
    
    if (longer === shorter) return 1.0
    
    const distance = this.editDistance(longer, shorter)
    return (longer.length - distance) / parseFloat(longer.length)
  }

  editDistance(s1, s2) {
    // Your existing implementation
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
     const cintent =sessionStorage.getItem('intent')
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
      
      if(!cintent) {  sessionStorage.setItem('intnt','analyzeResearch')}
    } else if (this.isVehicleOwnershipDoc(text, headerTerms)) {
      type = "Libre"
      typeClass = "type-libre"
      confidence = 0.85
       if(!cintent) {  sessionStorage.setItem('intnt','iftms')}
       
    } else if (this.isLegalDocument(text, headerTerms)) {
      type = "Legal Document"
      typeClass = "type-legal"
      confidence = 0.8
       if(!cintent) {  sessionStorage.setItem('intnt','analyzeLegal')}
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
   /*const Edata ={documentType: type,
            typeClass: typeClass,
            confidence: confidence,
            }
     if (currentIntent==='iftms') {
    //return  await processMessage(currentIntent,Edata,false,true)

    }*/
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
      const cintent =sessionStorage.getItem('intent')
    // Research Paper detection
    const researchTerms = ['study', 'research', 'analysis', 'experiment', 'hypothesis', 'methodology', 'results', 'findings']
    if (researchTerms.some(term => termString.includes(term))) {
       if(!cintent) {  sessionStorage.setItem('intnt','analyzeResearch')}
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
      if(!cintent) return sessionStorage.setItem('intnt','analyzeLegal')
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
     // Government Document detection
    const govTerms = ['license','trade bureau','ንግድ ቢሮ', 'permit', 'national id','የኢትዮጵያ ብሔራዊ መታወቂያ ፕሮግራም', 'fayda id', 'government', 'identification']
   // const ministers = ministriesFed
    if (govTerms.some(term => termString.includes(term))) {
      return {
        type: "Government Document",
        class: "type-government",
        confidence: 0.85,
        keywords: govTerms
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
    const libreTerms = ['የባለንብረት መረጃ','ቀረጥ ከፍሏል','አልከፈለም','libre', 'vehicle registration', 'motor number', 'number of axles','chasis number', 'plate number', 'trailer','cargo']
    
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
    const govTerms = ['license','በአዲስ አበባ ከተማ አስተዳደር','addis ababa City administration','የኢትዮጵያ ዲጂታል መታወቂያ ካርድ','trade bureau','ንግድ ቢሮ' ,'trade Bureau','permit', 'national id', 'fayda id', 'government', 'identification']
    
    return govTerms.some(term => termString.includes(term)) ||
           /(license|permit|national id|fayda id|government|identification|Date of issuance|ብሔራዊ መታወቂያ ፕሮግራም)/i.test(text)
  }

  isFinancialDocument(text, headerTerms) {
    const termString = headerTerms.join(' ').toLowerCase()
    const financialTerms = ['invoice', 'receipt', 'payment', 'amount', 'balance', 'statement', 'tax']
    
    return financialTerms.some(term => termString.includes(term)) ||
           /(invoice|receipt|payment|amount|balance|statement|tax)/i.test(text)
  }
async extractLicenseNumber(text, language) {
    if (!this.initialized) {
      await this.initialize(language);
    }

    try {
      // Use QA model to extract license numbers
      const question = language === 'am' ? 'የንግድ ፈቃድ ቁጥር ምንድን ነው?' : 'What is the business license number?';
      const result = await this.qaModel(question, text);
      
      if (result.score > 0.3) {
        // Further validate if it looks like a license number
        const licenseMatch = result.answer.match(/\b[A-Z0-9]{8,12}\b/);
        if (licenseMatch) {
          return licenseMatch[0];
        }
        return result.answer;
      }
    } catch (error) {
      console.error('Error in license extraction:', error);
    }

    // Fallback regex extraction
   // const licenseMatch = text.match(/\b(?:BL|LIC|REG)?[A-Z0-9]{8,12}\b/);
   const licenseMatch = text.match(/^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/);
 //  const checkformat =this.isValidLicenseFormat()
    return licenseMatch ? licenseMatch[0] : null;
  }
  formatLicenseNumber(licenseNumber) {
    return licenseNumber.replace(/[^\d\/]/g, '');
  }

  // Validate license number format
  isValidLicenseFormat(licenseNumber) {
    const formatted = this.formatLicenseNumber(licenseNumber);
    const licenseRegex = /^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/;
    return licenseRegex.test(formatted);
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

export const pdfAnalyzerF = new PDFAnalyzerF()