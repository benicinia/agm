// nlpProcessor.js
// ─── Added on top of original logic ───────────────────────────────────────────
// 1. Device capacity assessment  → selects 14MB / 44MB / 420MB BERT model
// 2. Web Worker offload          → BERT runs in bert.worker.js, UI never freezes
// 3. Semantic memory             → cosine-similarity recall of past exchanges
// 4. Candidate labels            → built dynamically from intentPatternsx (intnts.js)
// 5. Rule-based fallback         → if BERT unavailable or low confidence
// All original nlpP.js / flow logic is preserved exactly.
// ──────────────────────────────────────────────────────────────────────────────

import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import nlp from 'compromise'
import { apiHandler } from './API'
import { db } from './database.js'
import { teSsAna } from "./tess.js"
import { teSsAnaC } from "./tessC.js"
import { pdfAnalyzerF } from './pdfAnalyzer.js'
import { pdfAnalyzerD } from '../services/pdfAnalyzer2.js'
import { generateSearchBasedResponse } from './duck.js'
import { intentPatternsx } from './intnts.js'
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
} from "./nlpP.js"

// ─── PDF.js worker ─────────────────────────────────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// ═══════════════════════════════════════════════════════════════════════════════
// 1. DEVICE CAPACITY ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════
const deviceProfile = {
  ram:      navigator.deviceMemory        || 4,
  cores:    navigator.hardwareConcurrency || 2,
  isMobile: /Android|iPhone|iPad/i.test(navigator.userAgent)
}

// Three model tiers — same names as sample code, quantized ONNX via transformers.js
const BERT_MODELS = {
  low:  { name: 'Xenova/distilbert-base-uncased',                          size: 14,  minRam: 0.5, task: 'zero-shot-classification' },
  mid:  { name: 'Xenova/distilbert-base-uncased-mnli',                     size: 44,  minRam: 1,   task: 'zero-shot-classification' },
  high: { name: 'Xenova/nli-deberta-v3-small',                             size: 120, minRam: 4,   task: 'zero-shot-classification' }
}

function selectModel() {
  if (deviceProfile.ram < 2 || deviceProfile.isMobile)           return BERT_MODELS.low
  if (deviceProfile.ram >= 4 && deviceProfile.cores >= 4)        return BERT_MODELS.high
  return BERT_MODELS.mid
}

const selectedModel = selectModel()
console.log(`📱 Device: ${deviceProfile.ram}GB RAM, ${deviceProfile.cores} cores, mobile=${deviceProfile.isMobile}`)
console.log(`🤖 Selected BERT model: ${selectedModel.name} (${selectedModel.size}MB)`)

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CANDIDATE LABELS from intentPatternsx
// ═══════════════════════════════════════════════════════════════════════════════
const ETHIOPIC_RE       = /[\u1200-\u137F]/
const PHRASES_PER_INTENT = 3
const CONFIDENCE_THRESHOLD = 0.42

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
// 3. WEB WORKER BRIDGE
//    All heavy BERT + embedding work runs in bert.worker.js
//    Messages: { type, payload } → { type, result } or { type, error }
// ═══════════════════════════════════════════════════════════════════════════════
let _worker      = null
let _workerReady = false
let _pendingCalls = new Map()   // id → { resolve, reject }
let _callIdCounter = 0

function getWorker() {
  if (_worker) return _worker

  // Inline worker source as a Blob so no extra file needed at build time.
  // The worker imports transformers.js from the CDN (works in modern browsers).
  const workerSrc = `
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';
env.allowRemoteModels = true;
env.useBrowserCache   = true;

let classifier  = null;
let embedder    = null;
let modelName   = null;
let modelSize   = 44;

// cosine similarity helper
function cosine(a, b) {
  let dot=0, mA=0, mB=0;
  for (let i=0;i<a.length;i++){dot+=a[i]*b[i];mA+=a[i]*a[i];mB+=b[i]*b[i];}
  return dot/(Math.sqrt(mA)*Math.sqrt(mB));
}

self.onmessage = async (e) => {
  const { id, type, payload } = e.data;
  try {
    switch(type) {

      case 'LOAD': {
        modelName = payload.modelName;
        modelSize = payload.modelSize;
        self.postMessage({ id, type:'LOAD_PROGRESS', result: 'loading' });

        classifier = await pipeline('zero-shot-classification', modelName, { quantized: true });
        embedder   = await pipeline('feature-extraction',       'Xenova/distilbert-base-uncased', { quantized: true });

        self.postMessage({ id, type:'LOAD_DONE', result: modelSize });
        break;
      }

      case 'CLASSIFY': {
        if (!classifier) throw new Error('Model not loaded');
        const r = await classifier(payload.text, payload.labels, { multi_label: false });
        self.postMessage({ id, type:'CLASSIFY_RESULT', result: { label: r.labels[0], score: r.scores[0] } });
        break;
      }

      case 'EMBED': {
        if (!embedder) throw new Error('Embedder not loaded');
        const out = await embedder(payload.text, { pooling: 'mean' });
        self.postMessage({ id, type:'EMBED_RESULT', result: Array.from(out.data) });
        break;
      }

      default:
        self.postMessage({ id, type:'ERROR', error: 'Unknown message type: '+type });
    }
  } catch(err) {
    self.postMessage({ id, type:'ERROR', error: err.message });
  }
};
`
  const blob = new Blob([workerSrc], { type: 'application/javascript' })
  const url  = URL.createObjectURL(blob)
  _worker    = new Worker(url, { type: 'module' })

  _worker.onmessage = (e) => {
    const { id, type, result, error } = e.data

    // Progress broadcasts (no id match needed)
    if (type === 'LOAD_PROGRESS') {
      console.log(`⏳ BERT worker loading ${selectedModel.name}…`)
      return
    }
    if (type === 'LOAD_DONE') {
      _workerReady = true
      console.log(`✅ BERT worker ready — ${result}MB model loaded`)
    }

    const pending = _pendingCalls.get(id)
    if (!pending) return
    _pendingCalls.delete(id)

    if (error) pending.reject(new Error(error))
    else       pending.resolve(result)
  }

  _worker.onerror = (err) => {
    console.error('BERT worker error:', err)
    // Reject all pending
    for (const [, p] of _pendingCalls) p.reject(err)
    _pendingCalls.clear()
  }

  return _worker
}

function callWorker(type, payload, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const id = ++_callIdCounter
    _pendingCalls.set(id, { resolve, reject })
    getWorker().postMessage({ id, type, payload })
    setTimeout(() => {
      if (_pendingCalls.has(id)) {
        _pendingCalls.delete(id)
        reject(new Error(`Worker timeout: ${type}`))
      }
    }, timeoutMs)
  })
}

let _modelLoading = false
async function ensureModelLoaded() {
  if (_workerReady) return true
  if (_modelLoading) {
    // Poll until ready
    await new Promise(resolve => {
      const t = setInterval(() => { if (_workerReady) { clearInterval(t); resolve() } }, 200)
    })
    return true
  }
  _modelLoading = true
  try {
    await callWorker('LOAD', { modelName: selectedModel.name, modelSize: selectedModel.size }, 120000)
    return true
  } catch (err) {
    console.error('Model load failed:', err)
    _modelLoading = false
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SEMANTIC MEMORY  (embeddings stored in-memory, max 30 entries)
// ═══════════════════════════════════════════════════════════════════════════════
const semanticMemory = []   // { input, output, emb, ts }
const MEMORY_LIMIT   = 30
const RECALL_THRESHOLD = 0.72

async function remember(input, output) {
  try {
    const emb = await callWorker('EMBED', { text: input }, 10000)
    semanticMemory.push({ input, output, emb, ts: Date.now() })
    if (semanticMemory.length > MEMORY_LIMIT) semanticMemory.shift()
  } catch { /* non-critical — skip silently */ }
}

function cosine(a, b) {
  let dot=0, mA=0, mB=0
  for (let i=0;i<a.length;i++){dot+=a[i]*b[i];mA+=a[i]*a[i];mB+=b[i]*b[i]}
  return dot/(Math.sqrt(mA)*Math.sqrt(mB))
}

async function recall(input) {
  if (!semanticMemory.length) return null
  try {
    const inputEmb = await callWorker('EMBED', { text: input }, 10000)
    let best = { sim: 0, mem: null }
    for (const m of semanticMemory) {
      const sim = cosine(inputEmb, m.emb)
      if (sim > best.sim) best = { sim, mem: m }
    }
    return best.sim >= RECALL_THRESHOLD ? best.mem : null
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BERT INTENT CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
async function classifyIntentWithBERT(text, doc) {
  const loaded = await ensureModelLoaded()
  if (!loaded) {
    console.warn('⚠️  BERT unavailable — rule-based fallback')
    return extractIntents(doc)
  }

  let topLabel, topScore
  try {
    const r = await callWorker('CLASSIFY', { text, labels: CANDIDATE_LABELS }, 12000)
    topLabel = r.label
    topScore = r.score
  } catch (err) {
    console.error('BERT classify error:', err)
    return extractIntents(doc)
  }

  const topIntent = labelToIntent[topLabel] || 'general'
  console.log(`🎯 BERT → "${topIntent}"  ${(topScore*100).toFixed(1)}%  "${topLabel}"`)

  if (topScore < CONFIDENCE_THRESHOLD) {
    console.log('📉 Low confidence — rule-based fallback')
    return extractIntents(doc)
  }

  const intentsObj = {
    primary:[], secondary:[], tertiary:[], all:[],
    main: topIntent, isPrimary:false, isSecondary:false, isTertiary:false
  }

  if (PRIMARY_INTENTS.has(topIntent)) {
    intentsObj.primary.push(topIntent); intentsObj.all.push(topIntent); intentsObj.isPrimary = true
    sessionStorage.setItem('intnt', topIntent)
    sessionStorage.setItem('currentService', topIntent)
    const cs = sessionStorage.getItem('currentStep')
    if (!cs || cs==='0' || cs==='null') sessionStorage.setItem('currentStep','1')

  } else if (SECONDARY_INTENTS.has(topIntent)) {
    intentsObj.secondary.push(topIntent); intentsObj.all.push(topIntent); intentsObj.isSecondary = true
    const ex = sessionStorage.getItem('intnt')
    if (!ex || ex==='general') sessionStorage.setItem('intnt', topIntent)

  } else if (TERTIARY_INTENTS.has(topIntent)) {
    intentsObj.tertiary.push(topIntent); intentsObj.all.push(topIntent); intentsObj.isTertiary = true

  } else {
    intentsObj.all.push('general')
    intentsObj.main = sessionStorage.getItem('intnt') || 'general'
  }

  return intentsObj
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. STATE  (unchanged from original)
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
// 7. INIT
// ═══════════════════════════════════════════════════════════════════════════════
export async function initNLPProcessor() {
  if (initialized) return
  console.log('🔄 Initializing NLP Processor…')
  setupIntentPatterns()
  setupStepResponses()
  initialized = true
  console.log('✅ NLP Processor initialized')
  console.log(`📋 ${CANDIDATE_LABELS.length} BERT candidate labels from intentPatternsx`)
  // Warm up worker in background — UI stays responsive
  ensureModelLoaded().catch(console.error)
}

function ensureInitialized() {
  if (!initialized) initNLPProcessor()
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. chat()  — unchanged logic, BERT replaces extractIntents() inside processMessage
// ═══════════════════════════════════════════════════════════════════════════════
export async function chat(msg, file) {
  ensureInitialized()

  if (file) {
    if (file.type.startsWith('image/')) {
      console.log('🖼️ Image detected, initialising OCR…')
      const result = await teSsAnaC.analyzeDocument(file)
      if (result.detectedDocument['Vehicle Registration Document'] && awaitingVehicleInfo) {
        const currentStepVal = parseInt(sessionStorage.getItem('currentStep')) || 1
        const nextStep = currentStepVal + 1
        sessionStorage.setItem('currentStep', nextStep.toString())
        sessionStorage.setItem('isLibreValidated', 'true')
        return await processMessage(`continue to step ${nextStep}`, null, false, false)
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
        const v = parseInt(sessionStorage.getItem('currentStep')) || 1
        const n = v + 1
        sessionStorage.setItem('currentStep', n.toString())
        sessionStorage.setItem('isLibreValidated', 'true')
        return await processMessage(`continue to step ${n}`, null, false, false)
      }
      return await processMessage(`continue to step ${currentStep}`, null, false, false)

    } else if (isNationalId(msg).isValid) {
      const v = parseInt(sessionStorage.getItem('currentStep')) || 1
      const n = v + 1
      sessionStorage.setItem('currentStep', n.toString())
      sessionStorage.setItem('isDriverValidated', 'true')
      return await processMessage(`continue to step ${n}`, null, false, false)

    } else {
      return await processMessage(msg, null, false, false)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. processMessage()
// ═══════════════════════════════════════════════════════════════════════════════
export async function processMessage(message, text, isFile, isImg) {
  ensureInitialized()

  if (isFile) { await extractLicenseNumber(text); iSbizValid = true }
  if (isImg)  { sessionStorage.setItem('isLibreV', true) }

  // Continuation
  if (message && isContinuationMessage(message)) {
    const stepMatch  = message.match(/step\s*(\d+)/i)
    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : (parseInt(sessionStorage.getItem('currentStep')) || 1)
    currentStep = stepNumber
    sessionStorage.setItem('currentStep', stepNumber.toString())
    const currentService = sessionStorage.getItem('currentService') || 'iftms'
    const stepR = await processStepInput([currentService], currentStep, 'neutral', '', localStorage.getItem('agig-language') || 'en', false)
    return {
      text: stepR.text,
      html: generateContinuationHTML(stepR, currentStep, localStorage.getItem('agig-language') || 'en'),
      isStructured: true, responseType: 'continuation', stepData: stepR
    }
  }

  if (message && isActionButtonText(message)) return handleActionButton(message)
  if (message && isResumeButton(message)) {
    return { text: 'Continuing from where we left off…', html: `<div class="continue-message">Continuing from where we left off…</div>`, isStructured: false, responseType: 'continue' }
  }
  if (message && isBusinessLicenseNumber(message)) { awaitingBusinessLicense=false; iSbizValid=true; return handleActionButton('verify and continue') }
  if (message && isVehicleChassisNumber(message))  { awaitingVehicleInfo=false; isLibreValidated=true; return handleActionButton('Upload Driver Documents') }

  // ── DistilBERT classification (runs in Web Worker — UI never freezes) ────────
  if (message) {
    const doc       = nlp(message)
    const entities  = extractEntities(doc)
    const sentiment = analyzeSentiment(doc)

    // Semantic memory recall — provide past context to response generation
    const pastMemory = await recall(message)
    if (pastMemory) console.log(`🧠 Recalled similar exchange (intent: ${pastMemory.output?.intent})`)

    // BERT classification
    const intentResult = await classifyIntentWithBERT(message, doc)

    currentStep = sessionStorage.getItem('currentStep')
    const existingServiceIntent = sessionStorage.getItem('currentIntent') || sessionStorage.getItem('intnt') || 'general'
    let primaryIntent = intentResult.main

    if (intentResult.isSecondary || intentResult.isTertiary) {
      primaryIntent = existingServiceIntent
    } else if (!intentResult.isPrimary) {
      primaryIntent = existingServiceIntent
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

    // Secondary intent handling
    if (intentResult.isSecondary) {
      const sec = intentResult.secondary[0]
      switch(sec) {
        case 'greeting': {
          const r = getGreetingResponse(sentiment)
          await remember(message, { intent:'greeting' })
          return { text:r, html:`<div class="greeting-response">${r}</div>`, isStructured:false, responseType:'greeting' }
        }
        case 'thanks': {
          const r = getThanksResponse()
          await remember(message, { intent:'thanks' })
          return { text:r, html:`<div class="thanks-response">${r}</div>`, isStructured:false, responseType:'thanks' }
        }
        case 'help': {
          const r = getHelpResponse()
          await remember(message, { intent:'help' })
          return { text:r, html:r, isStructured:true, responseType:'help' }
        }
        default: break
      }
    }

    // IFTMS flow
    if (currentIntent === 'iftms') {
      const licenseValidated   = sessionStorage.getItem('licenseValidated')  === 'true'
      const isDriverValidatedS = sessionStorage.getItem('isDriverValidated') === 'true'
      const isLibreValidatedS  = sessionStorage.getItem('isLibreValidated')  === 'true'

      if (!isIftmsInit && !awaitingBusinessLicense) {
        isIftmsInit=true; awaitingBusinessLicense=true; currentStep=1
        sessionStorage.setItem('currentStep', currentStep)
      }
      if (!awaitingBusinessLicense && iSbizValid && !isLibreValidatedS && currentStep<2) {
        currentStep=2; sessionStorage.setItem('currentStep',currentStep); awaitingVehicleInfo=true
      }
      if (iSbizValid && awaitingVehicleInfo && currentStep<3) {
        currentStep=3; sessionStorage.setItem('currentStep',currentStep)
      }
      if (isDriverValidatedS && !isInsValidated && currentStep<4) {
        currentStep=4; sessionStorage.setItem('currentStep',currentStep)
        awaitingBusinessLicense=false; awaitingVehicleInfo=false; awaitingDriverInfo=false
      }

      const iftmsResponse = await getIftmsResponse(currentIntent, currentStep, sentiment, message, localStorage.getItem('agig-language')||'en', isFile)

      // Store in semantic memory
      await remember(message, { intent:'iftms', step:currentStep })

      return generateContextualResponse({
        currentStep, intents:[currentIntent], sentiment, processedText:message,
        awaitingInput:true, language:localStorage.getItem('agig-language')||'en',
        shouldUploadFile:false, responseType:'iftms', customResponse:iftmsResponse,
        pastContext: pastMemory?.output
      })

    } else {
      const responseType = determineResponseType(intentResult.all)
      if (responseType && (intentResult.all.length===0 || intentResult.all.includes('general'))) {
        return generateSearchBasedResponse(responseType, message, localStorage.getItem('agig-language')||'en')
      }
      const result = generateContextualResponse({
        intents: Array.isArray(intentResult) ? intentResult : [intentResult],
        currentStep:null, entities, sentiment, processedText:message,
        shouldUploadFile:false, responseType, awaitingInput:false,
        pastContext: pastMemory?.output
      })
      await remember(message, { intent: intentResult.main })
      return result
    }
  }

  return { text:'How can I help you?', html:'<div>How can I help you?</div>', isStructured:false, responseType:'default' }
}

// ─── Backward-compat export ────────────────────────────────────────────────────
export const nlpProcessor = { init:initNLPProcessor, chat, processMessage }
