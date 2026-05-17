import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  // Detect if building for GitHub Pages
  //const isGitHubPages = mode === 'github-pages' || process.env.GITHUB_PAGES === 'true'
  //const baseUrl = isGitHubPages ? '/agm/' : '/'
   const baseUrl = '/agm/'
  return {
    base: baseUrl,
    plugins: [
      preact(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30MB limit
          globPatterns: ['**/*.{js,css,html,wasm,wasm.js,webmanifest}'],
          // Exclude very large files that should be downloaded on demand
          globIgnores: [
            '**/tesseract-core.wasm*',
            '**/ort-wasm*.wasm',
            '**/magick.wasm',
            '**/*.onnx',  // Don't cache model files
            '**/*.model'   // Don't cache downloaded models
          ]
        },
        manifest: {
          name: 'AGIG Document Analyzer',
          short_name: 'AGIG',
          description: 'Advanced Document Analysis PWA with AI',
          theme_color: '#667eea',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: baseUrl,
          scope: baseUrl,
          icons: [
            {
              src: 'icons/icon-72.png',
              sizes: '72x72',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'icons/icon-96.png',
              sizes: '96x96',
              type: 'image/png'
            },
            {
              src: 'icons/icon-128.png',
              sizes: '128x128',
              type: 'image/png'
            },
            {
              src: 'icons/icon-144.png',
              sizes: '144x144',
              type: 'image/png'
            },
            {
              src: 'icons/icon-152.png',
              sizes: '152x152',
              type: 'image/png'
            },
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/icon-384.png',
              sizes: '384x384',
              type: 'image/png'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    server: {
      host: '0.0.0.0', // Makes dev server accessible on LAN
      port: 5173,
      strictPort: false,
      // Proxy for API requests during development
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      // Ensure wasm files are handled correctly
      assetsInlineLimit: 0, // Don't inline any assets as base64
      chunkSizeWarningLimit: 1000, // Increase warning limit for large chunks
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate large WASM-related chunks
            'wasm-runtime': ['onnxruntime-web', '@huggingface/transformers'],
            'ocr-engine': ['tesseract.js'],
            'pdf-processor': ['pdfjs-dist'],
            'nlp-models': ['compromise'],
            'vendor': ['preact', 'preact-router']
          }
        }
      }
    },
    optimizeDeps: {
      exclude: ['onnxruntime-web', '@huggingface/transformers'],
      include: ['tesseract.js', 'pdfjs-dist', 'compromise']
    },
    // Ensure proper MIME types for WASM files
    resolve: {
      alias: {
        // Add any aliases if needed
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    // Environment variables for different builds
    define: {
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_IS_GITHUB_PAGES': JSON.stringify(isGitHubPages),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0')
    }
  }
})