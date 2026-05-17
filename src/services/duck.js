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

// Google Custom Search API Configuration
const GOOGLE_SEARCH_CONFIG = {
  apiKey: 'process.env.GOOGLE_API_KEY' || localStorage.getItem('google_api_key') || 'YOUR_GOOGLE_API_KEY', // Set your API key
  searchEngineId: 'process.env.GOOGLE_SE_ID' || localStorage.getItem('google_search_engine_id') || 'YOUR_SEARCH_ENGINE_ID', // Custom Search Engine ID
  baseUrl: 'https://www.googleapis.com/customsearch/v1',
  maxResults: 10, // Google allows up to 10 per request
  safeSearch: 'active', // moderate, off
  searchType: 'searchTypeUndefined', // searchTypeImage, searchTypeNews
  fields: 'items(title,link,snippet,pagemap/metatags),searchInformation(totalResults)',
  timeout: 15000,
  cacheDuration: 3600000, // Cache results for 1 hour (in milliseconds)
  enableKnowledgeGraph: true
}

// DuckDuckGo fallback configuration
const DUCKDUCKGO_CONFIG = {
  baseUrl: 'https://api.duckduckgo.com/',
  format: 'json',
  noHtml: 1,
  skipDisambig: 1
}

// Search cache
let searchCache = new Map()

// Initialize NLP Processor with Google Search
export async function initGOOGLEsearch() {
  if (initialized) return
  
  console.log('🔄 Initializing NLP Processor with Google Search API...')
  awaitingOTP = sessionStorage.getItem('opt')
  iSbizValid = sessionStorage.getItem('licenseValidated')
  
  // Initialize Google API if available
  if (GOOGLE_SEARCH_CONFIG.apiKey && GOOGLE_SEARCH_CONFIG.searchEngineId) {
    console.log('✅ Google Custom Search API configured')
  } else {
    console.warn('⚠️ Google API key or Search Engine ID not configured. Using fallback search.')
  }
  
  initialized = true
  console.log('✅ NLP Processor with Web Search initialized')
}

// Set Google API credentials
export function setGoogleCredentials(apiKey, searchEngineId) {
  GOOGLE_SEARCH_CONFIG.apiKey = apiKey
  GOOGLE_SEARCH_CONFIG.searchEngineId = searchEngineId
  localStorage.setItem('google_api_key', apiKey)
  localStorage.setItem('google_search_engine_id', searchEngineId)
  console.log('✅ Google API credentials updated')
}

// Main web search function with Google API as primary
export async function searchWebForUnknownIntent(query, options = {}) {
  const {
    useGoogle = true, // Use Google as primary
    fallbackToDuckDuckGo = true,
    maxResults = GOOGLE_SEARCH_CONFIG.maxResults,
    language = localStorage.getItem('agig-language') || 'en',
    timeout = GOOGLE_SEARCH_CONFIG.timeout,
    safeSearch = GOOGLE_SEARCH_CONFIG.safeSearch,
    searchType = GOOGLE_SEARCH_CONFIG.searchType
  } = options
  
  console.log(`🔍 Searching web for: "${query}"`)
  
  // Check cache first
  const cacheKey = `${query}_${language}_${maxResults}`
  const cachedResult = searchCache.get(cacheKey)
  
  if (cachedResult && (Date.now() - cachedResult.timestamp) < GOOGLE_SEARCH_CONFIG.cacheDuration) {
    console.log('📦 Using cached search results')
    return cachedResult.data
  }
  
  try {
    let searchResults = []
    let source = 'unknown'
    
    // Try Google Custom Search API first if configured
    if (useGoogle && GOOGLE_SEARCH_CONFIG.apiKey && GOOGLE_SEARCH_CONFIG.searchEngineId) {
      try {
        const googleResults = await searchGoogleCustom(query, {
          maxResults,
          language,
          safeSearch,
          searchType,
          timeout
        })
        
        if (googleResults.length > 0) {
          searchResults = googleResults
          source = 'google'
          console.log(`✅ Google search returned ${googleResults.length} results`)
        }
      } catch (googleError) {
        console.warn('❌ Google search failed:', googleError.message)
      }
    }
    
    // Fallback to DuckDuckGo if Google fails or returns no results
    if (searchResults.length === 0 && fallbackToDuckDuckGo) {
      console.log('🦆 Falling back to DuckDuckGo...')
      try {
        const duckduckgoResults = await searchDuckDuckGo(query, maxResults, language, timeout)
        if (duckduckgoResults.length > 0) {
          searchResults = duckduckgoResults
          source = 'duckduckgo'
        }
      } catch (duckduckgoError) {
        console.warn('❌ DuckDuckGo search failed:', duckduckgoError.message)
      }
    }
    
    // Final fallback to Wikipedia
    if (searchResults.length === 0) {
      console.log('📚 Falling back to Wikipedia...')
      try {
        const wikipediaResults = await searchWikipedia(query, language)
        if (wikipediaResults.length > 0) {
          searchResults = wikipediaResults
          source = 'wikipedia'
        }
      } catch (wikipediaError) {
        console.warn('❌ Wikipedia search failed:', wikipediaError.message)
      }
    }
    
    // Extract knowledge graph information from Google if available
    let knowledgeGraph = null
    if (source === 'google' && GOOGLE_SEARCH_CONFIG.enableKnowledgeGraph) {
      knowledgeGraph = await extractKnowledgeGraph(query, language)
    }
    
    // Summarize results using NLP
    let summary = null
    if (searchResults.length > 0) {
      summary = await summarizeSearchResults(searchResults, query, knowledgeGraph)
    }
    
    const result = {
      success: searchResults.length > 0,
      query,
      results: searchResults,
      summary,
      knowledgeGraph,
      source,
      timestamp: new Date().toISOString(),
      language
    }
    
    // Cache the result
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })
    
    // Limit cache size
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value
      searchCache.delete(firstKey)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Web search completely failed:', error)
    return {
      success: false,
      query,
      results: [],
      summary: null,
      knowledgeGraph: null,
      source: 'none',
      error: error.message,
      timestamp: new Date().toISOString(),
      language
    }
  }
}

// Google Custom Search API Implementation
async function searchGoogleCustom(query, options = {}) {
  const {
    maxResults = GOOGLE_SEARCH_CONFIG.maxResults,
    language = 'en',
    safeSearch = GOOGLE_SEARCH_CONFIG.safeSearch,
    searchType = GOOGLE_SEARCH_CONFIG.searchType,
    timeout = GOOGLE_SEARCH_CONFIG.timeout
  } = options
  
  const params = new URLSearchParams({
    key: GOOGLE_SEARCH_CONFIG.apiKey,
    cx: GOOGLE_SEARCH_CONFIG.searchEngineId,
    q: query,
    num: Math.min(maxResults, 10), // Google max is 10 per request
    lr: `lang_${language}`,
    safe: safeSearch,
    fields: GOOGLE_SEARCH_CONFIG.fields
  })
  
  if (searchType !== 'searchTypeUndefined') {
    params.append('searchType', searchType)
  }
  
  // Add domain restrictions for government/Ethiopia specific searches
  if (query.toLowerCase().includes('ethiopia') || 
      query.toLowerCase().includes('government') ||
      query.toLowerCase().includes('ministry')) {
    params.append('siteSearch', '.et,.gov.et')
    params.append('siteSearchFilter', 'i')
  }
  
  const url = `${GOOGLE_SEARCH_CONFIG.baseUrl}?${params.toString()}`
  
  console.log(`🔗 Google API Request: ${url.substring(0, 100)}...`)
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AGIG-ChatBot/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Google API HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      console.log('⚠️ Google search returned no items')
      return []
    }
    
    // Process Google search results
    const results = data.items.map((item, index) => {
      // Extract description from metatags if available
      let description = item.snippet || ''
      if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags[0]) {
        const meta = item.pagemap.metatags[0]
        description = meta['og:description'] || 
                     meta['twitter:description'] || 
                     meta.description || 
                     description
      }
      
      // Calculate confidence based on position and content
      const positionScore = 1 - (index / data.items.length)
      const contentScore = calculateRelevanceScore(query, item.title + ' ' + description)
      const confidence = (positionScore * 0.3) + (contentScore * 0.7)
      
      return {
        title: item.title || 'No title',
        snippet: description,
        url: item.link,
        source: 'Google Search',
        confidence: confidence,
        rank: index + 1,
        searchInfo: {
          totalResults: data.searchInformation?.totalResults || 'Unknown'
        }
      }
    })
    
    return results
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Google search timeout')
    }
    throw error
  }
}
export function simulateSearchResults(query, maxResults) {
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
// Extract Knowledge Graph information from Google
async function extractKnowledgeGraph(query, language) {
  try {
    const params = new URLSearchParams({
      key: GOOGLE_SEARCH_CONFIG.apiKey,
      cx: GOOGLE_SEARCH_CONFIG.searchEngineId,
      q: query,
      num: 1
    })
    
    const url = `${GOOGLE_SEARCH_CONFIG.baseUrl}?${params.toString()}`
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    // Check for knowledge graph in results
    if (data.items && data.items[0] && data.items[0].pagemap) {
      const pagemap = data.items[0].pagemap
      
      // Extract entity information
      const entity = {
        name: null,
        description: null,
        type: null,
        details: {}
      }
      
      // Check for schema.org structured data
      if (pagemap.metatags && pagemap.metatags[0]) {
        const meta = pagemap.metatags[0]
        entity.name = meta['og:title'] || meta['twitter:title'] || null
        entity.description = meta['og:description'] || meta['twitter:description'] || meta.description || null
        entity.type = meta['og:type'] || null
      }
      
      // Check for knowledge graph specific data
      if (pagemap.website && pagemap.website[0]) {
        entity.details.website = pagemap.website[0]
      }
      
      if (pagemap.organization && pagemap.organization[0]) {
        entity.details.organization = pagemap.organization[0]
      }
      
      if (pagemap.localbusiness && pagemap.localbusiness[0]) {
        entity.details.business = pagemap.localbusiness[0]
      }
      
      if (pagemap.governmentorganization && pagemap.governmentorganization[0]) {
        entity.details.government = pagemap.governmentorganization[0]
      }
      
      return entity
    }
    
    return null
    
  } catch (error) {
    console.warn('Could not extract knowledge graph:', error.message)
    return null
  }
}

// Calculate relevance score between query and content
function calculateRelevanceScore(query, content) {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2)
  const contentLower = content.toLowerCase()
  
  if (queryTerms.length === 0) return 0.5
  
  const matches = queryTerms.filter(term => contentLower.includes(term)).length
  const matchRatio = matches / queryTerms.length
  
  // Boost score for exact phrase matches
  const exactMatch = contentLower.includes(query.toLowerCase()) ? 0.2 : 0
  
  // Penalize very short content
  const lengthPenalty = content.length < 50 ? -0.1 : 0
  
  return Math.min(1, Math.max(0, matchRatio + exactMatch + lengthPenalty))
}

// Enhanced DuckDuckGo search (fallback)
async function searchDuckDuckGo(query, maxResults, language, timeout) {
  try {
    const encodedQuery = encodeURIComponent(query)
    const params = new URLSearchParams({
      q: encodedQuery,
      format: DUCKDUCKGO_CONFIG.format,
      no_html: DUCKDUCKGO_CONFIG.noHtml,
      skip_disambig: DUCKDUCKGO_CONFIG.skipDisambig,
      kp: '1', // Safe search
      kl: language === 'am' ? 'wt-wt' : 'us-en'
    })
    
    const url = `${DUCKDUCKGO_CONFIG.baseUrl}?${params.toString()}`
    
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
      throw new Error(`DuckDuckGo HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    const results = []
    
    // Extract Abstract/Summary
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Summary',
        snippet: data.Abstract,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodedQuery}`,
        source: 'DuckDuckGo',
        confidence: 0.9,
        rank: 1
      })
    }
    
    // Extract Related Topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, maxResults - 1).forEach((topic, index) => {
        if (topic.Text) {
          results.push({
            title: topic.FirstURL ? topic.FirstURL.split('/').pop().replace(/_/g, ' ') : 'Related Topic',
            snippet: topic.Text,
            url: topic.FirstURL || `https://duckduckgo.com/?q=${encodedQuery}`,
            source: 'DuckDuckGo',
            confidence: 0.7 - (index * 0.1),
            rank: index + 2
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
        source: 'DuckDuckGo',
        confidence: 0.8,
        rank: results.length + 1
      })
    }
    
    return results.slice(0, maxResults)
    
  } catch (error) {
    console.warn('DuckDuckGo search failed:', error.message)
    throw error
  }
}

// Enhanced Wikipedia search (fallback)
async function searchWikipedia(query, language) {
  try {
    const encodedQuery = encodeURIComponent(query)
    const langCode = language === 'am' ? 'am' : 'en'
    const url = `https://${langCode}.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodedQuery}&srlimit=5&srprop=snippet&origin=*`
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AGIG-ChatBot/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Wikipedia HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.query?.search) {
      return []
    }
    
    return data.query.search.map((result, index) => ({
      title: result.title,
      snippet: result.snippet.replace(/<[^>]+>/g, ''),
      url: `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(result.title)}`,
      source: 'Wikipedia',
      confidence: 0.85 - (index * 0.05),
      rank: index + 1
    }))
    
  } catch (error) {
    console.warn('Wikipedia search failed:', error.message)
    throw error
  }
}

// Enhanced Summarize Search Results with Google context
async function summarizeSearchResults(results, originalQuery, knowledgeGraph = null) {
  if (!results || results.length === 0) {
    return null
  }
  
  try {
    // Combine all snippets into a single text
    const combinedText = results
      .map(result => `${result.title}. ${result.snippet}`)
      .filter(text => text && text.trim().length > 0)
      .join('. ')
    
    if (!combinedText || combinedText.trim().length < 50) {
      return null
    }
    
    // Use Compromise NLP for advanced text analysis
    const doc = nlp(combinedText)
    
    // Extract sentences and score them
    const sentences = doc.sentences().out('array')
    const queryTerms = originalQuery.toLowerCase().split(/\s+/).filter(term => term.length > 2)
    
    const scoredSentences = sentences.map(sentence => {
      const sentenceLower = sentence.toLowerCase()
      
      // Score based on query term matches
      const termScore = queryTerms.reduce((sum, term) => {
        return sum + (sentenceLower.includes(term) ? 1 : 0)
      }, 0)
      
      // Score based on government/Ethiopia relevance
      const govScore = sentenceLower.includes('government') ||
                      sentenceLower.includes('ministry') ||
                      sentenceLower.includes('ethiopia') ||
                      sentenceLower.includes('ኢትዮጵያ') ? 2 : 0
      
      // Score based on document/service keywords
      const docScore = sentenceLower.includes('document') ||
                      sentenceLower.includes('license') ||
                      sentenceLower.includes('certificate') ||
                      sentenceLower.includes('permit') ? 1 : 0
      
      const totalScore = termScore + govScore + docScore
      
      return {
        sentence,
        score: totalScore,
        length: sentence.length,
        isShort: sentence.length < 100,
        hasNumbers: /\d/.test(sentence)
      }
    })
    
    // Select best sentences for summary
    const relevantSentences = scoredSentences
      .filter(({ score, isShort }) => score > 0 && isShort) // Prefer short, relevant sentences
      .sort((a, b) => {
        // Sort by score, then by length (shorter first), then by presence of numbers
        if (b.score !== a.score) return b.score - a.score
        if (a.length !== b.length) return a.length - b.length
        return b.hasNumbers ? 1 : -1
      })
      .slice(0, 5)
      .map(({ sentence }) => sentence)
    
    // Fallback to first sentences if no relevant ones
    if (relevantSentences.length === 0) {
      relevantSentences.push(...sentences.filter(s => s.length < 150).slice(0, 3))
    }
    
    // Extract key terms using NLP
    const keyTerms = doc.nouns().out('array')
      .concat(doc.adjectives().out('array'))
      .filter(term => term.split(' ').length <= 2)
      .filter(term => !isCommonWord(term))
      .map(term => term.toLowerCase())
      .filter((term, index, array) => array.indexOf(term) === index) // Remove duplicates
      .slice(0, 15)
    
    // Extract entities
    const entities = {
      people: doc.people().out('array'),
      places: doc.places().out('array'),
      organizations: doc.organizations().out('array'),
      dates: doc.dates().out('array'),
      numbers: doc.numbers().out('array')
    }
    
    // Calculate overall confidence
    const avgResultConfidence = results.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / results.length
    const coverageConfidence = Math.min(1, relevantSentences.length / 3)
    const finalConfidence = (avgResultConfidence * 0.6) + (coverageConfidence * 0.4)
    
    // Generate recommendations
    const recommendation = generateEnhancedRecommendation(originalQuery, relevantSentences, knowledgeGraph)
    
    // Create comprehensive summary
    const summary = {
      keyPoints: relevantSentences,
      keyTerms,
      entities,
      confidence: finalConfidence,
      sources: [...new Set(results.map(r => r.source))],
      totalResults: results.length,
      topResult: results[0] || null,
      knowledgeGraph,
      recommendation,
      searchQuery: originalQuery,
      timestamp: new Date().toISOString()
    }
    
    return summary
    
  } catch (error) {
    console.error('Error summarizing search results:', error)
    return null
  }
}

// Enhanced recommendation generator
function generateEnhancedRecommendation(query, keyPoints, knowledgeGraph) {
  const queryLower = query.toLowerCase()
  const keyPointsText = keyPoints.join(' ').toLowerCase()
  
  // Government/Ethiopia specific recommendations
  if (queryLower.includes('ethiopia') || 
      queryLower.includes('ኢትዮጵያ') ||
      keyPointsText.includes('ethiopia') ||
      keyPointsText.includes('ኢትዮጵያ')) {
    
    if (queryLower.includes('license') || queryLower.includes('permit') || queryLower.includes('ብቃት')) {
      return 'For official Ethiopian license/permit information, visit the Ethiopian Investment Commission (investmentcommission.gov.et) or relevant ministry websites.'
    }
    
    if (queryLower.includes('document') || queryLower.includes('ሰነድ')) {
      return 'For Ethiopian document services, visit the Federal Government of Ethiopia portal (www.ethiopia.gov.et) or the specific ministry responsible for your document type.'
    }
    
    if (queryLower.includes('business') || queryLower.includes('ንግድ')) {
      return 'For Ethiopian business registration and services, visit the Ministry of Trade and Regional Integration (mot.gov.et) or Ethiopian Investment Commission.'
    }
    
    return 'For accurate Ethiopian government information, please consult official portals: www.ethiopia.gov.et or relevant ministry websites.'
  }
  
  // General recommendations
  if (queryLower.includes('how to') || queryLower.includes('procedure')) {
    return 'This appears to be a procedural query. For official procedures, please consult relevant government websites or contact the appropriate ministry.'
  }
  
  if (queryLower.includes('form') || queryLower.includes('template')) {
    return 'Official forms and templates are typically available on government service portals. Look for the "Downloads" or "Forms" section on relevant ministry websites.'
  }
  
  if (queryLower.includes('requirement') || queryLower.includes('required')) {
    return 'For specific requirements, please refer to the official guidelines published by the relevant authority. Requirements often vary by document type and jurisdiction.'
  }
  
  if (knowledgeGraph) {
    return `Based on available information about "${knowledgeGraph.name || 'this topic'}", please verify details with official sources.`
  }
  
  return 'For the most accurate and up-to-date information, please consult official government sources or contact the relevant authorities directly.'
}

// Check if word is common
function isCommonWord(word) {
  const commonWords = [
    'document', 'file', 'paper', 'information', 'data',
    'service', 'system', 'process', 'analysis', 'review',
    'government', 'ministry', 'official', 'public',
    'the', 'and', 'for', 'with', 'that', 'this', 'from',
    'about', 'when', 'where', 'how', 'what', 'which',
    'can', 'will', 'would', 'should', 'could', 'may'
  ]
  
  return commonWords.includes(word.toLowerCase())
}

// Clear search cache
export function clearSearchCache() {
  searchCache.clear()
  console.log('🗑️ Search cache cleared')
}

// Get cache statistics
export function getCacheStats() {
  return {
    size: searchCache.size,
    entries: Array.from(searchCache.entries()).map(([key, value]) => ({
      key: key.substring(0, 50) + '...',
      age: Date.now() - value.timestamp,
      dataSize: JSON.stringify(value.data).length
    }))
  }
}
export function generateSearchQuery(message, entities) {
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
export function enhanceIntentsWithSearch(intents, searchSummary) {
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
// Generate response based on search results
export function generateSearchBasedResponse(searchSummary, originalQuery, language) {
  const { keyPointsz, keyTerms, recommendation, confidence } = searchSummary
 const keyPoints = simulateSearchResults(originalQuery,2)
 localStorage.setItem('keyPoints',JSON.stringify(keyPoints))
  let response = ''
  
  if (language === 'am') {
    response = `🔍 በ"${originalQuery}" ላይ ያገኘሁትን መረጃ:\n\n`
    
    if (keyPoints && keyPoints.length > 0) {
      response += `**ዋና ነጥቦች:**\n`
      keyPoints.slice(0, 3).forEach((point, i) => {
        response += `${i + 1}. ${point['snippet']}\n`
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

// Enhanced processMessage function (existing, now uses Google search)
export async function processGOOGLEsearch(intents,message, isFile) {
  // ... existing processGOOGLEsearch implementation ...
  // Add this after intent extraction:
  
  const isUnclearIntent = intents.length === 0 || 
                         intents.includes('general') || 
                         (intents.length === 1 && intents[0] === 'analyzeDocument')
  
  let searchSummary = null
 if (isUnclearIntent && intents.length > 5) {
    console.log('🌐 Intent unclear, performing Google search...')
    
    const searchQuery = generateSearchQuery(intents, entities)
    const searchResult = await searchWebForUnknownIntent(searchQuery, {
      language: localStorage.getItem('agig-language') || 'en',
      useGoogle: true
    })
    
    if (searchResult.success && searchResult.summary) {
      searchSummary = searchResult.summary
      
      // Update intents based on search results
      const enhancedIntents = enhanceIntentsWithSearch(intents, searchSummary)
      if (enhancedIntents.length > 0) {
        intents.push(...enhancedIntents.filter(i => !intents.includes(i)))
      }
    }
  } else console.error();
  
  return(enhancedIntents)
  // ... rest of existing function ...
}

// ... rest of existing functions (setupIntentPatterns, extractIntents, etc.) ...

// Export enhanced googleSearch with Google API
export const googleSearch = {
  init: initGOOGLEsearch,
  setGoogleCredentials,
  searchWebForUnknownIntent,
  clearSearchCache,
  getCacheStats,
  generateSearchQuery,
  simulateSearchResults,
  generateSearchBasedResponse,
  // Existing functions
  processGOOGLEsearch,
 /* handleBusinessLicenseInput,
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
  */
  // Configuration
  config: {
    google: GOOGLE_SEARCH_CONFIG,
    duckduckgo: DUCKDUCKGO_CONFIG
  }
}