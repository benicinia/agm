import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

const MODEL_CONFIGS = {
  'mdbr-leaf-mt': {
    name: 'mdbr-leaf-mt',
    displayName: 'mdbr-leaf-mt (Q8)',
    url: 'https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx',
    size: 66 * 1024 * 1024,
    version: '1.0.0',
    type: 'embedding'
  },
  'colbert': {
    name: 'colbert',
    displayName: 'Retrieval ColBERT Q8',
    url: 'https://huggingface.co/sentence-transformers/msmarco-distilbert-base-v4/resolve/main/onnx/model_quantized.onnx',
    size: 4.2 * 1024 * 1024,
    version: '1.0.0',
    type: 'retrieval'
  }
}

export class ModelDownloader {
  constructor() {
    this.downloadProgress = {}
    this.modelsDir = 'agig_models'
    this.isNativeAndroid = false
  }

  async detectPlatform() {
    // Check if running in Capacitor native environment
    const isCapacitor = Capacitor.isNativePlatform()
    
    if (!isCapacitor) {
      console.log('💻 Running in browser - models will NOT be downloaded')
      this.isNativeAndroid = false
      return false
    }
    
    // Check if platform is Android
    try {
      const platform = Capacitor.getPlatform()
      this.isNativeAndroid = platform === 'android'
      console.log(`📱 Capacitor platform: ${platform}, isAndroid: ${this.isNativeAndroid}`)
      
      if (!this.isNativeAndroid) {
        console.log('📱 Not Android (iOS or other) - models will NOT be downloaded')
      } else {
        console.log('🤖 Android detected - models WILL be downloaded')
      }
      
      return this.isNativeAndroid
    } catch (error) {
      console.error('Platform detection failed:', error)
      this.isNativeAndroid = false
      return false
    }
  }

  async ensureDirectory() {
    if (!this.isNativeAndroid) return true
    
    try {
      await Filesystem.mkdir({
        path: this.modelsDir,
        directory: Directory.Data,
        recursive: true
      })
      console.log('✅ Models directory ready on Android')
    } catch (error) {
      console.log('Directory exists or error:', error)
    }
  }

  async isModelDownloaded(modelKey) {
    if (!this.isNativeAndroid) return false
    
    try {
      const result = await Filesystem.stat({
        path: `${this.modelsDir}/${modelKey}.model`,
        directory: Directory.Data
      })
      return result.type === 'file' && result.size > 0
    } catch {
      return false
    }
  }

  async saveModelMetadata(modelKey, metadata) {
    if (!this.isNativeAndroid) return
    
    try {
      await Filesystem.writeFile({
        path: `${this.modelsDir}/${modelKey}.meta.json`,
        data: JSON.stringify(metadata),
        directory: Directory.Data
      })
    } catch (error) {
      console.error('Failed to save metadata:', error)
    }
  }

  async loadModelMetadata(modelKey) {
    if (!this.isNativeAndroid) return null
    
    try {
      const result = await Filesystem.readFile({
        path: `${this.modelsDir}/${modelKey}.meta.json`,
        directory: Directory.Data
      })
      return JSON.parse(result.data)
    } catch {
      return null
    }
  }

  async downloadModel(modelKey, onProgress) {
    // CRITICAL: Only download on Android
    if (!this.isNativeAndroid) {
      console.log('💻 Skipping model download - not on Android')
      return true
    }
    
    const config = MODEL_CONFIGS[modelKey]
    
    // Check if already downloaded
    const isDownloaded = await this.isModelDownloaded(modelKey)
    if (isDownloaded) {
      console.log(`✅ ${config.displayName} already downloaded on Android`)
      onProgress?.(100, config.size, config.size)
      return true
    }

    await this.ensureDirectory()

    console.log(`📥 Downloading ${config.displayName} (${(config.size / 1024 / 1024).toFixed(1)} MB) on Android...`)

    try {
      const response = await fetch(config.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
      const contentLength = parseInt(response.headers.get('content-length') || config.size)
      const reader = response.body.getReader()
      
      const chunks = []
      let receivedLength = 0
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        chunks.push(value)
        receivedLength += value.length
        
        const percent = (receivedLength / contentLength) * 100
        onProgress?.(percent, receivedLength, contentLength)
      }
      
      // Combine all chunks
      const blob = new Blob(chunks)
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Convert to regular array for Filesystem.writeFile
      const dataArray = Array.from(uint8Array)
      
      // Save model file
      await Filesystem.writeFile({
        path: `${this.modelsDir}/${modelKey}.model`,
        data: dataArray,
        directory: Directory.Data
      })
      
      // Save metadata
      await this.saveModelMetadata(modelKey, {
        version: config.version,
        size: config.size,
        downloadedAt: Date.now(),
        url: config.url
      })
      
      console.log(`✅ ${config.displayName} downloaded and saved to Android (${(dataArray.length / 1024 / 1024).toFixed(1)} MB)`)
      return true
      
    } catch (error) {
      console.error(`❌ Failed to download ${config.displayName}:`, error)
      throw error
    }
  }

  async loadModel(modelKey) {
    if (!this.isNativeAndroid) {
      console.log(`💻 Browser mode - returning mock model for ${modelKey}`)
      return new ArrayBuffer(1024) // Return dummy buffer for browser
    }
    
    try {
      const config = MODEL_CONFIGS[modelKey]
      const isDownloaded = await this.isModelDownloaded(modelKey)
      
      if (!isDownloaded) {
        console.log(`Model ${modelKey} not downloaded on Android yet`)
        return null
      }
      
      const result = await Filesystem.readFile({
        path: `${this.modelsDir}/${modelKey}.model`,
        directory: Directory.Data
      })
      
      // Convert back to ArrayBuffer
      const uint8Array = new Uint8Array(result.data)
      console.log(`✅ Loaded ${config.displayName} on Android: ${(uint8Array.length / 1024 / 1024).toFixed(1)} MB`)
      
      return uint8Array.buffer
      
    } catch (error) {
      console.error(`Failed to load model ${modelKey}:`, error)
      return null
    }
  }

  async downloadAllModels(onProgress) {
    // CRITICAL: Skip if not Android
    if (!this.isNativeAndroid) {
      console.log('💻 Browser/PC detected - skipping all model downloads')
      return true
    }
    
    console.log('🤖 Starting model downloads for Android...')
    const models = ['mdbr-leaf-mt', 'colbert']
    let completed = 0
    
    for (const modelKey of models) {
      try {
        await this.downloadModel(modelKey, (percent, loaded, total) => {
          onProgress?.(modelKey, percent, loaded, total, completed, models.length)
        })
        completed++
        onProgress?.(modelKey, 100, MODEL_CONFIGS[modelKey].size, MODEL_CONFIGS[modelKey].size, completed, models.length)
      } catch (error) {
        console.error(`Failed to download ${modelKey}:`, error)
        throw error
      }
    }
    
    return true
  }

  async getModelStatus() {
    const status = {}
    for (const modelKey of Object.keys(MODEL_CONFIGS)) {
      status[modelKey] = {
        name: MODEL_CONFIGS[modelKey].displayName,
        downloaded: await this.isModelDownloaded(modelKey),
        size: MODEL_CONFIGS[modelKey].size
      }
    }
    return status
  }
}

export const modelDownloader = new ModelDownloader()