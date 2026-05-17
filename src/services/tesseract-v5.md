Complete Frontend Implementation:
javascript
class PDFAnalyzer {
    constructor() {
        this.pdfjsLib = window['pdfjs-dist/build/pdf'];
        this.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdfjs-/build/pdf.worker.min';
        
        // Tesseract.js v5
        this.tesseract = Tesseract;
        this.tesseractWorker = null;
    }

    async init() {
        console.log('Initializing Tesseract.js v5...');
        
        try {
            // Initialize with English language only (smaller download)
            this.tesseractWorker = await Tesseract.createWorker('eng', 1, {
                logger: progress => {
                    console.log('OCR Progress:', progress);
                    this.updateOCRProgress(progress);
                },
                // Optional: Reduce bundle size
                workerBlobURL: false,
                cacheMethod: 'refresh'
            });
            
            console.log('Tesseract.js v5 initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Tesseract initialization failed:', error);
            return false;
        }
    }

    async performOCR(imageFile) {
        if (!this.tesseractWorker) {
            await this.init();
        }

        try {
            console.log('Starting OCR processing...');
            
            const { data: { text } } = await this.tesseractWorker.recognize(imageFile, {
                // Optimize for document text
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ሀ-ፕ -.,:'
            });
            
            console.log('OCR completed. Text length:', text.length);
            return text || '';
            
        } catch (error) {
            console.error('OCR processing failed:', error);
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    updateOCRProgress(progress) {
        // Update UI with OCR progress
        const progressEl = document.getElementById('ocr-progress');
        if (progressEl && progress.status === 'recognizing text') {
            const percent = Math.round(progress.progress * 100);
            progressEl.textContent = `OCR Processing: ${percent}%`;
            progressEl.style.width = `${percent}%`;
        }
    }

    // Modified to handle both PDF and images
    async analyzeDocument(file) {
        try {
            this.showLoading(true);
            
            let text = '';
            let usedOCR = false;
            
            if (file.type.startsWith('image/')) {
                // Direct image OCR
                text = await this.performOCR(file);
                usedOCR = true;
            } else if (file.type === 'application/pdf') {
                // Try PDF text extraction first, then OCR fallback
                const fileBuffer = await file.arrayBuffer();
                text = await this.extractTextFromPDF(fileBuffer);
                
                // If little text found, use OCR
                if (text.trim().length < 50) {
                    console.log('Low text content, using OCR fallback...');
                    text = await this.performOCR(file);
                    usedOCR = true;
                }
            } else {
                throw new Error('Unsupported file type');
            }
            
            const analysis = this.classifyDocument(text, file.name);
            analysis.fileName = file.name;
            analysis.fileSize = file.size;
            analysis.usedOCR = usedOCR;
            analysis.pages = analysis.pages || 1;
            
            await db.saveDocument(analysis);
            this.showLoading(false);
            return analysis;
            
        } catch (error) {
            this.showLoading(false);
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    async destroy() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
        }
    }
}
HTML Setup for Tesseract.js v5:
html
<!DOCTYPE html>
<html>
<head>
    <title>Document Analyzer with OCR</title>
    <style>
        .progress-bar {
            width: 100%;
            background-color: #f0f0f0;
            border-radius: 4px;
            margin: 10px 0;
        }
        .progress-fill {
            height: 20px;
            background-color: #4CAF50;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div id="loading" style="display: none;">
        <p>Processing Document...</p>
        <div class="progress-bar">
            <div id="ocr-progress" class="progress-fill" style="width: 0%"></div>
        </div>
    </div>
    
    <input type="file" id="document-upload" accept=".pdf,.jpg,.jpeg,.png,.tiff">
    
    <!-- Tesseract.js v5 from CDN -->
    <script src="https://unpkg.com/tesseract.js@5.0.4/dist/tesseract.min.js"></script>
    
    <!-- PDF.js -->
    <script src="js/pdfjs/build/pdf.min.js"></script>
    
    <script src="pdf-analyzer.js"></script>
    <script>
        const pdfAnalyzer = new PDFAnalyzer();
        
        document.addEventListener('DOMContentLoaded', async () => {
            await pdfAnalyzer.init();
            
            document.getElementById('document-upload').addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const analysis = await pdfAnalyzer.analyzeDocument(file);
                        console.log('Analysis result:', analysis);
                        // Display results to user
                    } catch (error) {
                        console.error('Analysis error:', error);
                        alert('Error: ' + error.message);
                    }
                }
            });
        });

        // Cleanup
        window.addEventListener('beforeunload', () => {
            pdfAnalyzer.destroy();
        });
    </script>
</body>
</html>
Key Advantages of Tesseract.js v5 for Frontend:
Smaller Initial Load: Only downloads necessary language data

Better Performance: Optimized WebAssembly

Progress Tracking: Built-in progress reporting

Modern API: Clean, promise-based interface

TypeScript Support: Better development experience

Language Support:
For Ethiopian documents, you might want Amharic support:

javascript
// Initialize with multiple languages
this.tesseractWorker = await Tesseract.createWorker('eng+amh', 1, {
    logger: m => console.log(m)
});
Note: Adding Amharic will increase download size significantly. Start with English only and add Amharic if needed.

Bundle Size Considerations:
English only: ~800KB

English + Amharic: ~2-3MB

All languages: ~40MB+ (not recommended for frontend)

I recommend starting with Tesseract.js v5 with English only, as it provides the best balance of features and performance for frontend use.

