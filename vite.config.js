import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command, mode }) => {
  // Force GitHub Pages base for production builds
  const baseUrl = '/agig2/'
  
  return {
    base: baseUrl,
    plugins: [
      preact(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,wasm,wasm.js,webmanifest}'],
          globIgnores: [
            '**/tesseract-core.wasm*',
            '**/ort-wasm*.wasm',
            '**/magick.wasm',
            '**/*.onnx',
            '**/*.model'
          ]
        },
        manifest: {
          name: 'AGIG Document Analyzer',
          short_name: 'AGIG',
          description: 'Advanced Document Analysis PWA with AI',
          theme_color: '#667eea',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/agig2/',
          scope: '/agig2/',
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
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
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
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
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
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat'
      }
    },
    define: {
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'import.meta.env.VITE_IS_GITHUB_PAGES': JSON.stringify(true),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0')
    }
  }
})