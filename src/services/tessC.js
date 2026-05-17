class TessAnaC {
    constructor() {
        this.isInitializedT = false;
        this.initializationPromise = null;
        this.apiBaseUrl = 'http://localhost:5001'; // Unified server
    }

    async init() {
        if (this.isInitializedT) return;
        
        console.log('Initializing TessC...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            console.log('Server status:', data.status);
            console.log('Supported documents:', data.supported_documents);
            console.log('Amharic available:', data.amharic_available);
            this.isInitializedT = true;
        } catch (error) {
            console.warn('OCR server not available. Make sure the server is running on port 5001');
        }
        
        console.log('TessC initialized');
    }

    async analyzeDocument(file) {
        try {
            this.showLoading(true);
            console.log('Starting document analysis for:', file.name, file.type);
            
            let analysis = null;
            
            if (file.type.startsWith('image/')) {
                // Use the unified analyze endpoint
                const result = await this.sendToAnalyzeEndpoint(file);
                
                if (result && result.success) {
                    // Classify the document
                    const classification = this.classifyDocument(result.ocr_text || '', file.name);
                    
                    // Combine all results
                    analysis = {
                        ...classification,
                        documentType: result.document_type,
                        detectedDocument: result.detected_document,
                        extractedData: result.extracted_data,
                        extractedStructure: result.extracted_data,
                        nextSteps: result.next_steps,
                        ocrDetails: {
                            wordCount: result.metadata.word_count,
                            charCount: result.metadata.char_count,
                            amharicCharCount: result.metadata.amharic_char_count,
                            language: result.metadata.language,
                            lineCount: result.metadata.line_count,
                            fieldsExtracted: result.metadata.fields_extracted,
                            completeness: result.metadata.completeness_percentage,
                            preprocessingSteps: result.metadata.preprocessing_steps
                        },
                        fileName: file.name,
                        fileSize: file.size,
                        timestamp: result.timestamp
                    };
                } else {
                    throw new Error('Document analysis failed');
                }
            } else {
                throw new Error('Unsupported file type. Please use image files (JPEG, PNG, etc.)');
            }
            
            this.showLoading(false);
            return analysis;
            
        } catch (error) {
            this.showLoading(false);
            console.error('Analysis error:', error);
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    async sendToAnalyzeEndpoint(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            fetch(`${this.apiBaseUrl}/analyze`, {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Analysis failed');
                }
                const data = await response.json();
                resolve(data);
            })
            .catch(error => {
                console.error('Analysis request failed:', error);
                reject(error);
            });
        });
    }

    async extractInsuranceDocument(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            fetch(`${this.apiBaseUrl}/extract/insurance`, {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Insurance extraction failed');
                }
                const data = await response.json();
                resolve(data);
            })
            .catch(error => {
                console.error('Insurance extraction failed:', error);
                reject(error);
            });
        });
    }

    async extractVehicleDocument(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            fetch(`${this.apiBaseUrl}/extract/vehicle`, {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Vehicle extraction failed');
                }
                const data = await response.json();
                resolve(data);
            })
            .catch(error => {
                console.error('Vehicle extraction failed:', error);
                reject(error);
            });
        });
    }

    async extractDriverLicense(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            
            fetch(`${this.apiBaseUrl}/extract/driver`, {
                method: 'POST',
                body: formData
            })
            .then(async response => {
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Driver license extraction failed');
                }
                const data = await response.json();
                resolve(data);
            })
            .catch(error => {
                console.error('Driver license extraction failed:', error);
                reject(error);
            });
        });
    }

    async getSupportedDocuments() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/supported-documents`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to get supported documents:', error);
            return null;
        }
    }

    // Keep your existing methods: classifyDocument, extractVehicleData, detectLanguage, etc.
    classifyDocument(text, fileName) {
        // Your existing classifyDocument logic
        // This will still work as fallback
        const lowerText = text.toLowerCase();
        
        let type = "General Document";
        let typeClass = "type-other";
        let confidence = 0.3;
        let category = "other";
        let detectedLanguage = this.detectLanguage(text);
        
        // Document type classification based on content
        if (/(የሰሌዳ\s*ቁጥር|የሻንሺ\s*ቁጥር|chassis\s*number|plate\s*number)/i.test(text)) {
            type = "Vehicle Registration Document";
            typeClass = "type-government";
            confidence = 0.9;
            category = "transportation";
        } else if (/(abstract|introduction|methodology|results|discussion|conclusion)/i.test(text)) {
            type = "Academic Paper";
            typeClass = "type-research";
            confidence = 0.8;
            category = "academic";
        } else if (/(agreement|contract|clause|party|whereas|warranty|jurisdiction)/i.test(text)) {
            type = "Legal Document";
            typeClass = "type-legal";
            confidence = 0.7;
            category = "legal";
        } else if (/(ዜግነት|national id|fayda id|government|ብሔራዊ መታወቂያ)/i.test(text)) {
            type = "Government Document";
            typeClass = "type-government";
            confidence = 0.75;
            category = "government";
        } else if (/(invoice|receipt|payment|amount|balance|statement|tax)/i.test(text)) {
            type = "Financial Document";
            typeClass = "type-financial";
            confidence = 0.6;
            category = "financial";
        } else if (/(certificate of insurance|የመድን ምስክር ወረቀት|insurance|መድን)/i.test(text)) {
            type = "Insurance Certificate";
            typeClass = "type-financial";
            confidence = 0.85;
            category = "insurance";
        }
        
        const topics = this.extractTopics(text);
        const keywords = this.extractKeywords(text);
        const extractedData = this.extractVehicleData(text);
        
        return {
            documentName: fileName.replace(/\.[^/.]+$/, "") || 'Unknown Document',
            documentType: type,
            typeClass: typeClass,
            confidence: confidence,
            category: category,
            language: detectedLanguage,
            topics: topics,
            keywords: keywords,
            extractedData: extractedData,
            summary: this.generateSummary(type, text, fileName, topics, extractedData, detectedLanguage),
            wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
            timestamp: new Date().toISOString(),
            tesseractVersion: '5.0.0 (via Unified Server)'
        };
    }

    detectLanguage(text) {
        const ethiopicChars = /[\u1200-\u137F]/;
        const latinChars = /[a-zA-Z]/;
        
        const hasEthiopic = ethiopicChars.test(text);
        const hasLatin = latinChars.test(text);
        
        if (hasEthiopic && hasLatin) return 'amh+eng';
        if (hasEthiopic) return 'amh';
        if (hasLatin) return 'eng';
        return 'unknown';
    }

    extractVehicleData(text) {
        // Your existing extractVehicleData logic
        const vehicleData = {};
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
        
        const keyPatterns = {
            plateNumber: {
                keys: ['የሰሌዳ\\s*ቁጥር', 'plate\\s*number'],
                extractPattern: /.{8,15}/
            },
            ownerName: {
                keys: ['ስም', 'name'],
                extractPattern: /.{5,30}/
            },
            chassisNumber: {
                keys: ['የሻንሺ\\s*ቁጥር', 'chassis\\s*number'],
                extractPattern: /.{10,20}/
            },
            motorNumber: {
                keys: ['የሞተር\\s*ቁጥር', 'motor\\s*number'],
                extractPattern: /.{8,25}/
            },
            vehicleModel: {
                keys: ['የተሽ[\\/]?\\s*ሞዴል', 'vehicle\\s*model'],
                extractPattern: /.{8,20}/
            }
        };
        
        lines.forEach(line => {
            for (const [field, patternInfo] of Object.entries(keyPatterns)) {
                if (!vehicleData[field]) {
                    for (const key of patternInfo.keys) {
                        const keyRegex = new RegExp(`${key}[\\s:]*([^\\n]{3,30})`, 'i');
                        const match = line.match(keyRegex);
                        
                        if (match && match[1]) {
                            let value = match[1].trim();
                            value = value.replace(/^[:\s\-]+|[:\s\-]+$/g, '');
                            
                            if (value && value.length > 0) {
                                vehicleData[field] = value;
                                break;
                            }
                        }
                    }
                }
            }
        });
        
        return this.validateAndCleanVehicleData(vehicleData);
    }

    validateAndCleanVehicleData(vehicleData) {
        const cleaned = { ...vehicleData };
        
        Object.keys(cleaned).forEach(key => {
            if (typeof cleaned[key] === 'string') {
                cleaned[key] = cleaned[key]
                    .replace(/\s+/g, ' ')
                    .trim()
                    .replace(/^[:\-\s]+|[:\-\s]+$/g, '');
            }
        });
        
        return cleaned;
    }

    extractTopics(text) {
        const words = text.split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\w\u1200-\u137F]/g, '');
            const minLength = /[\u1200-\u137F]/.test(cleanWord) ? 2 : 4;
            if (cleanWord.length >= minLength && !this.isCommonWord(cleanWord)) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });
        
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([word]) => word);
    }

    extractKeywords(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\w\u1200-\u137F]/g, '');
            const minLength = /[\u1200-\u137F]/.test(cleanWord) ? 2 : 3;
            if (cleanWord.length >= minLength) {
                wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
            }
        });
        
        const maxFreq = Math.max(...Object.values(wordFreq));
        
        return Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([term, count]) => ({
                term,
                score: count / maxFreq
            }));
    }

    generateSummary(docType, text, title, topics, extractedData = {}, language) {
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const topicStr = topics.slice(0, 3).join(', ');
        
        let vehicleInfo = '';
        if (docType === "Vehicle Registration Document" && Object.keys(extractedData).length > 0) {
            const vehicleFields = Object.entries(extractedData)
                .filter(([key, value]) => value && value.length > 0)
                .map(([key, value]) => `<div><strong>${this.formatFieldName(key)}:</strong> ${value}</div>`)
                .join('');
                
            vehicleInfo = `
                <div class="vehicle-details">
                    <h4>Extracted Vehicle Information:</h4>
                    <div class="vehicle-grid">
                        ${vehicleFields}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="document-summary">
                <p><strong>${docType}</strong>: "${title}"</p>
                <p>Language: ${language} | Words: ${wordCount}</p>
                <p>Key topics: ${topicStr}</p>
                ${vehicleInfo}
                <p>Processed with Unified Document Analysis Server</p>
            </div>
        `;
    }

    formatFieldName(fieldName) {
        const names = {
            plateNumber: 'Plate Number',
            ownerName: 'Owner Name',
            chassisNumber: 'Chassis Number',
            motorNumber: 'Motor Number',
            vehicleModel: 'Vehicle Model',
            previousPlate: 'Previous Plate',
            gender: 'Gender',
            nationality: 'Nationality',
            city: 'City',
            subcity: 'Subcity',
            woreda: 'Woreda',
            phone: 'Phone',
            vehicleType: 'Vehicle Type',
            bodyType: 'Body Type',
            fuelType: 'Fuel Type',
            color: 'Color',
            manufacturer: 'Manufacturer',
            manufactureYear: 'Manufacture Year'
        };
        return names[fieldName] || fieldName;
    }

    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'your', 
            'have', 'with', 'this', 'that', 'from', 'ወደ', 'ለ', 'ከ', 'በ', 'እና'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
            if (!show) {
                loadingEl.textContent = 'Ready';
            }
        }
    }
}

export const teSsAnaC = new TessAnaC();
export default teSsAnaC;