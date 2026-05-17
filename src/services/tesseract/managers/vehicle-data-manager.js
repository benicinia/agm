import { VINDecoder } from '../utils/vin-decoder.js';

export class VehicleDataManager {
    constructor() {
        this.vinDecoder = new VINDecoder();
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

    getKeyPatterns() {
        return {
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
            // ... include all other key patterns from original
            motorNumber: {
                keys: ['የሞተር\\s*ቁጥር', 'motor\\s*number'],
                extractPattern: /.{8,25}/
            }
            // ... rest of patterns
        };
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
                        
                        const vinData = this.vinDecoder.decodeVIN(vinMatch[1]);
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
                            
                            const vinData = this.vinDecoder.decodeVIN(vinMatch[1]);
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
}