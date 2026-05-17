import nlp from 'compromise'
import { apiHandler } from './API'
import { processUserInputX } from './iftmsX.js'
import { extractTextFromPDF } from './pdfAna.js'
import { db } from './database.js'
import { teSsAna } from "./tess.js"
import { pdfAnalyzerF } from './pdfAnalyzer.js'

// State variables
let initialized = false
let awaitingBusinessLicense = null
let awaitingVehicleInfo = null
let currentIntent = null
let currentStep = null
let currentService = null
let awaitingOTP = null
let iSbizValid = null
let isIftmsInit
let intentPatterns = {}
let stepResponses = {}

// Search engine integration configuration
const SEARCH_CONFIG = {
  searchEngine: 'duckduckgo', // Options: 'duckduckgo', 'google', 'brave'
  maxResults: 5,
  timeout: 10000, // 10 seconds
  language: 'en', // Default language for searches
  enableSummarization: true,
  fallbackToSearch: true // Whether to search when intent is unknown
}

// Initialize NLP Processor
export async function initNLPProcessor() {
  if (initialized) return
  
  console.log('🔄 Initializing NLP Processor with Web Search...')
  awaitingOTP = sessionStorage.getItem('opt')
  iSbizValid = sessionStorage.getItem('licenseValidated')
  initialized = true
  console.log('✅ NLP Processor with Web Search initialized')
}

// Web Search Function
export async function searchWebForUnknownIntent(query, options = {}) {
  const {
    searchEngine = SEARCH_CONFIG.searchEngine,
    maxResults = SEARCH_CONFIG.maxResults,
    language = localStorage.getItem('agig-language') || SEARCH_CONFIG.language,
    timeout = SEARCH_CONFIG.timeout
  } = options
  
  console.log(`🔍 Searching web for: "${query}"`)
  
  try {
    let searchResults = []
    
    // Use multiple search strategies
    if (searchEngine === 'duckduckgo') {
      searchResults = await searchDuckDuckGo(query, maxResults, language, timeout)
    } else if (searchEngine === 'google') {
      searchResults = await searchGoogle(query, maxResults, language, timeout)
    } else if (searchEngine === 'brave') {
      searchResults = await searchBrave(query, maxResults, language, timeout)
    }
    
    // Summarize results using NLP
    if (SEARCH_CONFIG.enableSummarization && searchResults.length > 0) {
      const summary = await summarizeSearchResults(searchResults, query)
      return {
        success: true,
        query,
        results: searchResults,
        summary,
        source: searchEngine,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      success: true,
      query,
      results: searchResults,
      summary: null,
      source: searchEngine,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('❌ Web search failed:', error)
    return {
      success: false,
      query,
      results: [],
      summary: null,
      error: error.message,
      source: searchEngine,
      timestamp: new Date().toISOString()
    }
  }
}

// DuckDuckGo Search Implementation
async function searchDuckDuckGo(query, maxResults, language, timeout) {
  try {
    // Use DuckDuckGo Instant Answer API
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&t=agig_chatbot&no_html=1&skip_disambig=1`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AGIG-ChatBot/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    const results = []
    
    // Extract Abstract/Summary
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Summary',
        snippet: data.Abstract,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodedQuery}`,
        source: 'DuckDuckGo Abstract',
        confidence: 0.9
      })
    }
    
    // Extract Related Topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, maxResults).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: topic.FirstURL ? topic.FirstURL.split('/').pop().replace(/_/g, ' ') : 'Related Topic',
            snippet: topic.Text,
            url: topic.FirstURL || `https://duckduckgo.com/?q=${encodedQuery}`,
            source: 'DuckDuckGo Related',
            confidence: 0.7
          })
        }
      })
    }
    
    // Extract Definitions
    if (data.Definition) {
      results.push({
        title: 'Definition',
        snippet: data.Definition,
        url: data.DefinitionURL || `https://duckduckgo.com/?q=${encodedQuery}`,
        source: 'DuckDuckGo Definition',
        confidence: 0.8
      })
    }
    
    return results.slice(0, maxResults)
    
  } catch (error) {
    console.warn('DuckDuckGo search failed, falling back to alternative:', error)
    return await fallbackSearch(query, maxResults, language)
  }
}

// Google Search Fallback
async function searchGoogle(query, maxResults, language, timeout) {
  // Note: Google Custom Search API requires API key
  // This is a simplified version - in production, use Google Custom Search JSON API
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://www.google.com/search?q=${encodedQuery}&hl=${language}&num=${maxResults}`
    
    // In a real implementation, you would use Google Custom Search API
    // For now, return simulated results
    return simulateSearchResults(query, maxResults)
    
  } catch (error) {
    console.warn('Google search failed:', error)
    return await fallbackSearch(query, maxResults, language)
  }
}

// Brave Search Fallback
async function searchBrave(query, maxResults, language, timeout) {
  try {
    // Brave Search API requires an API key
    // This is a placeholder implementation
    const encodedQuery = encodeURIComponent(query)
    
    // In a real implementation, use Brave Search API
    // For now, return simulated results
    return simulateSearchResults(query, maxResults)
    
  } catch (error) {
    console.warn('Brave search failed:', error)
    return await fallbackSearch(query, maxResults, language)
  }
}

// Fallback Search
async function fallbackSearch(query, maxResults, language) {
  // Fallback to multiple public APIs
  try {
    // Try Wikipedia API
    const wikiResults = await searchWikipedia(query, language)
    if (wikiResults.length > 0) {
      return wikiResults.slice(0, maxResults)
    }
    
    // Try public knowledge APIs
    const publicResults = await searchPublicAPIs(query)
    return publicResults.slice(0, maxResults)
    
  } catch (error) {
    console.error('All search methods failed:', error)
    return simulateSearchResults(query, maxResults)
  }
}

// Wikipedia Search
async function searchWikipedia(query, language) {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodedQuery}&srlimit=5&origin=*`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.query?.search?.map(result => ({
      title: result.title,
      snippet: result.snippet.replace(/<[^>]+>/g, ''),
      url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
      source: 'Wikipedia',
      confidence: 0.85
    })) || []
    
  } catch (error) {
    console.warn('Wikipedia search failed:', error)
    return []
  }
}

// Search Public APIs
async function searchPublicAPIs(query) {
  const results = []
  
  // Try different public knowledge sources
  const sources = [
    {
      name: 'Public Knowledge Base',
      url: `https://api.publicapis.org/entries?title=${encodeURIComponent(query)}`,
      parser: (data) => data.entries?.map(entry => ({
        title: entry.API,
        snippet: entry.Description,
        url: entry.Link,
        source: 'Public APIs',
        confidence: 0.6
      })) || []
    }
  ]
  
  for (const source of sources) {
    try {
      const response = await fetch(source.url)
      if (response.ok) {
        const data = await response.json()
        const parsed = source.parser(data)
        results.push(...parsed)
      }
    } catch (error) {
      continue // Skip failed sources
    }
  }
  
  return results
}

// Simulate Search Results (for development/testing)
function simulateSearchResults(query, maxResults) {
  const simulatedResults = [
    {
      title: `Information about "${query}"`,
      snippet: `Based on available information, "${query}" appears to be related to various topics. For accurate and up-to-date information, please consult official sources or specific documentation.`,
      url: `https://www.example.com/search?q=${encodeURIComponent(query)}`,
      source: 'Simulated Search',
      confidence: 0.5
    },
    {
      title: 'General Information',
      snippet: 'This appears to be a general query. You might want to be more specific about what you\'re looking for, such as specific document types, services, or procedures.',
      url: 'https://www.example.com/help',
      source: 'General Knowledge',
      confidence: 0.4
    }
  ]
  
  return simulatedResults.slice(0, maxResults)
}

// Summarize Search Results with Compromise NLP
async function summarizeSearchResults(results, originalQuery) {
  if (!results || results.length === 0) {
    return null
  }
  
  try {
    // Combine all snippets into a single text
    const combinedText = results
      .map(result => result.snippet)
      .filter(snippet => snippet && snippet.trim().length > 0)
      .join('. ')
    
    if (!combinedText || combinedText.trim().length < 50) {
      return null
    }
    
    // Use Compromise NLP for text analysis
    const doc = nlp(combinedText)
    
    // Extract key sentences (top 3-5 most relevant)
    const sentences = doc.sentences().out('array')
    
    // Simple relevance scoring based on query terms
    const queryTerms = originalQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    
    const scoredSentences = sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase()
      const score = queryTerms.reduce((sum, term) => {
        return sum + (sentenceLower.includes(term) ? 1 : 0)
      }, 0)
      
      return { sentence, score, length: sentence.length }
    })
    
    // Filter and sort sentences
    const relevantSentences = scoredSentences
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.length - b.length)
      .slice(0, 5)
      .map(({ sentence }) => sentence)
    
    // If no sentences match query terms, use first few sentences
    if (relevantSentences.length === 0) {
      relevantSentences.push(...sentences.slice(0, 3))
    }
    
    // Extract key terms (nouns and proper nouns)
    const keyTerms = doc.nouns().out('array')
      .filter(term => term.split(' ').length <= 3) // Filter out long phrases
      .filter(term => !isCommonWord(term))
      .slice(0, 10)
    
    // Extract entities
    const entities = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array')
    }
    
    // Generate summary
    const summary = {
      keyPoints: relevantSentences,
      keyTerms: [...new Set(keyTerms)], // Remove duplicates
      entities,
      confidence: Math.min(0.9, relevantSentences.length / 5), // Confidence score
      sources: results.map(r => r.source).filter((v, i, a) => a.indexOf(v) === i),
      recommendation: generateRecommendation(originalQuery, relevantSentences)
    }
    
    return summary
    
  } catch (error) {
    console.error('Error summarizing search results:', error)
    return null
  }
}

// Check if word is common
function isCommonWord(word) {
  const commonWords = [
    'document', 'file', 'paper', 'information', 'data',
    'service', 'system', 'process', 'analysis', 'review',
    'the', 'and', 'for', 'with', 'that', 'this', 'from'
  ]
  
  return commonWords.includes(word.toLowerCase())
}

// Generate recommendation based on search results
function generateRecommendation(query, keyPoints) {
  const queryLower = query.toLowerCase()
  
  // Check for specific intents in query
  if (queryLower.includes('how to') || queryLower.includes('procedure')) {
    return 'This appears to be a procedural query. For official procedures, please consult relevant government websites or contact the appropriate ministry.'
  }
  
  if (queryLower.includes('form') || queryLower.includes('template')) {
    return 'You might be looking for official forms or templates. These are typically available on government service portals.'
  }
  
  if (queryLower.includes('requirement') || queryLower.includes('document')) {
    return 'For specific document requirements, please refer to the official guidelines from the relevant authority.'
  }
  
  if (keyPoints.some(point => point.toLowerCase().includes('government') || 
                             point.toLowerCase().includes('official') ||
                             point.toLowerCase().includes('ministry'))) {
    return 'This appears to be related to government services. For accurate information, please visit the official government portal or contact the relevant ministry.'
  }
  
  return 'For the most accurate and up-to-date information, please consult official sources or contact the relevant authorities directly.'
}

// Enhanced Process Message with Web Search
export async function processMessage(message, isFile) {
  await initNLPProcessor()
  setupIntentPatterns()
  setupStepResponses()
  
  if (!isFile) {
    // db.saveServiceStats(message)
  }
  
  sessionStorage.setItem('otp', awaitingOTP)
  sessionStorage.setItem('licenseValidated', iSbizValid)
  const currentIntentStorage = sessionStorage.getItem('intnt')
  const confirmIntent = sessionStorage.getItem('cnfmintnt')
  const iSregd = sessionStorage.getItem('user')
  
  const doc = nlp(message)
  const intents = extractIntents(doc)
  const entities = extractEntities(doc)
  const sentiment = analyzeSentiment(doc)
  
  // Check if intent is unknown or unclear
  const isUnclearIntent = intents.length === 0 || 
                         intents.includes('general') || 
                         (intents.length === 1 && intents[0] === 'analyzeDocument')
  
  // If intent is unclear, perform web search
  let searchSummary = null
  if (SEARCH_CONFIG.fallbackToSearch && isUnclearIntent && message.length > 5) {
    console.log('🌐 Intent unclear, performing web search...')
    
    // Generate search query from message
    const searchQuery = generateSearchQuery(message, entities)
    
    // Perform search
    const searchResult = await searchWebForUnknownIntent(searchQuery, {
      language: localStorage.getItem('agig-language') || 'en'
    })
    
    if (searchResult.success && searchResult.summary) {
      searchSummary = searchResult.summary
      
      // Update intents based on search results
      const enhancedIntents = enhanceIntentsWithSearch(intents, searchSummary)
      if (enhancedIntents.length > 0) {
        intents.push(...enhancedIntents.filter(i => !intents.includes(i)))
      }
    }
  }
  
  if (currentIntent !== intents) {
    sessionStorage.setItem('intnt', intents)
    currentIntent = intents
  }
  
  if (sessionStorage.getItem('intnt') === 'iftms') {
    if (!isIftmsInit) {
      currentStep = 0
      sessionStorage.setItem('currentStep', currentStep)
      awaitingOTP = true
    }
    
    if (isIftmsInit && !iSbizValid) {
      awaitingOTP = false
      awaitingBusinessLicense = true
      currentStep = 1
    }
    
    if (iSbizValid && !awaitingVehicleInfo) {
      awaitingVehicleInfo = true
      awaitingBusinessLicense = false
      currentStep = 2
    }
    
    return generateContextualResponse({
      currentStep: currentStep,
      intents: intents,
      sentiment,
      processedText: message,
      awaitingInput: false,
      language: localStorage.getItem('agig-language'),
      shouldUploadFile: false,
      responseType: determineResponseType(intents),
      searchSummary: searchSummary // Include search summary in response
    })
  } else {
    return generateContextualResponse({
      intents: intents,
      currentStep: null,
      entities: { licenseInput: [message] },
      sentiment: sentiment,
      processedText: message,
      shouldUploadFile: false,
      responseType: determineResponseType(intents),
      awaitingInput: false,
      searchSummary: searchSummary // Include search summary in response
    })
  }
}

// Generate search query from message
function generateSearchQuery(message, entities) {
  const doc = nlp(message)
  
  // Extract key terms
  const nouns = doc.nouns().out('array').filter(n => n.length > 3)
  const verbs = doc.verbs().out('array')
  const adjectives = doc.adjectives().out('array')
  
  // Combine terms, prioritizing nouns
  const terms = [...nouns.slice(0, 3), ...verbs.slice(0, 2), ...adjectives.slice(0, 2)]
  
  // Remove duplicates and common words
  const uniqueTerms = [...new Set(terms)]
    .filter(term => !isCommonWord(term))
    .slice(0, 5)
  
  // If no good terms, use the original message (truncated)
  if (uniqueTerms.length === 0) {
    return message.length > 100 ? message.substring(0, 100) + '...' : message
  }
  
  // Add context based on entities
  let context = ''
  if (entities.documentTypes.length > 0) {
    context = 'document ' + entities.documentTypes[0]
  } else if (entities.fileTypes.length > 0) {
    context = entities.fileTypes[0] + ' file'
  }
  
  const query = context ? `${context} ${uniqueTerms.join(' ')}` : uniqueTerms.join(' ')
  return query
}

// Enhance intents based on search results
function enhanceIntentsWithSearch(intents, searchSummary) {
  const enhancedIntents = []
  
  if (!searchSummary || !searchSummary.keyPoints) {
    return enhancedIntents
  }
  
  const keyPointsText = searchSummary.keyPoints.join(' ').toLowerCase()
  const keyTerms = searchSummary.keyTerms.map(term => term.toLowerCase())
  
  // Check for government-related content
  if (keyPointsText.includes('government') || 
      keyPointsText.includes('ministry') ||
      keyPointsText.includes('official') ||
      keyTerms.some(term => term.includes('license') || term.includes('permit'))) {
    enhancedIntents.push('analyzeGovernment')
  }
  
  // Check for legal content
  if (keyPointsText.includes('legal') || 
      keyPointsText.includes('contract') ||
      keyPointsText.includes('agreement') ||
      keyTerms.some(term => term.includes('law') || term.includes('clause'))) {
    enhancedIntents.push('analyzeLegal')
  }
  
  // Check for financial content
  if (keyPointsText.includes('financial') || 
      keyPointsText.includes('invoice') ||
      keyPointsText.includes('receipt') ||
      keyTerms.some(term => term.includes('payment') || term.includes('bank'))) {
    enhancedIntents.push('analyzeFinancial')
  }
  
  // Check for research content
  if (keyPointsText.includes('research') || 
      keyPointsText.includes('study') ||
      keyPointsText.includes('academic') ||
      keyTerms.some(term => term.includes('paper') || term.includes('thesis'))) {
    enhancedIntents.push('analyzeResearch')
  }
  
  return [...new Set(enhancedIntents)]
}

// Enhanced Generate Contextual Response
export async function generateContextualResponse(nlpResult, documentAnalysis = null) {
  const { 
    intents, 
    currentStep, 
    sentiment, 
    processedText, 
    awaitingInput, 
    entities, 
    responseType,
    searchSummary 
  } = nlpResult
  
  sessionStorage.setItem('currentService', currentIntent)
  const language = localStorage.getItem('agig-language')
  let response = ''
  
  // Check if we have search summary for unclear intents
  if (searchSummary && (intents.length === 0 || intents.includes('general'))) {
    return generateSearchBasedResponse(searchSummary, processedText, language)
  }
  
  switch (responseType) {
    case 'greeting':
      response = getGreetingResponse(sentiment)
      break
    case 'help':
      response = getHelpResponse()
      break
    case 'thanks':
      response = getThanksResponse()
      break
    case 'researchAnalysis':
      response = "I'd be happy to analyze research papers! Please upload a PDF research document, and I'll extract key information about the methodology, findings, conclusions, and research instruments."
      break
    case 'renewDoc':
      response = "I'd be happy to renew your document permit! Please upload your previous PDF business license, your fyda id and all other supporting documents you have."
      break
    case 'iftms':
      response = await getIftmsResponse(intents, currentStep, sentiment, processedText, awaitingInput, language, 'isFileContent=false')
      break
    case 'legalAnalysis':
      response = "I can analyze legal documents like contracts and agreements. Upload your legal document, and I'll identify key clauses, parties involved, obligations, and important dates."
      break
    case 'governmentAnalysis':
      response = "I specialize in government document verification. Upload documents like IDs, licenses, or permits, and I'll help verify their structure and identify key information."
      break
    case 'financialAnalysis':
      response = "I can analyze financial documents including invoices, receipts, and statements. Upload your financial document for amount verification, date analysis, and pattern recognition."
      break
    case 'classification':
      response = "I can classify documents by type! Upload any document, and I'll identify whether it's a research paper, legal document, government ID, financial record, or general document."
      break
    default:
      response = getGeneralResponse(intents, entities, documentAnalysis)
  }
  
  // Add sentiment-aware phrasing
  response = addSentimentTone(response, sentiment)
  
  // Add search-based clarification if available
  if (searchSummary) {
    response = enhanceResponseWithSearch(response, searchSummary, language)
  }
  
  return response
}

// Generate response based on search results
function generateSearchBasedResponse(searchSummary, originalQuery, language) {
  const { keyPoints, keyTerms, recommendation, confidence } = searchSummary
  
  let response = ''
  
  if (language === 'am') {
    response = `🔍 በ"${originalQuery}" ላይ ያገኘሁትን መረጃ:\n\n`
    
    if (keyPoints && keyPoints.length > 0) {
      response += `**ዋና ነጥቦች:**\n`
      keyPoints.slice(0, 3).forEach((point, i) => {
        response += `${i + 1}. ${point}\n`
      })
    }
    
    if (keyTerms && keyTerms.length > 0) {
      response += `\n**ዋና ቃላት:** ${keyTerms.slice(0, 5).join(', ')}`
    }
    
    response += `\n\n${recommendation || 'በትክክለኛ መረጃ ለማግኘት ተገቢውን መንግስታዊ ድርጣቢያ ይጎብኙ።'}`
    
  } else {
    response = `🔍 Here's what I found about "${originalQuery}":\n\n`
    
    if (keyPoints && keyPoints.length > 0) {
      response += `**Key Points:**\n`
      keyPoints.slice(0, 3).forEach((point, i) => {
        response += `${i + 1}. ${point}\n`
      })
    }
    
    if (keyTerms && keyTerms.length > 0) {
      response += `\n**Key Terms:** ${keyTerms.slice(0, 5).join(', ')}`
    }
    
    response += `\n\n${recommendation || 'For accurate information, please consult official sources.'}`
    
    if (confidence < 0.7) {
      response += `\n\n*Note: This information has moderate confidence. For official procedures, please verify with relevant authorities.*`
    }
  }
  
  return response
}

// Enhance existing response with search information
function enhanceResponseWithSearch(response, searchSummary, language) {
  if (!searchSummary || !searchSummary.keyPoints || searchSummary.keyPoints.length === 0) {
    return response
  }
  
  const enhancement = language === 'am' 
    ? `\n\n🔍 ተጨማሪ መረጃ: ${searchSummary.keyPoints[0]}`
    : `\n\n🔍 Additional context: ${searchSummary.keyPoints[0]}`
  
  return response + enhancement
}

// Setup intent patterns (existing function - keep as is)
export function setupIntentPatterns() {
  intentPatterns = {
    // ... existing intent patterns ...
  }
}

// ... rest of existing functions remain the same ...

// Export enhanced nlpProcessor object
export const nlpProcessor = {
  init: initNLPProcessor,
  processMessage,
  handleBusinessLicenseInput,
  extractIntents,
  extractEntities,
  analyzeSentiment,
  shouldRequestFileUpload,
  determineResponseType,
  generateContextualResponse,
  setupStepResponses,
  getIftmsResponse,
  getGreetingResponse,
  getHelpResponse,
  getThanksResponse,
  getGeneralResponse,
  addSentimentTone,
  isBusinessLicenseNumber,
  analyzeDocumentContent,
  
  // New search functions
  searchWebForUnknownIntent,
  summarizeSearchResults,
  generateSearchQuery
}