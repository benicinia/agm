import { TextProcessor } from './text-processor.js';
import { VehicleDataManager } from '../managers/vehicle-data-manager.js';

export class DocumentClassifier {
    constructor() {
        this.textProcessor = new TextProcessor();
        this.vehicleDataManager = new VehicleDataManager();
    }

    classifyDocument(text, fileName) {
        const lowerText = text.toLowerCase();
        
        let type = "General Document";
        let typeClass = "type-other";
        let confidence = 0.3;
        let category = "other";
        let detectedLanguage = this.textProcessor.detectLanguage(text);

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
        // ... other classification rules

        const topics = this.textProcessor.extractTopics(text);
        const keywords = this.textProcessor.extractKeywords(text);
        const extractedData = this.vehicleDataManager.extractVehicleData(text);
        
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
}