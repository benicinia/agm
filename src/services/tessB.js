import { openDB } from 'idb';
import { createWorker } from 'tesseract.js';
import {processMessage} from './nlpProcessor'

class TessAna {
    constructor() {
        this.tesseract = {createWorker};
        this.tesseractWorker = null;
        this.isInitializedT = false;
        this.languageManager = new TesseractLanguageManager();
        this.initializationPromise = null;
    }

    async init() {
        if (this.isInitializedT) return;
        
        console.log('🔄 Initializing Tesseract.js v6.0.1...');
        
        if (typeof createWorker === 'undefined') {
            throw new Error('Tesseract.js not loaded. Please check your imports.');
        }

        await this.languageManager.init();
        await this.loadLocalLanguagesToIndexedDB();
        
        console.log('Tesseract.js initialized with language support');
    }

    async loadLocalLanguagesToIndexedDB() {
        console.log('🔍 Loading local language files to IndexedDB...');
        
        const languages = ['eng', 'amh'];
        let loadedCount = 0;
        
        for (const langCode of languages) {
            const isAvailable = await this.languageManager.isLanguageAvailable(langCode);
            if (!isAvailable) {
                try {
                    await this.languageManager.loadLocalLanguage(langCode);
                    loadedCount++;
                    console.log(`✅ Loaded ${langCode} from local file to IndexedDB`);
                } catch (error) {
                    console.warn(`⚠️ Could not load local ${langCode} file: ${error.message}`);
                }
            } else {
                console.log(`✅ ${langCode} already available in IndexedDB`);
                loadedCount++;
            }
        }
        
        console.log(`📊 Language loading complete: ${loadedCount}/${languages.length} languages available`);
    }

    async initializeTesseract() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.isInitializedT) return;

        this.initializationPromise = (async () => {
            try {
                console.log('Initializing Tesseract OCR engine...');
                
                await this.loadLocalLanguagesToIndexedDB();
                
                console.log('Creating Tesseract worker...');
                this.tesseractWorker = await createWorker('eng+amh', 1, {
                    logger: progress => this.updateOCRProgress(progress),
                  // workerPath: 'js/tesseract/dist/worker.min.js', // Copy to public/assets
          // corePath: 'js/tesseract/dist/tesseract-core.wasm.js'
                    // Remove w
                });

                this.isInitializedT = true;
                console.log('✅ Tesseract.js initialized successfully');
                
            } catch (error) {
                console.error('❌ Tesseract initialization failed:', error);
                this.isInitializedT = false;
                this.tesseractWorker = null;
                throw new Error(`OCR engine failed to start: ${error.message}`);
            } finally {
                this.initializationPromise = null;
            }
        })();

        return this.initializationPromise;
    }

    async debugInitialize() {
        try {
            console.log('🧪 Debug: Testing Tesseract initialization...');
            
            const testWorker = await createWorker();
            console.log('✅ Basic worker created successfully');
            
            await testWorker.loadLanguage('eng');
            console.log('✅ English language loaded');
            
            await testWorker.initialize('eng');
            console.log('✅ English initialized');
            
            await testWorker.terminate();
            console.log('✅ Worker terminated');
            
            return true;
        } catch (error) {
            console.error('❌ Debug initialization failed:', error);
            return false;
        }
    }

    updateOCRProgress(progress) {
        const loadingEl = document.getElementById('loading');
        if (!loadingEl) return;

        switch (progress.status) {
            case 'loading tesseract core':
                loadingEl.textContent = 'Loading OCR engine...';
                break;
            case 'initializing tesseract':
                loadingEl.textContent = 'Initializing OCR...';
                break;
            case 'loading language traineddata':
                loadingEl.textContent = 'Loading language data from IndexedDB...';
                break;
            case 'initializing api':
                loadingEl.textContent = 'Finalizing OCR...';
                break;
            case 'recognizing text':
                const percent = Math.round(progress.progress * 100);
                loadingEl.textContent = `OCR Processing: ${percent}%`;
                break;
        }
    }

    async analyzeDocument(file) {
        try {
            this.showLoading(true);
            console.log('📄 Starting document analysis for:', file.name, file.type);
            
            let text = '';
            let usedOCR = false;
            
            if (file.type.startsWith('image/')) {
                console.log('🖼️ Image file detected, initializing OCR...');
                await this.initializeTesseract();
                text = await this.performOCR(file);
                usedOCR = true;
                console.log('✅ OCR completed, text length:', text.length);
            } else if (file.type === 'application/pdf') {
                throw new Error('PDF processing handled by external PDF.js implementation');
            } else {
                throw new Error('Unsupported file type. Please use image files (JPEG, PNG, etc.)');
            }
            
            const analysisz = this.classifyDocument(text, file.name);
            analysisz.fileName = file.name;
            analysisz.fileSize = file.size;
            analysisz.usedOCR = usedOCR;
            analysisz.pages = analysisz.pages || 1;
            
            if (typeof db !== 'undefined' && db.saveDocument) {
                await db.saveDocument(analysisz);
            }
            
            this.showLoading(false);
            return analysisz;
            
        } catch (error) {
            this.showLoading(false);
            console.error('❌ Analysis error:', error);
            throw new Error(`Document analysis failed: ${error.message}`);
        }
    }

    async performOCR(imageFile) {
        if (!this.isInitializedT || !this.tesseractWorker) {
            console.log('🔄 OCR not initialized, initializing now...');
            await this.initializeTesseract();
        }

        try {
            console.log('🔍 Starting OCR on file:', imageFile.name);
            const result = await this.tesseractWorker.recognize(imageFile, {
                  tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
            });
            
            console.log(`✅ OCR completed. Text length: ${result.data.text.length}, Confidence: ${result.data.confidence}`);
            return result.data.text || '';
            
        } catch (error) {
            console.error('❌ OCR processing failed:', error);
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    getWorkerStatus() {
        return {
            isInitialized: this.isInitializedT,
            worker: this.tesseractWorker ? 'Active' : 'None',
            initializationPromise: this.initializationPromise ? 'Pending' : 'None'
        };
    }

   async classifyDocument(text, fileName) {
        const lowerText = text.toLowerCase();
        
        let type = "General Document";
        let typeClass = "type-other";
        let confidence = 0.3;
        let category = "other";
        let detectedLanguage = this.detectLanguage(text);

        if (/(የሰሌዳ\s*ቁጥር|የተሽከርካሪው|የሻንሺ\s*ቁጥር|chassis\s*number|vehicle\s*description|plate\s*number)/i.test(text)) {
            type = "Vehicle Registration Document";
            typeClass = "type-government";
            confidence = 0.9;
            category = "transportation";
        }
        else if (/(abstract|introduction|methodology|results|discussion|conclusion|references|bibliography)/i.test(text)) {
            type = "Academic Paper";
            typeClass = "type-research";
            confidence = 0.8;
            category = "academic";
        }
        else if (/(agreement|contract|clause|party|whereas|warranty|jurisdiction)/i.test(text)) {
            type = "Legal Document";
            typeClass = "type-legal";
            confidence = 0.7;
            category = "legal";
        }
        else if (/(license|permit|national id|fayda id|government|identification|ዜግነት|ኢትዮጵያ)/i.test(text)) {
            type = "Government Document";
            typeClass = "type-government";
            confidence = 0.75;
            category = "government";
        }
        else if (/(invoice|receipt|payment|amount|balance|statement|tax)/i.test(text)) {
            type = "Financial Document";
            typeClass = "type-financial";
            confidence = 0.6;
            category = "financial";
        }

        const topics = this.extractTopics(text);
        const keywords = this.extractKeywords(text);
        const extractedData = this.extractVehicleData(text);
         const currentIntent = sessionStorage.getItem('currentService')
            if (currentIntent==='iftms') {
                const Edata ={documentType: type,
            typeClass: typeClass,
            confidence: confidence,
            category: category,}
            return  await processMessage(currentIntent,Edata,false,true)
        
            }
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
            tesseractVersion: '6.0.1'
        };
    }

    detectLanguage(text) {
        const ethiopicChars = /[ሀ-ፕ]/;
        const latinChars = /[a-zA-Z]/;
        
        const hasEthiopic = ethiopicChars.test(text);
        const hasLatin = latinChars.test(text);
        
        if (hasEthiopic && hasLatin) return 'amh+eng';
        if (hasEthiopic) return 'amh';
        if (hasLatin) return 'eng';
        return 'unknown';
    }

    extractVehicleData(text) {
        const vehicleData = {};
        
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
        
        console.log('Raw lines:', lines);

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
            },
            previousPlate: {
                keys: ['የቀድሞ\\s*ሰሌዳ\\s*ቁጥር', 'previous\\s*plate'],
                extractPattern: /.{8,20}/
            },
            gender: {
                keys: ['ጾታ', 'gender'],
                extractPattern: /.{2,10}/
            },
            nationality: {
                keys: ['ዜግነት', 'nationality'],
                extractPattern: /.{5,20}/
            },
            city: {
                keys: ['ከተማ', 'city'],
                extractPattern: /.{5,20}/
            },
            subcity: {
                keys: ['ክ[\\/]\\s*ከተማ', 'subcity'],
                extractPattern: /.{5,20}/
            },
            woreda: {
                keys: ['ቀበሌ[\\/]\\s*ወረዳ', 'woreda'],
                extractPattern: /[0-9\\-\\/\\.\\s]{1,6}/
            },
            phone: {
                keys: ['ሰልክ', 'phone'],
                extractPattern: /[0-9\\s\\-\\.]{8,12}/
            },
            vehicleType: {
                keys: ['የመኪና\\s*አይነት', 'vehicle\\s*type'],
                extractPattern: /.{3,20}/
            },
            bodyType: {
                keys: ['የአካሉ\\s*አይነት', 'body\\s*type'],
                extractPattern: /.{3,20}/
            },
            fuelType: {
                keys: ['የነዳጅ\\s*ዓይነት', 'fuel\\s*type'],
                extractPattern: /.{3,15}/
            },
            color: {
                keys: ['ቀለም', 'color'],
                extractPattern: /.{3,15}/
            },
            manufacturer: {
                keys: ['የተሰራበት\\s*ሀገር', 'manufacturer'],
                extractPattern: /.{3,20}/
            },
            manufactureYear: {
                keys: ['የተሰራበት\\s*ዘመን', 'manufacture\\s*year'],
                extractPattern: /[0-9\\s\\-\\.]{3,6}/
            },
            enginePower: {
                keys: ['የሞተር\\s*የፈረስ\\s*ጉልበት', 'engine\\s*power'],
                extractPattern: /[0-9\\s\\-\\.]{2,6}/
            },
            totalWeight: {
                keys: ['የተሽ[\\/]\\s*ጠቅ[\\/]\\s*ክብደት', 'total\\s*weight'],
                extractPattern: /[0-9\\s\\-\\.]{3,8}/
            },
            unladenWeight: {
                keys: ['ነጠላ\\s*ክብደት', 'unladen\\s*weight'],
                extractPattern: /[0-9\\s\\-\\.]{3,8}/
            },
            loadCapacity: {
                keys: ['የጭነት\\s*መጠን', 'load\\s*capacity'],
                extractPattern: /.{3,15}/
            },
            engineCapacity: {
                keys: ['የሞተር\\s*ችሎታ[\\/]\\s*ሲሲ', 'engine\\s*capacity'],
                extractPattern: /[0-9\\s\\-\\.]{3,8}/
            },
            cylinderCount: {
                keys: ['የሲሊንደር\\s*ብዛት', 'cylinder\\s*count'],
                extractPattern: /[0-9\\s\\-\\.]{1,4}/
            },
            permittedWork: {
                keys: ['የተፈቀደለት\\s*የስራ\\s*ጸባይ', 'permitted\\s*work'],
                extractPattern: /.{3,20}/
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
                            value = value.replace(/^[:\s\\-]+|[:\s\\-]+$/g, '');
                            
                            if (value && value.length > 0) {
                                vehicleData[field] = value;
                                console.log(`✅ Same-line ${field}: "${value}" from: "${line}"`);
                                break;
                            }
                        }
                    }
                }
            }
        });

        this.extractSeparatedKeyValues(lines, vehicleData);

        console.log('=== FINAL EXTRACTED DATA ===', vehicleData);
        return this.validateAndCleanVehicleData(vehicleData);
    }

    extractSeparatedKeyValues(lines, vehicleData) {
        if (!vehicleData.chassisNumber) {
            const chassisKeyIndex = lines.findIndex(line => /የሻንሺ|chassis/i.test(line));
            console.log('Chassis key found at line:', chassisKeyIndex, lines[chassisKeyIndex]);
            
            if (chassisKeyIndex !== -1) {
                for (let i = chassisKeyIndex + 12; i <= Math.min(lines.length + 12, chassisKeyIndex + 12); i++) {
                    console.log('Checking line', i, 'for chassis:', lines[i]);
                    const chassisMatch = lines[i].match(/([A-Z0-9]{10,18})/);
                    const vinMatch = lines[i].match(/([A-HJ-NPR-Z0-9]{17})/);
            
                    if (vinMatch) {
                        vehicleData.chassisNumber = vinMatch[1];
                        console.log(`✅ VIN found: "${vinMatch[1]}" at line ${i}`);
                        
                        const vinData = this.decodeVIN(vinMatch[1]);
                        Object.assign(vehicleData, vinData);
                        break;
                    }
                    if (chassisMatch) {
                        vehicleData.chassisNumber = chassisMatch[1];
                        console.log(`✅ Chassis found: "${chassisMatch[1]}" at line ${i} after key at line ${chassisKeyIndex}`);
                        break;
                    }
                }
            }
            
            if (!vehicleData.chassisNumber) {
                const chassisKeyIndex = lines.findIndex(line => /የሻንሺ|chassis/i.test(line));
                console.log('Chassis key found at line:', chassisKeyIndex, lines[chassisKeyIndex]);
                
                if (chassisKeyIndex !== -1) {
                    for (let i = chassisKeyIndex + 3; i <= Math.min(lines.length - 3, chassisKeyIndex + 5); i++) {
                        console.log('Checking line', i, 'for chassis:', lines[i]);
                        const chassisMatch = lines[i].match(/([A-Z0-9]{10,18})/);
                        const vinMatch = lines[i].match(/([A-HJ-NPR-Z0-9]{17})/);
                        if (vinMatch && !/የሻንሺ|chassis|phone|ሰልክ|0911/i.test(lines[i])) {
                            vehicleData.chassisNumber = vinMatch[1];
                            console.log(`✅ Direct VIN: "${vinMatch[1]}" from line ${i}`);
                            
                            const vinData = this.decodeVIN(vinMatch[1]);
                            Object.assign(vehicleData, vinData);
                            break;
                        }
                        if (chassisMatch) {
                            vehicleData.chassisNumber = chassisMatch[1];
                            console.log(`✅ Chassis found: "${chassisMatch[1]}" at line ${i} after key at line ${chassisKeyIndex}`);
                            break;
                        }
                    }
                }
                
                if (!vehicleData.vehicleModel) {
                    const modelKeyIndex = lines.findIndex(line => /የተሽ[\\/]?ሞዴል|vehicle.model/i.test(line));
                    console.log('Model key found at line:', modelKeyIndex, lines[modelKeyIndex]);
                    
                    if (modelKeyIndex !== -1) {
                        for (let i = modelKeyIndex + 1; i <= Math.min(lines.length - 1, modelKeyIndex + 5); i++) {
                            console.log('Checking line', i, 'for model:', lines[i]);
                            const modelMatch = lines[i].match(/(BJ425[0-9][A-Z]MFKB26TA|[A-Z0-9]{8,20})/);
                            if (modelMatch) {
                                vehicleData.vehicleModel = modelMatch[1];
                                console.log(`✅ Model found: "${modelMatch[1]}" at line ${i} after key at line ${modelKeyIndex}`);
                                break;
                            }
                        }
                    }
                }
                
                if (!vehicleData.chassisNumber) {
                    for (let i = 0; i < lines.length; i++) {
                        const chassisMatch = lines[i].match(/([A-Z0-9]{10,18})/);
                        if (chassisMatch && !/የሻንሺ|chassis|phone|ሰልክ|0911/i.test(lines[i])) {
                            vehicleData.chassisNumber = chassisMatch[1];
                            console.log(`✅ Direct chassis: "${chassisMatch[1]}" from line ${i}`);
                            break;
                        }
                    }
                }
            }
        }

        if (!vehicleData.motorNumber) {
            const motorKeyIndex = lines.findIndex(line => /የሞተር|motor/i.test(line));
            console.log('Motor key found at line:', motorKeyIndex, lines[motorKeyIndex]);
            
            if (motorKeyIndex !== -1) {
                for (let i = motorKeyIndex + 1; i <= Math.min(lines.length - 1, motorKeyIndex + 5); i++) {
                    console.log('Checking line', i, 'for motor:', lines[i]);
                    const motorMatch = lines[i].match(/(1SG400[\-\s]?[0-9A-Z]{7,9}|[A-Z0-9]{3,6}[\-\s]?[A-Z0-9]{5,10})/);
                    if (motorMatch && !/phone|ሰልክ|0911/i.test(lines[i])) {
                        vehicleData.motorNumber = motorMatch[1];
                        console.log(`✅ Motor found: "${motorMatch[1]}" at line ${i} after key at line ${motorKeyIndex}`);
                        break;
                    }
                }
            }
            
            if (!vehicleData.motorNumber) {
                for (let i = 0; i < lines.length; i++) {
                    const motorMatch = lines[i].match(/(1SG400[\-\s]?[0-9A-Z]{7,9}|[A-Z0-9]{3,6}[\-\s]?[A-Z0-9]{5,10})/);
                    if (motorMatch && !/phone|ሰልክ|0911/i.test(lines[i])) {
                        vehicleData.motorNumber = motorMatch[1];
                        console.log(`✅ Direct motor: "${motorMatch[1]}" from line ${i}`);
                        break;
                    }
                }
            }
        }

        if (!vehicleData.manufactureYear) {
            for (let i = 0; i < lines.length; i++) {
                const yearMatch = lines[i].match(/(20[0-9]{2})/);
                if (yearMatch && !/phone|ሰልክ/i.test(lines[i])) {
                    vehicleData.manufactureYear = yearMatch[1];
                    console.log(`✅ Year: "${yearMatch[1]}" from line ${i}`);
                    break;
                }
            }
        }

        if (!vehicleData.phone) {
            const phoneKeyIndex = lines.findIndex(line => /ሰልክ|phone/i.test(line));
            if (phoneKeyIndex !== -1) {
                for (let i = Math.max(0, phoneKeyIndex - 2); i <= Math.min(lines.length - 1, phoneKeyIndex + 2); i++) {
                    const phoneMatch = lines[i].match(/([0-9]{8,10})/);
                    if (phoneMatch) {
                        vehicleData.phone = phoneMatch[1];
                        console.log(`✅ Phone: "${phoneMatch[1]}" near line ${phoneKeyIndex}`);
                        break;
                    }
                }
            }
        }
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

    decodeVIN(vin) {
        if (!vin || vin.length !== 17) return {};
        
        const vinData = {
            vinNumber: vin,
            wmi: vin.substring(0, 3),
            vds: vin.substring(3, 9),
            vis: vin.substring(9, 17),
            modelYear: this.decodeVINModelYear(vin),
            assemblyPlant: this.decodeVINPlant(vin),
            manufacturer: this.decodeVINManufacturer(vin),
            vehicleType: this.decodeVINVehicleType(vin),
            modelCode: this.decodeVINModelCode(vin),
            modelName: this.decodeVINModelName(vin),
            engineInfo: this.decodeVINEngine(vin),
            bodyStyle: this.decodeVINBodyStyle(vin)
        };
        
        console.log('🔍 VIN Decoded:', vinData);
        return vinData;
    }

    decodeVINModelYear(vin) {
        const yearChar = vin.charAt(9);
        const yearMap = {
            'A': '2010', 'B': '2011', 'C': '2012', 'D': '2013', 'E': '2014', 'F': '2015',
            'G': '2016', 'H': '2017', 'J': '2018', 'K': '2019', 'L': '2020', 'M': '2021',
            'N': '2022', 'P': '2023', 'R': '2024', 'S': '2025', 'T': '2026', 'V': '2027',
            'W': '2028', 'X': '2029', 'Y': '2030',
            '1': '2001', '2': '2002', '3': '2003', '4': '2004', '5': '2005', '6': '2006',
            '7': '2007', '8': '2008', '9': '2009'
        };
        return yearMap[yearChar] || 'Unknown';
    }

    decodeVINPlant(vin) {
        const plantChar = vin.charAt(10);
        const wmi = vin.substring(0, 3);
        
        if (wmi.startsWith('L')) {
            const chinaPlantMap = {
                'A': 'Beijing', 'B': 'Shanghai', 'C': 'Guangzhou', 'D': 'Shenzhen',
                'E': 'Tianjin', 'F': 'Wuhan', 'G': 'Chongqing', 'H': 'Nanjing',
                'J': 'Chengdu', 'K': 'Xi\'an', 'L': 'Hangzhou', 'M': 'Suzhou',
                'N': 'Dongguan', 'P': 'Foshan', 'R': 'Qingdao', 'S': 'Zhengzhou',
                'T': 'Changsha', 'U': 'Ningbo', 'V': 'Hefei', 'W': 'Xiamen',
                'X': 'Wuxi', 'Y': 'Jinan', 'Z': 'Dalian'
            };
            return chinaPlantMap[plantChar] ? `China - ${chinaPlantMap[plantChar]}` : 'China - Unknown Plant';
        }
        
        const plantMap = {
            'A': 'USA - Indiana', 'B': 'USA - Ohio', 'C': 'Canada - Ontario',
            'D': 'Germany', 'E': 'USA - Kentucky', 'F': 'USA - Michigan',
            'G': 'USA - Tennessee', 'H': 'USA - Missouri', 'J': 'Japan',
            'K': 'Korea', 'L': 'China', 'M': 'Thailand',
            'N': 'USA - Indiana', 'P': 'USA - Illinois', 'R': 'Mexico',
            'S': 'USA - California', 'T': 'USA - Texas', 'U': 'USA - Ohio',
            'V': 'USA - Wisconsin', 'W': 'Germany', 'X': 'USA - Tennessee',
            'Y': 'USA - Michigan', 'Z': 'USA - Michigan'
        };
        return plantMap[plantChar] || 'Unknown Plant';
    }

    decodeVINManufacturer(vin) {
        const wmi = vin.substring(0, 3);
        const manufacturerMap = {
            'LBE': 'Beijing Automotive (BAW)', 'LB3': 'Dongfeng Motor', 'LDC': 'Dongfeng Peugeot-Citroen',
            'LDD': 'Dongfeng Nissan', 'LDY': 'Zhongtong Bus', 'LE4': 'Beijing Benz (Mercedes-Benz)',
            'LFM': 'FAW Toyota', 'LFN': 'FAW-Volkswagen', 'LFP': 'FAW Car', 'LFT': 'FAW Jiefang',
            'LFV': 'FAW-Volkswagen', 'LGB': 'Dongfeng Nissan', 'LGH': 'GAC Honda', 'LGJ': 'Dongfeng Honda',
            'LGW': 'Great Wall Motors', 'LGX': 'BYD Auto', 'LH1': 'FAW Haima', 'LHG': 'GAC Honda',
            'LJD': 'Dongfeng Peugeot-Citroen', 'LJN': 'Zhengzhou Nissan', 'LLV': 'Lifan Motors',
            'LMG': 'GAC Motor', 'LPA': 'Changan PSA', 'LRB': 'Beijing Benz (Mercedes-Benz)',
            'LS5': 'Changan Suzuki', 'LSG': 'SAIC General Motors', 'LSJ': 'SAIC MG',
            'LSV': 'SAIC Volkswagen', 'LSY': 'Brilliance Jinbei', 'LTV': 'FAW Toyota',
            'LUC': 'Guangqi Honda', 'LUD': 'Dongfeng Yueda Kia', 'LUX': 'Dongfeng Yulon',
            'LVB': 'Foton Motor', 'LVC': 'Beijing Benz (Mercedes-Benz)', 'LVD': 'Changan Ford',
            'LVS': 'FAW Toyota', 'LVV': 'Chery Automobile', 'LVY': 'Volvo China',
            'LZW': 'SAIC-GM-Wuling', 'LZY': 'Yutong Bus',
            'JA3': 'Mitsubishi', 'JA4': 'Mitsubishi', 'JA7': 'Mitsubishi', 'JAA': 'Isuzu',
            'JAB': 'Isuzu', 'JAC': 'Isuzu', 'JAE': 'Acura', 'JAL': 'Isuzu', 'JB3': 'Dodge',
            'JB4': 'Dodge', 'JB7': 'Dodge', 'JBA': 'Hino', 'JBB': 'Hino', 'JBC': 'Hino',
            'KMH': 'Hyundai', 'KNA': 'Kia', 'KNB': 'Kia', 'KNC': 'Kia', 'KND': 'Kia',
            'WAA': 'Audi', 'WBA': 'BMW', 'WDB': 'Mercedes-Benz', 'WVW': 'Volkswagen',
            '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FD': 'Ford', '1FM': 'Ford',
            '1FT': 'Ford', '1FU': 'Freightliner', '1FV': 'Freightliner', '1G1': 'Chevrolet',
            '1G2': 'Pontiac', '1G3': 'Oldsmobile', '1G4': 'Buick', '1G6': 'Cadillac',
            '1G8': 'Chevrolet', '1GA': 'Chevrolet', '1GB': 'Chevrolet', '1GC': 'Chevrolet',
            '1GD': 'GMC', '1GE': 'Cadillac'
        };
        
        return manufacturerMap[wmi] || this.guessManufacturerFromWMI(wmi);
    }

    guessManufacturerFromWMI(wmi) {
        if (wmi.startsWith('1')) return 'USA Manufacturer';
        if (wmi.startsWith('2')) return 'Canada Manufacturer';
        if (wmi.startsWith('3')) return 'Mexico Manufacturer';
        if (wmi.startsWith('J')) return 'Japan Manufacturer';
        if (wmi.startsWith('K')) return 'Korea Manufacturer';
        if (wmi.startsWith('L')) return 'China Manufacturer';
        if (wmi.startsWith('W')) return 'Germany Manufacturer';
        if (wmi.startsWith('Z')) return 'Italy Manufacturer';
        if (wmi.startsWith('V')) return 'France Manufacturer';
        if (wmi.startsWith('S')) return 'UK Manufacturer';
        if (wmi.startsWith('Y')) return 'Sweden Manufacturer';
        if (wmi.startsWith('MA') || wmi.startsWith('MB') || wmi.startsWith('MC') || wmi.startsWith('MD') || wmi.startsWith('ME')) return 'India Manufacturer';
        return 'Unknown Manufacturer';
    }

    decodeVINModelCode(vin) {
        const vds = vin.substring(3, 9);
        return vds.substring(0, 4);
    }

    decodeVINModelName(vin) {
        const manufacturer = this.decodeVINManufacturer(vin);
        const modelCode = this.decodeVINModelCode(vin);
        const wmi = vin.substring(0, 3);
        
        const modelDatabase = {
            'LVB': {
                'S6PE': 'Foton Aumark S6',
                'S6PB': 'Foton Aumark T3',
                'T4PA': 'Foton Ollin',
                'U3PC': 'Foton View',
                'S5PD': 'Foton Sup',
                'R7PF': 'Foton Tornado'
            },
            'LVS': {
                'A2PJ': 'FAW Jiefang J6',
                'B3PK': 'FAW Jiefang J7'
            },
            'LVV': {
                'C4PL': 'Chery Tiggo 7',
                'D5PM': 'Chery Arrizo 8'
            },
            'LGB': {
                'E6PN': 'Dongfeng K-series',
                'F7PP': 'Dongfeng Warrior'
            },
            'JT1': {
                'FJ8': 'Toyota Hilux',
                'GD6': 'Toyota Land Cruiser'
            },
            'KMH': {
                'HH6': 'Hyundai Porter',
                'HH7': 'Hyundai Mighty'
            }
        };
        
        return modelDatabase[wmi]?.[modelCode] || `${manufacturer} ${modelCode} Series`;
    }

    decodeVINEngine(vin) {
        const engineChar = vin.charAt(6);
        const engineMap = {
            'P': '2.8L Diesel Turbo',
            'Q': '3.0L Diesel Turbo', 
            'R': '3.8L Diesel Turbo',
            'S': '4.5L Diesel Turbo',
            'T': '5.2L Diesel Turbo',
            'E': 'Electric Drive',
            'H': 'Hybrid System'
        };
        return engineMap[engineChar] || 'Standard Engine';
    }

    decodeVINBodyStyle(vin) {
        const bodyChar = vin.charAt(4);
        const bodyMap = {
            '6': 'Crew Cab Truck',
            '3': 'Double Cab Truck',
            '4': 'Chassis Cab', 
            '5': 'Stake Body Truck',
            '7': 'Dump Truck',
            '8': 'Tanker Truck',
            '2': 'Extended Cab'
        };
        return bodyMap[bodyChar] || 'Commercial Truck';
    }

    decodeVINVehicleType(vin) {
        const vds = vin.substring(3, 8);
        
        if (vds.match(/[A-Z]{2}5[A-Z0-9]{2}/)) return 'SUV/4x4';
        if (vds.match(/[A-Z]{2}4[A-Z0-9]{2}/)) return 'MPV/Minivan';
        if (vds.match(/[A-Z]{2}3[A-Z0-9]{2}/)) return 'Passenger Car';
        if (vds.match(/[A-Z]{2}1[A-Z0-9]{2}/)) return 'Truck';
        if (vds.match(/[A-Z]{2}2[A-Z0-9]{2}/)) return 'Bus';
        if (vds.match(/[A-Z]{2}7[A-Z0-9]{2}/)) return 'Crossover';
        if (vds.match(/[A-Z]{2}8[A-Z0-9]{2}/)) return 'Commercial Vehicle';
        
        return 'Unknown Vehicle Type';
    }

    async decodeVINWithAPI(vin) {
        try {
            const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
            const data = await response.json();
            
            if (data.Results && data.Results.length > 0) {
                return this.parseNHTSAData(data.Results);
            }
        } catch (error) {
            console.error('NHTSA API error:', error);
            return this.decodeVIN(vin);
        }
    }

    parseNHTSAData(results) {
        const vinData = {};
        
        results.forEach(item => {
            switch(item.Variable) {
                case 'Make':
                    vinData.manufacturer = item.Value;
                    break;
                case 'Model':
                    vinData.modelName = item.Value;
                    break;
                case 'Model Year':
                    vinData.modelYear = item.Value;
                    break;
                case 'Vehicle Type':
                    vinData.vehicleType = item.Value;
                    break;
                case 'Body Class':
                    vinData.bodyStyle = item.Value;
                    break;
                case 'Engine Model':
                    vinData.engineInfo = item.Value;
                    break;
            }
        });
        
        return vinData;
    }

    extractTopics(text) {
        const words = text.split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\wሀ-ፕ]/g, '');
            const minLength = /[ሀ-ፕ]/.test(cleanWord) ? 2 : 4;
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
            const cleanWord = word.replace(/[^\wሀ-ፕ]/g, '');
            const minLength = /[ሀ-ፕ]/.test(cleanWord) ? 2 : 3;
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
                <p>Processed with Tesseract.js v6.0.1</p>
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
            manufactureYear: 'Manufacture Year',
            enginePower: 'Engine Power',
            totalWeight: 'Total Weight',
            unladenWeight: 'Unladen Weight',
            loadCapacity: 'Load Capacity',
            engineCapacity: 'Engine Capacity',
            cylinderCount: 'Cylinder Count',
            permittedWork: 'Permitted Work'
        };
        return names[fieldName] || fieldName;
    }

    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'your', 
            'have', 'with', 'this', 'that', 'from', 'የ', 'አ', 'በ', 'እ', 'ወ', 'ከ', 'ለ', 'ማ', 'ነ', 'ስ'
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

    async destroy() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
            this.isInitializedT = false;
        }
    }
}

class TesseractLanguageManager {
    constructor() {
        this.dbName = 'tesseract-lang-store';
        this.storeName = 'traineddata';
        this.db = null;
        this.languages = {
            'eng': {
                name: 'English',
                localPath: 'tesseract/dist/lang-data/eng.traineddata.gz'
            },
            'amh': {
                name: 'Amharic', 
                localPath: 'tesseract/dist/lang-data/amh.traineddata.gz'
            }
        };
    }

    async init() {
        await this.openDatabase();
        console.log('✅ Tesseract Language manager initialized');
    }

    async openDatabase() {
        this.db = await openDB(this.dbName, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('traineddata')) {
                    db.createObjectStore('traineddata');
                }
            }
        });
        return this.db;
    }

    async set(key, value) {
        return this.db.put('traineddata', value, key);
    }

    async get(key) {
        return this.db.get('traineddata', key);
    }

    async checkAvailableLanguages() {
        const keys = await this.getAllKeys();
        return Object.keys(this.languages).filter(langCode => {
            const key = `./${langCode}.traineddata`;
            return keys.includes(key);
        });
    }

    async getAllKeys() {
        return this.db.getAllKeys('traineddata');
    }

    async loadLocalLanguage(langCode) {
        const lang = this.languages[langCode];
        if (!lang) {
            throw new Error(`Language ${langCode} not supported`);
        }

        console.log(`📁 Loading local ${lang.name} file from: ${lang.localPath}`);
        
        try {
            const response = await fetch(lang.localPath);
            if (!response.ok) {
                throw new Error(`Failed to load local file: HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const key = `./${langCode}.traineddata`;
            await this.set(key, uint8Array);
            
            console.log(`✅ ${lang.name} loaded from local file to IndexedDB`);
            return uint8Array;
            
        } catch (error) {
            console.error(`❌ Failed to load local ${lang.name} file:`, error);
            throw error;
        }
    }

    async isLanguageAvailable(langCode) {
        const key = `./${langCode}.traineddata`;
        try {
            const data = await this.get(key);
            return data instanceof Uint8Array && data.length > 0;
        } catch (error) {
            console.warn(`Error checking language availability for ${langCode}:`, error);
            return false;
        }
    }
}

export const teSsAna = new TessAna();
export default teSsAna;