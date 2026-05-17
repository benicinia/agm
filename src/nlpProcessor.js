// nlpProcessor.js
// ─────────────────────────────────────────────────────────────────────────────
// Three-model NLP pipeline running fully on-device via Web Worker:
//
//   1. ColBERT  Q8  ~4.2MB  → semantic retrieval + memory embeddings
//   2. LEAF     Q8  ~66MB   → zero-shot intent classification
//   3. DistilBERT Q8 ~154MB → answer / slot extraction
//
// Models are downloaded once to Android device storage via Capacitor Filesystem
// (bypassing the 50MB browser cache limit), then loaded from local file:// URIs.
// In browser/dev mode they fall back to HuggingFace CDN automatically.
//
// All heavy inference runs in bert.worker.js — main thread / UI never freezes.
// Original IFTMS flow logic from nlpP.js is fully preserved.
// ─────────────────────────────────────────────────────────────────────────────

import * as pdfjsLib  from 'pdfjs-dist/build/pdf'
import pdfjsWorker    from 'pdfjs-dist/build/pdf.worker?url'
import nlp            from 'compromise'
import { apiHandler } from './API'
import { db }         from './database.js'
import { teSsAna }    from './tess.js'
import { teSsAnaC }   from './tessC.js'
import { pdfAnalyzerF } from './pdfAnalyzer.js'
import { pdfAnalyzerD } from '../services/pdfAnalyzer2.js'
import { generateSearchBasedResponse } from './duck.js'
import { intentPatternsx } from './intnts.js'
import { ensureModelsOnDevice, onModelProgress, isNativePlatform } from './modelManager.js'
import {
  isActionButtonText, setupIntentPatterns, processStepInput,
  generateContinuationHTML, isContinuationMessage, extractIntents,
  isResumeButton, extractEntities, extractTextFromPDF, extractLicenseNumber,
  analyzeSentiment, shouldRequestFileUpload, determineResponseType,
  generateContextualResponse, setupStepResponses, getIftmsResponse,
  getGreetingResponse, getHelpResponse, getThanksResponse, getGeneralResponse,
  addSentimentTone, handleActionButton, isBusinessLicenseNumber,
  analyzeDocumentContent, validateNationalIdDetailed,
  isVehicleChassisNumber, isNationalId, handleBusinessLicenseInput
} from './nlpP.js'

// ─── PDF.js worker ─────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CANDIDATE LABELS  (built from intnts.js — no hardcoding)
// ═══════════════════════════════════════════════════════════════════════════════
const ETHIOPIC_RE        = /[\u1200-\u137F]/
const PHRASES_PER_INTENT = 3
const CLASSIFY_THRESHOLD = 0.40   // LEAF confidence minimum
const EXTRACT_THRESHOLD  = 0.30   // DistilBERT answer confidence minimum
const RECALL_THRESHOLD   = 0.72   // ColBERT semantic memory match threshold

function buildCandidateLabels(patterns) {
  const labelToIntent = {}
  const intentLabels  = {}
  for (const [intent, phrases] of Object.entries(patterns)) {
    const english = phrases
      .filter(p => !ETHIOPIC_RE.test(p) && p.trim().length > 2)
      .slice(0, PHRASES_PER_INTENT)
    if (!english.length) continue
    const label = english.join(' / ')
    labelToIntent[label] = intent
    intentLabels[intent] = label
  }
  return { labelToIntent, intentLabels }
}

const { labelToIntent, intentLabels } = buildCandidateLabels(intentPatternsx)
const CANDIDATE_LABELS = Object.keys(labelToIntent)

const PRIMARY_INTENTS   = new Set(['iftms','renewDoc','analyzeResearch','analyzeLegal','analyzeGovernment','analyzeFinancial','classifyDocument','generateVideo'])
const SECONDARY_INTENTS = new Set(['greeting','thanks','help'])
const TERTIARY_INTENTS  = new Set(['status','summaryRequest','keywordRequest','structureRequest','affirm','deny'])

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — WEB WORKER BRIDGE
// ═══════════════════════════════════════════════════════════════════════════════
let _worker        = null
let _workerReady   = false
let _workerLoading = false
let _pendingCalls  = new Map()
let _callIdSeq     = 0

// Progress event callbacks for App.jsx loading screen
const _workerProgressCbs = []
export function onWorkerProgress(cb) { _workerProgressCbs.push(cb) }

function emitWorkerProgress(data) {
  for (const cb of _workerProgressCbs) { try { cb(data) } catch {} }
}

function getWorker() {
  if (_worker) return _worker

  // bert.worker.js must be in the same src/services/ directory
  // Vite resolves ?worker automatically; for Capacitor builds use the
  // explicit URL so it gets bundled correctly.
  _worker = new Worker(new URL('./bert.worker.js', import.meta.url), { type: 'module' })

  _worker.onmessage = (e) => {
    const { id, type, result, error, model, status, progress } = e.data

    // Progress broadcasts (id may be null)
    if (type === 'LOAD_PROGRESS') {
      console.log(`⏳ [${model}] ${status}${progress != null ? ' ' + (progress * 100).toFixed(0) + '%' : ''}`)
      emitWorkerProgress({ model, status, progress })
      // Also resolve the specific LOAD_MODELS call when all done
      if (id != null) {
        const p = _pendingCalls.get(id)
        if (p && type === 'LOAD_DONE') { _pendingCalls.delete(id); p.resolve(true) }
      }
      return
    }

    if (type === 'LOAD_DONE') {
      _workerReady = true
      console.log('✅ All models loaded in worker')
      emitWorkerProgress({ model: 'all', status: 'ready', progress: 1 })
      const p = _pendingCalls.get(id)
      if (p) { _pendingCalls.delete(id); p.resolve(true) }
      return
    }

    const pending = _pendingCalls.get(id)
    if (!pending) return
    _pendingCalls.delete(id)
    if (error) pending.reject(new Error(error))
    else       pending.resolve(result)
  }

  _worker.onerror = (err) => {
    console.error('bert.worker error:', err)
    for (const [, p] of _pendingCalls) p.reject(err)
    _pendingCalls.clear()
  }

  return _worker
}

function callWorker(type, payload, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const id = ++_callIdSeq
    _pendingCalls.set(id, { resolve, reject })
    getWorker().postMessage({ id, type, payload })
    setTimeout(() => {
      if (_pendingCalls.has(id)) {
        _pendingCalls.delete(id)
        reject(new Error(`Worker timeout: ${type} after ${timeoutMs}ms`))
      }
    }, timeoutMs)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — MODEL DOWNLOAD + LOAD  (Capacitor on Android, CDN in browser)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadModelsInWorker() {
  if (_workerReady)   return true
  if (_workerLoading) {
    await new Promise(resolve => {
      const t = setInterval(() => { if (_workerReady) { clearInterval(t); resolve() } }, 300)
    })
    return true
  }

  _workerLoading = true
  console.log('📥 Ensuring models on device…')

  try {
    // Step 1: download to device storage (or verify already downloaded)
    const localPaths = await ensureModelsOnDevice((evt) => {
      emitWorkerProgress({ model: evt.modelId, status: evt.status, progress: evt.progress })
    })

    // Step 2: tell the worker where to load them from
    await callWorker('LOAD_MODELS', {
      colbertPath:    localPaths.colbert,
      leafPath:       localPaths.leaf,
      distilbertPath: localPaths.distilbert,
    }, 300000)   // 5 min timeout for first load of 154MB model

    return true

  } catch (err) {
    console.error('Model load failed:', err)
    _workerLoading = false
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — SEMANTIC MEMORY  (ColBERT embeddings, max 40 entries)
// ═══════════════════════════════════════════════════════════════════════════════
const semanticMemory = []
const MEMORY_LIMIT   = 40

function cosine(a, b) {
  let dot = 0, mA = 0, mB = 0
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; mA += a[i]*a[i]; mB += b[i]*b[i] }
  return dot / (Math.sqrt(mA) * Math.sqrt(mB))
}

async function remember(input, output) {
  if (!_workerReady) return
  try {
    const emb = await callWorker('EMBED', { text: input }, 8000)
    semanticMemory.push({ input, output, emb, ts: Date.now() })
    if (semanticMemory.length > MEMORY_LIMIT) semanticMemory.shift()
  } catch { /* non-critical */ }
}

async function recall(input) {
  if (!_workerReady || !semanticMemory.length) return null
  try {
    const inputEmb = await callWorker('EMBED', { text: input }, 8000)
    let best = { sim: 0, mem: null }
    for (const m of semanticMemory) {
      const sim = cosine(inputEmb, m.emb)
      if (sim > best.sim) best = { sim, mem: m }
    }
    return best.sim >= RECALL_THRESHOLD ? best.mem : null
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — THREE-MODEL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

// 5a. LEAF: intent classification
async function classifyIntent(text, doc) {
  if (!_workerReady) {
    console.warn('⚠️  Models not ready — rule-based fallback')
    return extractIntents(doc)
  }

  let label, score
  try {
    const r = await callWorker('CLASSIFY', { text, labels: CANDIDATE_LABELS }, 15000)
    label = r.label
    score = r.score
    console.log(`🎯 LEAF → "${labelToIntent[label] || 'general'}"  ${(score*100).toFixed(1)}%`)
  } catch (err) {
    console.error('LEAF classify error:', err)
    return extractIntents(doc)
  }

  if (score < CLASSIFY_THRESHOLD) {
    console.log('📉 LEAF low confidence — rule-based fallback')
    return extractIntents(doc)
  }

  const topIntent = labelToIntent[label] || 'general'
  const obj = {
    primary:[], secondary:[], tertiary:[], all:[],
    main: topIntent, isPrimary:false, isSecondary:false, isTertiary:false
  }

  if (PRIMARY_INTENTS.has(topIntent)) {
    obj.primary.push(topIntent); obj.all.push(topIntent); obj.isPrimary = true
    sessionStorage.setItem('intnt', topIntent)
    sessionStorage.setItem('currentService', topIntent)
    const cs = sessionStorage.getItem('currentStep')
    if (!cs || cs === '0' || cs === 'null') sessionStorage.setItem('currentStep', '1')

  } else if (SECONDARY_INTENTS.has(topIntent)) {
    obj.secondary.push(topIntent); obj.all.push(topIntent); obj.isSecondary = true
    const ex = sessionStorage.getItem('intnt')
    if (!ex || ex === 'general') sessionStorage.setItem('intnt', topIntent)

  } else if (TERTIARY_INTENTS.has(topIntent)) {
    obj.tertiary.push(topIntent); obj.all.push(topIntent); obj.isTertiary = true

  } else {
    obj.all.push('general')
    obj.main = sessionStorage.getItem('intnt') || 'general'
  }

  return obj
}

// 5b. DistilBERT: extract specific values from user message
// context = a prompt describing what we're looking for
async function extractSlot(question, context) {
  if (!_workerReady) return null
  try {
    const r = await callWorker('EXTRACT', { question, context }, 10000)
    if (r.score >= EXTRACT_THRESHOLD) return r.answer
    return null
  } catch { return null }
}

// 5c. ColBERT: retrieve most relevant passages from a corpus
// Used for document analysis to pull relevant sections
async function retrievePassages(query, passages, topK = 3) {
  if (!_workerReady || !passages.length) return []
  try {
    return await callWorker('RETRIEVE', { query, passages, topK }, 12000)
  } catch { return [] }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — STATE
// ═══════════════════════════════════════════════════════════════════════════════
let initialized             = false
let currentIntent           = null
let currentStep             = null
let awaitingBusinessLicense = null
let awaitingVehicleInfo     = null
let awaitingInsInfo         = null
let isLibreValidated        = null
let awaitingDriverInfo      = null
let awaitingOTP             = false
let isDriverValidated       = null
let iSbizValid              = null
let isInsValidated          = null
let isIftmsInit             = false
let ocrBackend              = true
let intentPatterns          = {}
let stepResponses           = {}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — INIT
// ═══════════════════════════════════════════════════════════════════════════════
export async function initNLPProcessor() {
  if (initialized) return
  console.log('🔄 Initializing NLP Processor…')
  setupIntentPatterns()
  setupStepResponses()
  initialized = true
  console.log(`✅ NLP Processor initialized — ${CANDIDATE_LABELS.length} intent labels`)
  console.log(`📱 Platform: ${isNativePlatform() ? 'Android (Capacitor)' : 'Browser/Dev'}`)

  // Download + load models in background — App.jsx loading screen shows progress
  loadModelsInWorker().catch(console.error)
}

function ensureInitialized() {
  if (!initialized) initNLPProcessor()
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — chat()
// ═══════════════════════════════════════════════════════════════════════════════
export async function chat(msg, file) {
  ensureInitialized()

  if (file) {
    if (file.type.startsWith('image/')) {
      console.log('🖼️ Image detected, initialising OCR…')
      const result = await teSsAnaC.analyzeDocument(file)
      if (result.detectedDocument['Vehicle Registration Document'] && awaitingVehicleInfo) {
        const sv = parseInt(sessionStorage.getItem('currentStep')) || 1
        const ns = sv + 1
        sessionStorage.setItem('currentStep', ns.toString())
        sessionStorage.setItem('isLibreValidated', 'true')
        return await processMessage(`continue to step ${ns}`, null, false, false)
      }
      return teSsAnaC.analyzeDocument(file)

    } else if (file.type === 'application/pdf') {
      return await pdfAnalyzerF.analyzeDocument(file)
    } else {
      throw new Error('Unsupported file type.')
    }

  } else if (msg && typeof msg === 'string') {
    if (isBusinessLicenseNumber(msg)) {
      if (awaitingBusinessLicense) {
        sessionStorage.setItem('currentStep', '2')
        sessionStorage.setItem('licenseValidated', 'true')
        return await processMessage('continue to step 2', null, false, false)
      }
      return await processMessage(`continue to step ${currentStep}`, null, false, false)

    } else if (isVehicleChassisNumber(msg)) {
      if (awaitingVehicleInfo) {
        const sv = parseInt(sessionStorage.getItem('currentStep')) || 1
        const ns = sv + 1
        sessionStorage.setItem('currentStep', ns.toString())
        sessionStorage.setItem('isLibreValidated', 'true')
        return await processMessage(`continue to step ${ns}`, null, false, false)
      }
      return await processMessage(`continue to step ${currentStep}`, null, false, false)

    } else if (isNationalId(msg).isValid) {
      const sv = parseInt(sessionStorage.getItem('currentStep')) || 1
      const ns = sv + 1
      sessionStorage.setItem('currentStep', ns.toString())
      sessionStorage.setItem('isDriverValidated', 'true')
      return await processMessage(`continue to step ${ns}`, null, false, false)

    } else {
      return await processMessage(msg, null, false, false)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — processMessage()
// ═══════════════════════════════════════════════════════════════════════════════
export async function processMessage(message, text, isFile, isImg) {
  ensureInitialized()

  if (isFile) { await extractLicenseNumber(text); iSbizValid = true }
  if (isImg)  { sessionStorage.setItem('isLibreV', true) }

  // ── Continuation ───────────────────────────────────────────────────────────
  if (message && isContinuationMessage(message)) {
    const stepMatch  = message.match(/step\s*(\d+)/i)
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : (parseInt(sessionStorage.getItem('currentStep')) || 1)
    currentStep = stepNumber
    sessionStorage.setItem('currentStep', stepNumber.toString())
    const currentService = sessionStorage.getItem('currentService') || 'iftms'
    const stepR = await processStepInput([currentService], currentStep, 'neutral', '', localStorage.getItem('agig-language') || 'en', false)
    return {
      text:         stepR.text,
      html:         generateContinuationHTML(stepR, currentStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true,
      responseType: 'continuation',
      stepData:     stepR,
    }
  }

  if (message && isActionButtonText(message)) return handleActionButton(message)
  if (message && isResumeButton(message)) {
    return { text: 'Continuing from where we left off…', html: `<div class="continue-message">Continuing from where we left off…</div>`, isStructured: false, responseType: 'continue' }
  }
  if (message && isBusinessLicenseNumber(message)) {
    awaitingBusinessLicense = false; iSbizValid = true
    return handleActionButton('verify and continue')
  }
  if (message && isVehicleChassisNumber(message)) {
    awaitingVehicleInfo = false; isLibreValidated = true
    return handleActionButton('Upload Driver Documents')
  }

  // ── Main NLP pipeline ──────────────────────────────────────────────────────
  if (message) {
    const doc       = nlp(message)
    const entities  = extractEntities(doc)
    const sentiment = analyzeSentiment(doc)

    // ColBERT: recall past similar exchange
    const pastMemory = await recall(message)
    if (pastMemory) console.log(`🧠 Recalled: "${pastMemory.input}" → intent:${pastMemory.output?.intent}`)

    // LEAF: classify intent
    const intentResult = await classifyIntent(message, doc)

    // DistilBERT: extract any specific slot values if it's a primary service intent
    let extractedSlot = null
    if (intentResult.isPrimary && _workerReady) {
      // Build a context string from the message + past memory
      const context = pastMemory
        ? `${pastMemory.input} ${message}`
        : message
      extractedSlot = await extractSlot('What is the user requesting or providing?', context)
      if (extractedSlot) console.log(`🔍 DistilBERT extracted slot: "${extractedSlot}"`)
    }

    // ── Intent routing ─────────────────────────────────────────────────────
    currentStep = sessionStorage.getItem('currentStep')
    const existingService = sessionStorage.getItem('currentIntent') || sessionStorage.getItem('intnt') || 'general'
    let primaryIntent = intentResult.main

    if (intentResult.isSecondary || intentResult.isTertiary) {
      primaryIntent = existingService
    } else if (!intentResult.isPrimary) {
      primaryIntent = existingService
    }

    if (currentIntent !== primaryIntent && intentResult.isPrimary) {
      currentIntent = primaryIntent
      sessionStorage.setItem('currentIntent', currentIntent)
      sessionStorage.setItem('currentService', currentIntent)
      if (primaryIntent === 'iftms') {
        currentStep = 1
        sessionStorage.setItem('currentStep', currentStep)
        isIftmsInit = true; awaitingOTP = false; awaitingBusinessLicense = true
      }
    }

    const storedStep = sessionStorage.getItem('currentStep')
    if (storedStep) currentStep = parseInt(storedStep)

    // ── Secondary intent responses ─────────────────────────────────────────
    if (intentResult.isSecondary) {
      const sec = intentResult.secondary[0]
      if (sec === 'greeting') {
        const r = getGreetingResponse(sentiment)
        await remember(message, { intent: 'greeting' })
        return { text: r, html: `<div class="greeting-response">${r}</div>`, isStructured: false, responseType: 'greeting' }
      }
      if (sec === 'thanks') {
        const r = getThanksResponse()
        await remember(message, { intent: 'thanks' })
        return { text: r, html: `<div class="thanks-response">${r}</div>`, isStructured: false, responseType: 'thanks' }
      }
      if (sec === 'help') {
        const r = getHelpResponse()
        await remember(message, { intent: 'help' })
        return { text: r, html: r, isStructured: true, responseType: 'help' }
      }
    }

    // ── IFTMS flow ─────────────────────────────────────────────────────────
    if (currentIntent === 'iftms') {
      const isDriverValidatedS = sessionStorage.getItem('isDriverValidated') === 'true'
      const isLibreValidatedS  = sessionStorage.getItem('isLibreValidated')  === 'true'

      if (!isIftmsInit && !awaitingBusinessLicense) {
        isIftmsInit = true; awaitingBusinessLicense = true; currentStep = 1
        sessionStorage.setItem('currentStep', currentStep)
      }
      if (!awaitingBusinessLicense && iSbizValid && !isLibreValidatedS && currentStep < 2) {
        currentStep = 2; sessionStorage.setItem('currentStep', currentStep); awaitingVehicleInfo = true
      }
      if (iSbizValid && awaitingVehicleInfo && currentStep < 3) {
        currentStep = 3; sessionStorage.setItem('currentStep', currentStep)
      }
      if (isDriverValidatedS && !isInsValidated && currentStep < 4) {
        currentStep = 4; sessionStorage.setItem('currentStep', currentStep)
        awaitingBusinessLicense = false; awaitingVehicleInfo = false; awaitingDriverInfo = false
      }

      const iftmsResponse = await getIftmsResponse(
        currentIntent, currentStep, sentiment, message,
        localStorage.getItem('agig-language') || 'en', isFile
      )

      await remember(message, { intent: 'iftms', step: currentStep, slot: extractedSlot })

      return generateContextualResponse({
        currentStep, intents: [currentIntent], sentiment, processedText: message,
        awaitingInput: true, language: localStorage.getItem('agig-language') || 'en',
        shouldUploadFile: false, responseType: 'iftms', customResponse: iftmsResponse,
        pastContext: pastMemory?.output, extractedSlot,
      })

    } else {
      // ── Non-IFTMS ──────────────────────────────────────────────────────
      const responseType = determineResponseType(intentResult.all)
      if (responseType && (intentResult.all.length === 0 || intentResult.all.includes('general'))) {
        return generateSearchBasedResponse(responseType, message, localStorage.getItem('agig-language') || 'en')
      }
      const result = generateContextualResponse({
        intents: Array.isArray(intentResult) ? intentResult : [intentResult],
        currentStep: null, entities, sentiment, processedText: message,
        shouldUploadFile: false, responseType, awaitingInput: false,
        pastContext: pastMemory?.output, extractedSlot,
      })
      await remember(message, { intent: intentResult.main, slot: extractedSlot })
      return result
    }
  }

  return { text: 'How can I help you?', html: '<div>How can I help you?</div>', isStructured: false, responseType: 'default' }
}

// ─── Public exports ────────────────────────────────────────────────────────────
export { retrievePassages, extractSlot }   // available to pdfAnalyzer etc.
export const nlpProcessor = { init: initNLPProcessor, chat, processMessage }
