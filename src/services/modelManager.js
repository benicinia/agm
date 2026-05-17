// services/modelManager.js
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { CapacitorSQLite } from '@capacitor-community/sqlite'

let isNative = Capacitor.isNativePlatform()

// Model URLs (using smaller Q8 quantized versions)
const MODELS = {
  colbert: {
    url: 'https://huggingface.co/jinaai/jina-colbert-v1-en/resolve/main/onnx/model_quantized.onnx',
    filename: 'colbert_q8.onnx',
    size: 4.2 * 1024 * 1024, // 4.2MB
  },
  leaf: {
    url: 'https://huggingface.co/oldenrem/LEAF-resume/resolve/main/model_quantized.onnx',
    filename: 'leaf_q8.onnx',
    size: 66 * 1024 * 1024, // 66MB
  },
  distilbert: {
    url: 'https://huggingface.co/distilbert-base-uncased/resolve/main/onnx/model_quantized.onnx',
    filename: 'distilbert_q8.onnx',
    size: 154 * 1024 * 1024, // 154MB
  }
}

const MODEL_DIR = 'agig_models'

export function isNativePlatform() {
  return isNative
}

export async function ensureModelsOnDevice(progressCallback) {
  if (!isNative) {
    // Browser mode - return CDN URLs
    return {
      colbert: MODELS.colbert.url,
      leaf: MODELS.leaf.url,
      distilbert: MODELS.distilbert.url
    }
  }

  // Android mode - check if models exist in filesystem
  try {
    // Ensure directory exists
    await Filesystem.mkdir({
      path: MODEL_DIR,
      directory: Directory.Data,
      recursive: true
    }).catch(() => {})

    const localPaths = {}
    
    for (const [modelName, modelInfo] of Object.entries(MODELS)) {
      const filePath = `${MODEL_DIR}/${modelInfo.filename}`
      
      try {
        // Check if file exists
        const stat = await Filesystem.stat({
          path: filePath,
          directory: Directory.Data
        })
        
        if (stat.size === modelInfo.size) {
          console.log(`✅ ${modelName} already exists on device`)
          localPaths[modelName] = filePath
          continue
        }
      } catch (error) {
        console.log(`📥 ${modelName} not found, downloading...`)
      }
      
      // Download model
      if (progressCallback) {
        progressCallback({
          modelId: modelName,
          status: 'downloading',
          progress: 0
        })
      }
      
      const downloaded = await downloadFile(
        modelInfo.url,
        filePath,
        (progress) => {
          if (progressCallback) {
            progressCallback({
              modelId: modelName,
              status: 'downloading',
              progress: progress
            })
          }
        }
      )
      
      if (downloaded) {
        localPaths[modelName] = filePath
        console.log(`✅ ${modelName} downloaded to ${filePath}`)
      } else {
        throw new Error(`Failed to download ${modelName}`)
      }
    }
    
    if (progressCallback) {
      progressCallback({
        modelId: 'all',
        status: 'ready',
        progress: 1
      })
    }
    
    return localPaths
    
  } catch (error) {
    console.error('Error ensuring models on device:', error)
    throw error
  }
}

async function downloadFile(url, filePath, progressCallback) {
  try {
    // Use fetch to download the file
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const totalSize = parseInt(response.headers.get('content-length') || '0')
    const reader = response.body.getReader()
    const chunks = []
    let receivedSize = 0
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      chunks.push(value)
      receivedSize += value.length
      
      if (progressCallback && totalSize > 0) {
        const progress = receivedSize / totalSize
        progressCallback(progress)
      }
    }
    
    // Combine chunks
    const blob = new Blob(chunks)
    const base64 = await blobToBase64(blob)
    
    // Save to filesystem
    await Filesystem.writeFile({
      path: filePath,
      data: base64,
      directory: Directory.Data,
      recursive: true
    })
    
    return true
    
  } catch (error) {
    console.error(`Download failed for ${url}:`, error)
    return false
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      // Remove the data URL prefix
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function getModelDownloadStatus() {
  if (!isNative) {
    return { allDownloaded: false, models: {} }
  }
  
  const status = {
    allDownloaded: true,
    models: {}
  }
  
  for (const [modelName, modelInfo] of Object.entries(MODELS)) {
    const filePath = `${MODEL_DIR}/${modelInfo.filename}`
    
    try {
      const stat = await Filesystem.stat({
        path: filePath,
        directory: Directory.Data
      })
      
      const isDownloaded = stat.size === modelInfo.size
      status.models[modelName] = isDownloaded
      if (!isDownloaded) status.allDownloaded = false
      
    } catch (error) {
      status.models[modelName] = false
      status.allDownloaded = false
    }
  }
  
  return status
}

export async function startModelDownload(progressCallback) {
  try {
    const localPaths = await ensureModelsOnDevice(progressCallback)
    return { success: true, paths: localPaths }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deleteModels() {
  if (!isNative) return false
  
  try {
    await Filesystem.rmdir({
      path: MODEL_DIR,
      directory: Directory.Data,
      recursive: true
    })
    console.log('🗑️ Models deleted from device')
    return true
  } catch (error) {
    console.error('Failed to delete models:', error)
    return false
  }
}