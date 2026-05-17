import { nouns,prepositions,sentenceEnders,verbs,adjectives,names, adverbs,pronouns } from "./data.js";
        class AmharicNLP {
            constructor() {
                this.currentText = '';
                this.analysisResults = null;
                this.isAnalyzing = false;
                this.currentPDF = null;
                this.pdfText = '';
                this.amharicPatterns = this.initializePatterns();
                this.language = 'am';
                
                // PDF.js worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-dist/build/pdf.worker.min.js';
                
                this.init();
            }

            init() {
                this.setupEventListeners();
                this.loadSampleTexts();
                this.updateStatistics();
            }

            initializePatterns() {
                return {
                    // Amharic noun patterns
                    nouns:nouns,
                  names:names,
                    
                    // Amharic verb patterns
                    verbs: verbs,
                    
                    // Amharic pronouns
                    pronouns: pronouns,
                    
                    // Amharic adjectives
                    adjectives: adjectives,
                    
                    // Amharic adverbs
                    adverbs: adverbs,
                    
                    // Amharic prepositions and particles
                    prepositions: prepositions,
                    
                    // Sentence end markers
                    sentenceEnders: sentenceEnders
                };
            }

            setupEventListeners() {
                // File upload
                document.getElementById('fileUploadArea').addEventListener('click', () => {
                    document.getElementById('fileInput').click();
                });

                document.getElementById('fileInput').addEventListener('change', (e) => {
                    this.handleFileUpload(e.target.files[0]);
                });

                // Sample text selection
                document.getElementById('sampleText').addEventListener('change', (e) => {
                    this.loadSelectedSample(e.target.value);
                });

                // Analyze button
                document.getElementById('analyzeBtn').addEventListener('click', () => {
                    this.analyzeText();
                });

                // Preview PDF button
                document.getElementById('previewPDFBtn').addEventListener('click', () => {
                    this.showPDFPreview();
                });

                // Clear button
                document.getElementById('clearBtn').addEventListener('click', () => {
                    this.clearAll();
                });

                // Tab switching
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        
                        e.target.classList.add('active');
                        const tabId = e.target.dataset.tab + '-tab';
                        document.getElementById(tabId).classList.add('active');
                        
                        // Handle PDF view tab
                        if (e.target.dataset.tab === 'pdfview' && this.currentPDF) {
                            this.displayPDFView();
                        }
                    });
                });

                // Text input updates
                document.getElementById('textInput').addEventListener('input', () => {
                    this.updateStatistics();
                });
            }

            async handleFileUpload(file) {
                if (!file) return;

                const fileInfo = document.getElementById('selectedFile');
                const previewBtn = document.getElementById('previewPDFBtn');
                const fileName = file.name;
                const fileSize = (file.size / 1024).toFixed(2);
                const fileType = file.type;
                
                fileInfo.innerHTML = `
                    <strong>${fileName}</strong><br>
                    <small>${fileSize} KB | ${fileType}</small>
                `;
                fileInfo.style.color = 'var(--success-color)';

                this.showProgress('Reading file...', 30);

                try {
                    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
                        await this.processPDFFile(file);
                        previewBtn.style.display = 'flex';
                    } else if (file.type === 'text/plain' || fileName.endsWith('.txt')) {
                        const text = await file.text();
                        document.getElementById('textInput').value = text;
                        this.currentPDF = null;
                        previewBtn.style.display = 'none';
                    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                        // For Word documents, we'll read as text (simple approach)
                        const text = await this.readTextFile(file);
                        document.getElementById('textInput').value = text;
                        this.currentPDF = null;
                        previewBtn.style.display = 'none';
                    } else {
                        // Try to read as text anyway
                        const text = await file.text();
                        document.getElementById('textInput').value = text;
                        this.currentPDF = null;
                        previewBtn.style.display = 'none';
                    }

                    this.showProgress('File loaded successfully', 100);
                    setTimeout(() => {
                        this.updateStatistics();
                        this.hideProgress();
                    }, 500);

                } catch (error) {
                    console.error('Error reading file:', error);
                    fileInfo.innerHTML = '<span style="color: var(--accent-color);">Error reading file</span>';
                    previewBtn.style.display = 'none';
                    this.hideProgress();
                    this.showNotification(`Error reading file: ${error.message}`, 'error');
                }
            }

            async processPDFFile(file) {
                try {
                    // Read the file as ArrayBuffer
                    const arrayBuffer = await file.arrayBuffer();
                    
                    // Load the PDF document
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    
                    this.currentPDF = pdf;
                    
                    // Extract text from PDF
                    this.showProgress('Extracting text from PDF...', 50);
                    this.pdfText = await this.extractTextFromPDF(pdf);
                    
                    // Update text input with extracted text
                    document.getElementById('textInput').value = this.pdfText;
                    
                    // Show PDF preview if option is checked
                    if (document.getElementById('showPDFPreview').checked) {
                        await this.displayPDFPreview();
                    }
                    
                    this.showNotification(`PDF loaded successfully: ${pdf.numPages} pages`, 'success');
                    
                } catch (error) {
                    console.error('Error processing PDF:', error);
                    throw new Error(`Failed to process PDF: ${error.message}`);
                }
            }

            async extractTextFromPDF(pdf) {
                let fullText = '';
                const extractAllPages = document.getElementById('extractAllPages').checked;
                const maxPages = extractAllPages ? pdf.numPages : Math.min(pdf.numPages, 10);
                
                for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                    this.showProgress(`Extracting page ${pageNum}/${maxPages}...`, 50 + (pageNum / maxPages) * 40);
                    
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    let pageText = '';
                    
                    // Process text items
                    for (const item of textContent.items) {
                        if (item.str && item.str.trim()) {
                            pageText += item.str + ' ';
                        }
                    }
                    
                    // Add page separator
                    if (pageText.trim()) {
                        fullText += pageText.trim() + '\n\n';
                    }
                    
                    // Add delay to prevent blocking
                    if (pageNum % 5 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
                
                return fullText.trim();
            }

            async displayPDFPreview() {
                const previewContainer = document.getElementById('pdfPreview');
                const previewContent = document.getElementById('pdfPreviewContent');
                
                if (!this.currentPDF) return;
                
                previewContainer.style.display = 'block';
                previewContent.innerHTML = '';
                
                const extractAllPages = document.getElementById('extractAllPages').checked;
                const maxPages = extractAllPages ? Math.min(this.currentPDF.numPages, 5) : 1;
                
                for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
                    const page = await this.currentPDF.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    let pageText = '';
                    for (const item of textContent.items) {
                        if (item.str && item.str.trim()) {
                            pageText += item.str + ' ';
                        }
                    }
                    
                    if (pageText.trim()) {
                        const pageElement = document.createElement('div');
                        pageElement.className = 'pdf-page';
                        pageElement.innerHTML = `
                            <div class="pdf-page-number">Page ${pageNum}</div>
                            <div class="pdf-page-content amharic-text">${pageText.trim()}</div>
                        `;
                        previewContent.appendChild(pageElement);
                    }
                }
            }

            async displayPDFView() {
                const viewContainer = document.getElementById('pdfViewContent');
                
                if (!this.currentPDF) {
                    viewContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-file-pdf"></i>
                            <h4>No PDF Document</h4>
                            <p>Upload a PDF file to view it here</p>
                        </div>
                    `;
                    return;
                }
                
                this.showProgress('Loading PDF view...', 30);
                
                try {
                    let html = `
                        <div style="background: var(--bg-hover); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                <i class="fas fa-info-circle"></i> PDF Information
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                                <div>
                                    <strong>Total Pages:</strong> ${this.currentPDF.numPages}
                                </div>
                                <div>
                                    <strong>PDF Version:</strong> ${this.currentPDF.pdfInfo?.PDFFormatVersion || 'N/A'}
                                </div>
                                <div>
                                    <strong>Text Extracted:</strong> ${this.pdfText.split(' ').length} words
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Show first few pages in detail
                    const maxPagesToShow = Math.min(this.currentPDF.numPages, 3);
                    
                    for (let pageNum = 1; pageNum <= maxPagesToShow; pageNum++) {
                        this.showProgress(`Loading page ${pageNum}...`, 30 + (pageNum / maxPagesToShow) * 60);
                        
                        const page = await this.currentPDF.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1.0 });
                        const textContent = await page.getTextContent();
                        
                        let pageText = '';
                        const textItems = [];
                        
                        for (const item of textContent.items) {
                            if (item.str && item.str.trim()) {
                                pageText += item.str + ' ';
                                textItems.push({
                                    text: item.str,
                                    x: item.transform[4],
                                    y: viewport.height - item.transform[5]
                                });
                            }
                        }
                        
                        html += `
                            <div class="sentence-structure" style="margin-bottom: 20px;">
                                <h4 style="color: var(--amharic-color); margin-bottom: 15px;">
                                    <i class="fas fa-file"></i> Page ${pageNum} (${textItems.length} text items)
                                </h4>
                                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                                    <div class="amharic-text" style="max-height: 300px; overflow-y: auto;">
                                        ${pageText.trim() || '<em style="color: var(--text-muted);">No text found on this page</em>'}
                                    </div>
                                </div>
                                <div style="margin-top: 15px; font-size: 0.9rem; color: var(--text-secondary);">
                                    <i class="fas fa-chart-bar"></i> Text Analysis:
                                    ${this.analyzePageText(pageText)}
                                </div>
                            </div>
                        `;
                        
                        // Add delay to prevent blocking
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                    
                    if (this.currentPDF.numPages > maxPagesToShow) {
                        html += `
                            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                                <i class="fas fa-ellipsis-h"></i>
                                <p>... and ${this.currentPDF.numPages - maxPagesToShow} more pages</p>
                            </div>
                        `;
                    }
                    
                    viewContainer.innerHTML = html;
                    this.showProgress('PDF view loaded', 100);
                    setTimeout(() => this.hideProgress(), 500);
                    
                } catch (error) {
                    console.error('Error displaying PDF view:', error);
                    viewContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h4>Error Loading PDF</h4>
                            <p>${error.message}</p>
                        </div>
                    `;
                    this.hideProgress();
                }
            }

            analyzePageText(pageText) {
                const words = this.tokenizeAmharic(pageText);
                const pos = this.analyzePartsOfSpeech(words);
                
                return `
                    ${words.length} words, 
                    ${pos.nouns.length} nouns, 
                    ${pos.verbs.length} verbs,
                    ${this.countSentences(pageText)} sentences
                `;
            }

            countSentences(text) {
                return text.split(/[።!?]+/).filter(s => s.trim().length > 0).length;
            }

            async readTextFile(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }

            loadSampleTexts() {
                this.sampleTexts = {
                    fiction: `በአንድ ቀን በሰሜን ኢትዮጵያ በሚገኝ ትንሽ መንደር ውስጥ አቶ ካሳ ተብለው የሚጠሩ ሽማግሌ ይኖሩ ነበር። እሱ በጣም ጥሩ ታሪኮችን የሚነግሩ ሰው ነበሩ። ልጆች ሁሉ በሰአት ሰአት የእሱን ቤት ይጎበኙ ነበር።

አቶ ካሳ የሚነግሯቸው ታሪኮች ሁሉ በጣም አስደሳች እና ጠቃሚ ነበሩ። አንዳንዴ ስለ ጥቁር አንበሳ ይነግሩ፣ አንዳንዴ ደግሞ ስለ ሰማይ ኮከቦች ይናገሩ። ልጆች ሁሉ በሙሉ ትኩረታቸውን ይሰጡት ነበር።

አንድ ቀን አቶ ካሳ ልዩ ታሪክ ጀመሩ። "በጥንት ጊዜ፣" አሉ፣ "አንድ ትንሽ ወፍ በታላቅ ደን ውስጥ ትኖር ነበር። ይህ ወፍ ልዩ ኃይል ነበረው። ከሁሉም የደኑ እንስሳት ጋር በንግግር መገናኘት ቻለ።"`,

                    news: `የኢትዮጵያ መንግሥት አዲስ የትምህርት ፖሊሲ አውጥቷል። ይህ ፖሊሲ የትምህርት ጥራትን ለማሻሻል የተዘጋጀ ነው።

በአዲሱ ፖሊሲ መሰረት ሁሉም ልጆች ነፃ ትምህርት ይኖራቸዋል። መምህራንም ሰፊ ስልጠና ያገኛሉ።

የትምህርት ሚኒስትር አቶ ብርሃኑ ገብረሚካኤል እንደተናገሩት ይህ ፖሊሲ የሀገሪቱን የትምህርት ስርዓት ሙሉ በሙሉ ይለውጣል።`,

                    academic: `የአማርኛ ቋንቋ በሴማዊ ቋንቋዎች ቤተሰብ ውስጥ ይገኛል። ከሁሉም ሴማዊ ቋንቋዎች ውስጥ አማርኛ በዋነኝነት የሚነገረው ቋንቋ ነው።

የአማርኛ ቋንቋ የራሱ የሆነ ፊደል አለው። ይህ ፊደል ግዕዝ ይባላል። ግዕዝ ለአማርኛ ብቻ ሳይሆን ለትግርኛና ለትግሬ የሚጠቀም ፊደል ነው።`,

                    poetry: `በአዲስ አበባ ከተማ አስተዳደር ንግድ ቢሮ Addis Ababa City 
Administration Trade Bureau የግብር ከፋይ መለያ ቁ. /TIN 0068699863 የንግድ ምዝገባ ቁ . AA/GU/07/1/0003814/2012 Principal Registration No. የቀድሞው ንግድ ፈቃድ ቁጥር Previous License No. የንግድ ሥራ ፈቃድ ቁጥር AA/GU/07/14/668/3699484/2012 Business License No. ቀድሞ ተሰጠበት ቀን የንግድ ሥራ ፈቃድ በንግድ ምዝገባና ፈቃድ አዋጅ ቁጥር 980/2008 መሰረት ተሰጠ Previous Date of issuance የተሰጠበት ቀን 13/12/2012 Date of issuance የታደሰበት ቀን : 21/3/2016 Business License Issued Under Commercial Registration and Business license proc.No 980/2016 1. የግለሰቡ/ድርጅቱ ስም አማን ዘይኔ አሊ 1. Owner/Company Name AMAN ZEYNE ALI 2. ዜግነት ኢትዮጵያዊ 2. Nationality Ethiopian 3. የንግድ ስም 3. Trade Name 4. ሥራ አስክያጅ ስም አማን ዘይኔ አሊ 4. General Manager Name AMAN ZEYNE ALI 5. የንግድ ድርጅቱ አድራሻ 5. Business Address ክልል አዲስ አበባ ዞን/ክፍለ ከተማ ጉለሌ Gulele Region Addis Ababa Zone/Sub City ወረዳ 07 ቀበሌ --- --- Woreda 07 Kebele የቤት ቁጥር 246 ስልክ ቁጥር 0945401980 House No. 246 Tel.No 0945401980 ፋክስ ኢ-ሜይል Fax E-mail 6. የንግድ ሥራ መስክ 6. Field of Business (71114)የመንገድና የደረቅ ጭነት አገልግሎት (71114) Transport service by road and dry freight 7. ካፒታል በኢት ብር 3,000.00 7. Capital in ETB 3,000.00 ይህ የንግድ ፈቃድ ዛሬ 21/3/2016 በ አዲስ አበባ ተሰጠ ። This Business License is issued in this day Addis Ababa 12/1/2023 የሃላፊ ስም/Name of Official ፊርማ/Signature በተቋሙ የተረጋገጠ የንግድ ስራ ፈቃድ የምስክር ወረቀት ማህተም 2016 ለ ታድሷል Seal ማሳሰቢያ- 1. ይህ የንግድ ፍቃድ በዓዋጅ ፈቃድ ቁጥር 980/2008 መሠረት እንደ የበጀት ዓመቱ በአዋጅ በተቀመጠው መሰረት መታደስ አለበት። N.B. This License Shall be renewed in accordance with Proclamation No. 980/2008 as per the fiscal year. 2. ይህ የንግድ ፈቃድ የምስክር ወረቀት በዋስትና ወይም በእዳ ሊያዝ አይችልም። The holder of this License is forbidden for surety ship or debt`,

                    legal: `የኢትዮጵያ ብሔራዊ መታወቂያ ፕሮግራም | ወሎሰፈር ቦሌ, የኢትዮ-ቻይና ጎዳና, አዲስ አበባ፣ ኢትዮጵያ | 9779 | Id.gov.et | info@id.et በኢትዮጵያ ዲጂታል መታወቂያ አዋጅ መሠረት (id.et/law) ማንኛውም የካርድ ምስክር ወረቀት ከብሄራዊ መታወቂያ ፕሮግራም ሲስተም (ፋይዳ) ታትሞ የተገኘ ወይም በቀጥታ የሚታተም ህጋዊ የማንነት መገለጫዎች ናቸው። ነዋሪዎች/አገልግሎቶች አቅራቢዎች እራሳቸውን ከአጭበርባሪ/ከተለያዩ የማጭበርበር ድርጊቶች ለመከላከል እና ለመጠበቅ QR ኮዱን ስካን በማድረግ ማረጋገጥ ይችላሉ። በዚህ መታወቂያ ዜግነት፣ አድራሻ እና የልደት ቀንን በተመለከተ የተገለፁት መረጃዎች በተመዝጋቢው መግለጫ መሰረት የተሞሉ ናቸው ፤ የኋላ ታሪክ ማረጋገጫ የላቸውም። As per the Ethiopian Digital ID Proclamation (id.et/law) any card credentials printed or accessed for print directly from the National ID system (Fayda) are valid forms of legal Identity. 01 02 03 Residents/services providers can scan the QR code to verify and protect themselves from fraudulent actors/activities . Personal data fields such as nationality, address, and date of birth provided on this ID, are based on the declarations made by the registrant. Hence, background-check has not been conducted for their authenticity. የትውልድ ቀን | Date of Birth ፆታ | Sex ዜግነት | Nationality ስልክ | Phone Number Demographic Data | የስነ ሕዝብ መረጃ ሙሉ ስም | First, Middle, Surname FCN: Disclaimer | ማሳሰቢያ የኢትዮጵያ ዲጂታል መታወቂያ ካርድ Ethiopian Digital ID Card የኢትዮጵያ ዲጂታል መታወቂያ ካርድ Ethiopian Digital ID Card ዞን/ከተማ አስተዳደር/ክፍለ ከተማ | Zone/City Admin/Sub City | Woreda/City Admin/Kebele ክልል/ከተማ አስተዳደር | Region/City Admin ወረዳ/ከተማ አስተዳደር/ቀበሌ 3649356951460534 አቤንኤዘር አምዴ በቀለ Abenezer Amdie Bekele 13/01/1982 | 1989/09/23 አዲስ አበባ Addis Ababa ወንድ | Male ጉለሌ Gullele ኢትዮጵያዊ Ethiopian ወረዳ 08 Woreda 08 0938260465`,

                    religious: `በመጀመሪያ የነበረ ቃል ነበር፤ ይህም ቃል ከእግዚአብሔር ጋር ነበር፤ ይህም ቃል እግዚአብሔር ነበር።

ይህ በመጀመሪያ ከእግዚአብሔር ጋር ነበር። ሁሉ በእርሱ ሆነ፤ ያለእርሱም ከሆነው ምንም አልሆነም።`
                };
            }

            loadSelectedSample(sampleType) {
                if (sampleType && this.sampleTexts[sampleType]) {
                    document.getElementById('textInput').value = this.sampleTexts[sampleType];
                    this.updateStatistics();
                    this.currentPDF = null;
                    document.getElementById('previewPDFBtn').style.display = 'none';
                }
            }

            showPDFPreview() {
                const preview = document.getElementById('pdfPreview');
                preview.style.display = preview.style.display === 'none' ? 'block' : 'block';
            }

            closePDFPreview() {
                document.getElementById('pdfPreview').style.display = 'none';
            }

            async analyzeText(text) {
                if (this.isAnalyzing) return;
                
               const text = this.text
                if (!text) {
                    this.showNotification('Please enter some Amharic text to analyze', 'warning');
                    return;
                }

                this.currentText = text;
                this.isAnalyzing = true;
                
                this.showProgress('Analyzing text...', 10);
                this.showProgress('Tokenizing words...', 20);

                // Tokenize the text
                const tokens = this.tokenizeAmharic(text);
                
                this.showProgress('Identifying parts of speech...', 40);
                
                // Analyze parts of speech
                const posAnalysis = this.analyzePartsOfSpeech(tokens);
                
                this.showProgress('Analyzing sentence structure...', 60);
                
                // Analyze sentence structure
                const sentenceStructures = this.analyzeSentenceStructure(text);
                
                this.showProgress('Generating word cloud...', 80);
                
                // Generate word frequency
                const wordFrequency = this.calculateWordFrequency(tokens, posAnalysis);
                
                this.analysisResults = {
                    text: text,
                    tokens: tokens,
                    posAnalysis: posAnalysis,
                    sentenceStructures: sentenceStructures,
                    wordFrequency: wordFrequency,
                    statistics: this.calculateStatistics(tokens, posAnalysis),
                    isPDF: !!this.currentPDF,
                    pdfInfo: this.currentPDF ? {
                        pages: this.currentPDF.numPages,
                        version: this.currentPDF.pdfInfo?.PDFFormatVersion
                    } : null
                };
                
                this.showProgress('Finalizing results...', 95);
                
                // Display results
                this.displayResults();
                
                this.showProgress('Analysis complete!', 100);
                
                setTimeout(() => {
                    this.hideProgress();
                    this.isAnalyzing = false;
                    const sourceType = this.currentPDF ? 'PDF document' : 'text';
                    this.showNotification(`Analysis of ${sourceType} completed successfully!`, 'success');
                }, 500);
            }

            // All the other methods remain the same as before...
            // tokenizeAmharic, analyzePartsOfSpeech, matchesPattern, 
            // analyzeSentenceStructure, calculateWordFrequency, 
            // calculateStatistics, displayResults, displayHighlightedText,
            // displayPOSAnalysis, displaySentenceStructure, 
            // generateWordCloud, displayFrequencyTable, etc.

            tokenizeAmharic(text) {
                // Split by spaces and Amharic punctuation
                const words = text.split(/[\s፡።፣፤፥፦!?.,;:()"'\-\u200b]+/);
                return words.filter(word => word.length > 0).map(word => word.trim());
            }

            analyzePartsOfSpeech(tokens) {
                const results = {
                    nouns: [],
                    verbs: [],
                    pronouns: [],
                    adjectives: [],
                    adverbs: [],
                    prepositions: [],
                    others: []
                };

                tokens.forEach(token => {
                    let categorized = false;

                    // Check pronouns first (exact matches)
                    if (this.amharicPatterns.pronouns.includes(token)) {
                        results.pronouns.push({ word: token, confidence: 1.0 });
                        categorized = true;
                    }

                    // Check prepositions (exact matches)
                    if (this.amharicPatterns.prepositions.includes(token)) {
                        results.prepositions.push({ word: token, confidence: 0.9 });
                        categorized = true;
                    }

                    // Check nouns using patterns
                    if (!categorized && this.matchesPattern(token, this.amharicPatterns.nouns)) {
                        results.nouns.push({ word: token, confidence: 0.8 });
                        categorized = true;
                    }

                    // Check verbs using patterns
                    if (!categorized && this.matchesPattern(token, this.amharicPatterns.verbs)) {
                        results.verbs.push({ word: token, confidence: 0.7 });
                        categorized = true;
                    }

                    // Check adjectives
                    if (!categorized && this.matchesPattern(token, this.amharicPatterns.adjectives)) {
                        results.adjectives.push({ word: token, confidence: 0.6 });
                        categorized = true;
                    }

                    // Check adverbs
                    if (!categorized && this.amharicPatterns.adverbs.includes(token)) {
                        results.adverbs.push({ word: token, confidence: 0.5 });
                        categorized = true;
                    }

                    // If not categorized, add to others
                    if (!categorized) {
                        results.others.push({ word: token, confidence: 0.1 });
                    }
                });

                return results;
            }

            matchesPattern(word, patterns) {
                return patterns.some(pattern => {
                    if (pattern.includes('$') || pattern.includes('^')) {
                        // Regex pattern
                        try {
                            const regex = new RegExp(pattern);
                            return regex.test(word);
                        } catch {
                            return false;
                        }
                    } else {
                        // Direct match
                        return word.includes(pattern);
                    }
                });
            }

            analyzeSentenceStructure(text) {
                const sentences = text.split(/[።!?]+/).filter(s => s.trim().length > 0);
                const structures = [];

                sentences.forEach((sentence, index) => {
                    const words = this.tokenizeAmharic(sentence);
                    const pos = this.analyzePartsOfSpeech(words);
                    
                    // Basic sentence structure analysis
                    let structure = {
                        sentence: sentence.trim(),
                        words: words.length,
                        hasSubject: pos.nouns.length > 0 || pos.pronouns.length > 0,
                        hasVerb: pos.verbs.length > 0,
                        hasObject: pos.nouns.length > 1,
                        structure: this.determineSentenceStructure(words, pos)
                    };

                    structures.push(structure);
                });

                return structures;
            }

            determineSentenceStructure(words, posAnalysis) {
                if (posAnalysis.verbs.length === 0) {
                    return "Fragment";
                }

                const hasSubject = posAnalysis.nouns.length > 0 || posAnalysis.pronouns.length > 0;
                const hasObject = posAnalysis.nouns.length > 1;

                if (hasSubject && hasObject) {
                    return "Subject-Verb-Object (SVO)";
                } else if (hasSubject) {
                    return "Subject-Verb (SV)";
                } else if (posAnalysis.verbs.length > 0) {
                    return "Verb-Only (Imperative)";
                }

                return "Unknown";
            }

            calculateWordFrequency(tokens, posAnalysis) {
                const frequency = {};
                
                // Combine all words from pos analysis
                const allWords = [
                    ...posAnalysis.nouns.map(w => w.word),
                    ...posAnalysis.verbs.map(w => w.word),
                    ...posAnalysis.pronouns.map(w => w.word),
                    ...posAnalysis.adjectives.map(w => w.word),
                    ...posAnalysis.adverbs.map(w => w.word),
                    ...posAnalysis.prepositions.map(w => w.word),
                    ...posAnalysis.others.map(w => w.word)
                ];
                
                allWords.forEach(word => {
                    const cleanWord = word.toLowerCase();
                    frequency[cleanWord] = (frequency[cleanWord] || 0) + 1;
                });
                
                // Convert to array and sort
                return Object.entries(frequency)
                    .map(([word, count]) => ({ word, count }))
                    .sort((a, b) => b.count - a.count);
            }

            calculateStatistics(tokens, posAnalysis) {
                const sentences = this.currentText.split(/[።!?]+/).filter(s => s.trim().length > 0);
                
                return {
                    totalWords: tokens.length,
                    totalSentences: sentences.length,
                    totalNouns: posAnalysis.nouns.length,
                    totalVerbs: posAnalysis.verbs.length,
                    totalPronouns: posAnalysis.pronouns.length,
                    totalAdjectives: posAnalysis.adjectives.length,
                    totalAdverbs: posAnalysis.adverbs.length,
                    totalPrepositions: posAnalysis.prepositions.length,
                    avgWordsPerSentence: tokens.length / Math.max(sentences.length, 1)
                };
            }

            displayResults() {
                // Update statistics
                this.updateStatistics();
                
                // Display original text with highlights
                this.displayHighlightedText();
                
                // Display POS analysis
                this.displayPOSAnalysis();
                
                // Display sentence structure
                this.displaySentenceStructure();
                
                // Generate word cloud
                this.generateWordCloud();
                
                // Display frequency table
                this.displayFrequencyTable();
            }

            displayHighlightedText() {
                const container = document.getElementById('originalText');
                const text = this.currentText;
                const words = this.tokenizeAmharic(text);
                const posAnalysis = this.analysisResults.posAnalysis;
                
                // Create a map of word to POS type
                const wordToPos = new Map();
                
                // Map nouns
                posAnalysis.nouns.forEach(noun => {
                    wordToPos.set(noun.word, 'noun');
                });
                
                // Map verbs
                posAnalysis.verbs.forEach(verb => {
                    wordToPos.set(verb.word, 'verb');
                });
                
                // Map pronouns
                posAnalysis.pronouns.forEach(pronoun => {
                    wordToPos.set(pronoun.word, 'pronoun');
                });
                
                // Map adjectives
                posAnalysis.adjectives.forEach(adj => {
                    wordToPos.set(adj.word, 'adjective');
                });
                
                // Map adverbs
                posAnalysis.adverbs.forEach(adv => {
                    wordToPos.set(adv.word, 'adverb');
                });
                
                // Map prepositions
                posAnalysis.prepositions.forEach(prep => {
                    wordToPos.set(prep.word, 'preposition');
                });
                
                // Highlight text
                let highlightedText = text;
                
                // Create spans for each word with appropriate class
                words.forEach(word => {
                    const posType = wordToPos.get(word);
                    if (posType) {
                        const span = `<span class="pos-tag pos-${posType}" title="${this.getPOSTitle(posType)}">${word}</span>`;
                        highlightedText = highlightedText.replace(new RegExp(`\\b${word}\\b`, 'g'), span);
                    }
                });
                
                container.innerHTML = `<div class="amharic-text">${highlightedText}</div>`;
                
                // Add PDF info if applicable
                if (this.analysisResults.isPDF) {
                    container.innerHTML = `
                        <div style="background: var(--amharic-bg); padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                            <i class="fas fa-file-pdf"></i> 
                            <strong>PDF Document Analysis</strong> | 
                            ${this.analysisResults.pdfInfo.pages} pages
                        </div>
                        ${container.innerHTML}
                    `;
                }
            }

            getPOSTitle(posType) {
                const titles = {
                    'noun': 'Noun - ስም',
                    'verb': 'Verb - ግሥ',
                    'pronoun': 'Pronoun - ተውሳክ',
                    'adjective': 'Adjective - ቅጽል',
                    'adverb': 'Adverb - ተጨማሪ ቃል',
                    'preposition': 'Preposition - መስተዋወያ'
                };
                return titles[posType] || posType;
            }

            displayPOSAnalysis() {
                const statsContainer = document.getElementById('posStats');
                const detailsContainer = document.getElementById('posDetails');
                
                if (!this.analysisResults) return;
                
                const stats = this.analysisResults.statistics;
                const posAnalysis = this.analysisResults.posAnalysis;
                
                // Update POS statistics cards
                statsContainer.innerHTML = `
                    <div class="pos-stat-card">
                        <div class="pos-stat-value">${stats.totalNouns}</div>
                        <div class="pos-stat-label">Nouns (ስሞች)</div>
                    </div>
                    <div class="pos-stat-card">
                        <div class="pos-stat-value">${stats.totalVerbs}</div>
                        <div class="pos-stat-label">Verbs (ግሶች)</div>
                    </div>
                    <div class="pos-stat-card">
                        <div class="pos-stat-value">${stats.totalPronouns}</div>
                        <div class="pos-stat-label">Pronouns (ተውሳኮች)</div>
                    </div>
                    <div class="pos-stat-card">
                        <div class="pos-stat-value">${stats.totalAdjectives}</div>
                        <div class="pos-stat-label">Adjectives (ቅጽሎች)</div>
                    </div>
                `;
                
                // Create detailed POS tables
                let detailsHTML = '<div style="display: flex; flex-direction: column; gap: 20px;">';
                
                // Nouns table
                if (posAnalysis.nouns.length > 0) {
                    detailsHTML += `
                        <div>
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                <i class="fas fa-tag"></i> Nouns (${posAnalysis.nouns.length})
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${posAnalysis.nouns.slice(0, 30).map(noun => 
                                    `<span class="pos-tag pos-noun">${noun.word}</span>`
                                ).join('')}
                                ${posAnalysis.nouns.length > 30 ? 
                                    `<span style="color: var(--text-secondary);">... and ${posAnalysis.nouns.length - 30} more</span>` : 
                                    ''
                                }
                            </div>
                        </div>
                    `;
                }
                
                // Verbs table
                if (posAnalysis.verbs.length > 0) {
                    detailsHTML += `
                        <div>
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                <i class="fas fa-tag"></i> Verbs (${posAnalysis.verbs.length})
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${posAnalysis.verbs.slice(0, 30).map(verb => 
                                    `<span class="pos-tag pos-verb">${verb.word}</span>`
                                ).join('')}
                                ${posAnalysis.verbs.length > 30 ? 
                                    `<span style="color: var(--text-secondary);">... and ${posAnalysis.verbs.length - 30} more</span>` : 
                                    ''
                                }
                            </div>
                        </div>
                    `;
                }
                
                // Pronouns table
                if (posAnalysis.pronouns.length > 0) {
                    detailsHTML += `
                        <div>
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                <i class="fas fa-tag"></i> Pronouns (${posAnalysis.pronouns.length})
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${posAnalysis.pronouns.slice(0, 30).map(pronoun => 
                                    `<span class="pos-tag pos-pronoun">${pronoun.word}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }
                
                // Adjectives table
                if (posAnalysis.adjectives.length > 0) {
                    detailsHTML += `
                        <div>
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                <i class="fas fa-tag"></i> Adjectives (${posAnalysis.adjectives.length})
                            </h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${posAnalysis.adjectives.slice(0, 30).map(adj => 
                                    `<span class="pos-tag pos-adjective">${adj.word}</span>`
                                ).join('')}
                                ${posAnalysis.adjectives.length > 30 ? 
                                    `<span style="color: var(--text-secondary);">... and ${posAnalysis.adjectives.length - 30} more</span>` : 
                                    ''
                                }
                            </div>
                        </div>
                    `;
                }
                
                detailsHTML += '</div>';
                detailsContainer.innerHTML = detailsHTML;
            }

            displaySentenceStructure() {
                const container = document.getElementById('sentenceStructures');
                
                if (!this.analysisResults || !this.analysisResults.sentenceStructures) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-sitemap"></i>
                            <h4>No Structure Analysis</h4>
                            <p>Enable sentence structure analysis in options</p>
                        </div>
                    `;
                    return;
                }
                
                const structures = this.analysisResults.sentenceStructures;
                
                if (structures.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-sitemap"></i>
                            <h4>No Sentences Found</h4>
                            <p>Add complete sentences ending with ።, !, or ?</p>
                        </div>
                    `;
                    return;
                }
                
                let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';
                
                structures.forEach((structure, index) => {
                    html += `
                        <div class="sentence-structure">
                            <h4 style="color: var(--amharic-color); margin-bottom: 10px;">
                                Sentence ${index + 1} (${structure.words} words)
                            </h4>
                            <p style="margin-bottom: 15px; font-style: italic; color: var(--text-secondary);">
                                "${structure.sentence}"
                            </p>
                            <div class="sentence-diagram">
                                <div class="diagram-line">
                                    <span class="diagram-label">Structure:</span>
                                    <span style="font-weight: 600; color: var(--amharic-color);">
                                        ${structure.structure}
                                    </span>
                                </div>
                                <div class="diagram-line">
                                    <span class="diagram-label">Has Subject:</span>
                                    <span style="color: ${structure.hasSubject ? 'var(--success-color)' : 'var(--accent-color)'};">
                                        ${structure.hasSubject ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                                <div class="diagram-line">
                                    <span class="diagram-label">Has Verb:</span>
                                    <span style="color: ${structure.hasVerb ? 'var(--success-color)' : 'var(--accent-color)'};">
                                        ${structure.hasVerb ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                                <div class="diagram-line">
                                    <span class="diagram-label">Has Object:</span>
                                    <span style="color: ${structure.hasObject ? 'var(--success-color)' : 'var(--accent-color)'};">
                                        ${structure.hasObject ? '✓ Yes' : '✗ No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                container.innerHTML = html;
            }

            generateWordCloud() {
                const container = document.getElementById('wordCloud');
                
                if (!this.analysisResults || !this.analysisResults.wordFrequency) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-cloud"></i>
                            <h4>No Word Cloud</h4>
                            <p>Generate word cloud from analyzed text</p>
                        </div>
                    `;
                    return;
                }
                
                const wordFrequency = this.analysisResults.wordFrequency.slice(0, 50); // Top 50 words
                const maxFrequency = wordFrequency[0]?.count || 1;
                
                // Clear container
                container.innerHTML = '';
                
                // Set container dimensions
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                // Generate word cloud
                wordFrequency.forEach((item, index) => {
                    const word = item.word;
                    const frequency = item.count;
                    
                    // Calculate font size based on frequency
                    const fontSize = Math.max(14, (frequency / maxFrequency) * 60);
                    
                    // Calculate random position
                    const x = Math.random() * (width - 100) + 50;
                    const y = Math.random() * (height - 50) + 25;
                    
                    // Create word element
                    const wordElement = document.createElement('div');
                    wordElement.className = 'cloud-word';
                    wordElement.textContent = word;
                    wordElement.style.cssText = `
                        position: absolute;
                        left: ${x}px;
                        top: ${y}px;
                        font-size: ${fontSize}px;
                        color: ${this.getRandomColor()};
                        font-weight: ${fontSize > 30 ? 'bold' : 'normal'};
                        opacity: ${0.7 + (frequency / maxFrequency) * 0.3};
                        cursor: pointer;
                        transition: all 0.3s;
                    `;
                    
                    // Add click event to show frequency
                    wordElement.addEventListener('click', () => {
                        this.showNotification(`"${word}" appears ${frequency} time${frequency !== 1 ? 's' : ''}`, 'info');
                    });
                    
                    container.appendChild(wordElement);
                });
            }

            getRandomColor() {
                const colors = [
                    '#8e44ad', '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
                    '#1abc9c', '#d35400', '#c0392b', '#16a085', '#27ae60'
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            displayFrequencyTable() {
                const tableBody = document.querySelector('#frequencyTable tbody');
                
                if (!this.analysisResults || !this.analysisResults.wordFrequency) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align: center; color: var(--text-secondary);">
                                No frequency data available
                            </td>
                        </tr>
                    `;
                    return;
                }
                
                const wordFrequency = this.analysisResults.wordFrequency.slice(0, 50);
                const totalWords = this.analysisResults.tokens.length;
                
                let html = '';
                wordFrequency.forEach(item => {
                    const percentage = ((item.count / totalWords) * 100).toFixed(2);
                    const posType = this.getWordPOS(item.word);
                    
                    html += `
                        <tr>
                            <td>${item.word}</td>
                            <td>${item.count}</td>
                            <td>${posType}</td>
                            <td>${percentage}%</td>
                        </tr>
                    `;
                });
                
                tableBody.innerHTML = html;
            }

            getWordPOS(word) {
                if (!this.analysisResults) return 'Unknown';
                
                const pos = this.analysisResults.posAnalysis;
                
                if (pos.nouns.some(n => n.word === word)) return 'Noun';
                if (pos.verbs.some(v => v.word === word)) return 'Verb';
                if (pos.pronouns.some(p => p.word === word)) return 'Pronoun';
                if (pos.adjectives.some(a => a.word === word)) return 'Adjective';
                if (pos.adverbs.some(a => a.word === word)) return 'Adverb';
                if (pos.prepositions.some(p => p.word === word)) return 'Preposition';
                
                return 'Other';
            }

            updateStatistics() {
                const text = document.getElementById('textInput').value;
                const words = text.trim() ? this.tokenizeAmharic(text) : [];
                const sentences = text.trim() ? text.split(/[።!?]+/).filter(s => s.trim().length > 0) : [];
                
                document.getElementById('statWords').textContent = words.length;
                document.getElementById('statSentences').textContent = sentences.length;
                
                if (this.analysisResults) {
                    const stats = this.analysisResults.statistics;
                    document.getElementById('statNouns').textContent = stats.totalNouns;
                    document.getElementById('statVerbs').textContent = stats.totalVerbs;
                } else {
                    document.getElementById('statNouns').textContent = '0';
                    document.getElementById('statVerbs').textContent = '0';
                }
            }

            clearAll() {
                if (!confirm('Are you sure you want to clear all text and analysis results?')) {
                    return;
                }
                
                document.getElementById('textInput').value = '';
                document.getElementById('selectedFile').textContent = 'No file selected';
                document.getElementById('fileInput').value = '';
                document.getElementById('sampleText').selectedIndex = 0;
                document.getElementById('previewPDFBtn').style.display = 'none';
                document.getElementById('pdfPreview').style.display = 'none';
                
                this.currentText = '';
                this.analysisResults = null;
                this.currentPDF = null;
                this.pdfText = '';
                
                // Clear all result displays
                document.getElementById('originalText').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <h4>No Text Analyzed</h4>
                        <p>Upload a document or enter text to begin analysis</p>
                    </div>
                `;
                
                document.getElementById('posStats').innerHTML = '';
                document.getElementById('posDetails').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tags"></i>
                        <h4>No POS Data</h4>
                        <p>Run analysis to see parts of speech breakdown</p>
                    </div>
                `;
                
                document.getElementById('sentenceStructures').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-sitemap"></i>
                        <h4>No Structure Analysis</h4>
                        <p>Enable sentence structure analysis in options</p>
                    </div>
                `;
                
                document.getElementById('wordCloud').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-cloud"></i>
                        <h4>No Word Cloud</h4>
                        <p>Generate word cloud from analyzed text</p>
                    </div>
                `;
                
                document.querySelector('#frequencyTable tbody').innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: var(--text-secondary);">
                            No frequency data available
                        </td>
                    </tr>
                `;
                
                document.getElementById('pdfViewContent').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-pdf"></i>
                        <h4>No PDF Document</h4>
                        <p>Upload a PDF file to view it here</p>
                    </div>
                `;
                
                this.updateStatistics();
                this.showNotification('All text and analysis cleared', 'info');
            }

            showProgress(message, percent) {
                const container = document.getElementById('progressContainer');
                const fill = document.getElementById('progressFill');
                const text = document.getElementById('progressText');
                
                container.style.display = 'block';
                fill.style.width = `${percent}%`;
                text.textContent = message;
            }

            hideProgress() {
                setTimeout(() => {
                    document.getElementById('progressContainer').style.display = 'none';
                    document.getElementById('progressFill').style.width = '0%';
                }, 500);
            }

            showNotification(message, type = 'info') {
                // Create notification element
                const notification = document.createElement('div');
                
                let icon = 'info-circle';
                let bgColor = 'rgba(52, 152, 219, 0.1)';
                let borderColor = 'rgba(52, 152, 219, 0.3)';
                
                switch (type) {
                    case 'success':
                        icon = 'check-circle';
                        bgColor = 'rgba(46, 204, 113, 0.1)';
                        borderColor = 'rgba(46, 204, 113, 0.3)';
                        break;
                    case 'error':
                        icon = 'exclamation-circle';
                        bgColor = 'rgba(231, 76, 60, 0.1)';
                        borderColor = 'rgba(231, 76, 60, 0.3)';
                        break;
                    case 'warning':
                        icon = 'exclamation-triangle';
                        bgColor = 'rgba(241, 196, 15, 0.1)';
                        borderColor = 'rgba(241, 196, 15, 0.3)';
                        break;
                }
                
                notification.innerHTML = `
                    <i class="fas fa-${icon}"></i>
                    <span>${message}</span>
                `;
                
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: ${bgColor};
                    border: 1px solid ${borderColor};
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                    max-width: 300px;
                    box-shadow: 0 4px 12px var(--shadow-color);
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.style.animation = 'slideOut 0.3s ease';
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 300);
                    }
                }, 3000);
                
                // Add animation styles if not already present
                if (!document.getElementById('notification-animations')) {
                    const style = document.createElement('style');
                    style.id = 'notification-animations';
                    style.textContent = `
                        @keyframes slideIn {
                            from {
                                transform: translateX(100%);
                                opacity: 0;
                            }
                            to {
                                transform: translateX(0);
                                opacity: 1;
                            }
                        }
                        @keyframes slideOut {
                            from {
                                transform: translateX(0);
                                opacity: 1;
                            }
                            to {
                                transform: translateX(100%);
                                opacity: 0;
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }

            exportResults(type) {
                if (!this.analysisResults) {
                    this.showNotification('No analysis results to export', 'warning');
                    return;
                }

                let data, filename, mimeType;

                switch (type) {
                    case 'text':
                        data = this.analysisResults.text;
                        filename = 'amharic_analysis.txt';
                        mimeType = 'text/plain';
                        break;
                    case 'pos':
                        data = JSON.stringify(this.analysisResults.posAnalysis, null, 2);
                        filename = 'amharic_pos_analysis.json';
                        mimeType = 'application/json';
                        break;
                    case 'structure':
                        data = JSON.stringify(this.analysisResults.sentenceStructures, null, 2);
                        filename = 'amharic_sentence_structures.json';
                        mimeType = 'application/json';
                        break;
                    case 'frequency':
                        data = JSON.stringify(this.analysisResults.wordFrequency, null, 2);
                        filename = 'amharic_word_frequency.json';
                        mimeType = 'application/json';
                        break;
                    default:
                        this.showNotification('Invalid export type', 'error');
                        return;
                }

                const blob = new Blob([data], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification(`Exported ${type} data successfully`, 'success');
            }

            exportPDFText() {
                if (!this.pdfText) {
                    this.showNotification('No PDF text to export', 'warning');
                    return;
                }

                const blob = new Blob([this.pdfText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'amharic_pdf_extracted_text.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showNotification('PDF text exported successfully', 'success');
            }

            exportWordCloud() {
                const wordCloud = document.getElementById('wordCloud');
                if (!wordCloud || wordCloud.children.length === 0) {
                    this.showNotification('No word cloud to export', 'warning');
                    return;
                }

                // Create a canvas to capture the word cloud
                const canvas = document.createElement('canvas');
                canvas.width = wordCloud.clientWidth;
                canvas.height = wordCloud.clientHeight;
                const ctx = canvas.getContext('2d');
                
                // Draw background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Note: For a complete word cloud export, you would need to implement
                // proper canvas drawing of the words or use html2canvas library
                this.showNotification('Word cloud export requires additional library (html2canvas)', 'info');
            }
        }

        // Language switching function
        function setLanguage(lang) {
            const buttons = document.querySelectorAll('.lang-btn');
            buttons.forEach(btn => {
                if (btn.onclick.toString().includes(`'${lang}'`)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Update UI based on language
            if (lang === 'am') {
                document.title = 'አማርኛ NLP Analyzer | አማርኛ ቋንቋ ትንተና';
                document.getElementById('textInput').placeholder = 'የአማርኛ ጽሁፍ እዚህ ይጻፉ...';
            } else {
                document.title = 'Amharic NLP Analyzer | Amharic Language Analysis';
                document.getElementById('textInput').placeholder = 'Enter Amharic text here...';
            }
        }

        // Initialize application when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            window.amharicNLP = new AmharicNLP();
            
            // Set default language
            setLanguage('am');
        });
        
        export const amhNLP = new AmharicNLP()