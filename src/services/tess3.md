extractVehicleData(text) {
    const vehicleData = {};
    
    console.log('RAW OCR TEXT:', text);
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 1);
    
    // Parse each line for field-value pairs
    lines.forEach((line, index) => {
        // Plate number
        if (line.includes('የሰሌዳ ቁጥር') || line.includes('plate number')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && this.looksLikePlateNumber(nextLine)) {
                vehicleData.plateNumber = nextLine;
            } else {
                // Try to extract from current line
                const match = line.match(/(?:የሰሌዳ ቁጥር|plate number)[:\s]*([^\s].*)/i);
                if (match && match[1]) {
                    vehicleData.plateNumber = match[1].trim();
                }
            }
        }
        
        // Previous plate
        if (line.includes('የቀድሞ ሰሌዳ') || line.includes('previous plate')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.previousPlate = nextLine;
            }
        }
        
        // Owner name
        if (line.includes('ስም') || line.includes('name')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && this.looksLikeName(nextLine)) {
                vehicleData.ownerName = nextLine;
            }
        }
        
        // Chassis number
        if (line.includes('የሻንሺ ቁጥር') || line.includes('chassis number')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && this.looksLikeChassisNumber(nextLine)) {
                vehicleData.chassisNumber = nextLine;
            } else {
                const match = line.match(/(?:የሻንሺ ቁጥር|chassis number)[:\s]*([^\s].*)/i);
                if (match && match[1]) {
                    vehicleData.chassisNumber = match[1].trim();
                }
            }
        }
        
        // Motor number
        if (line.includes('የሞተር ቁጥር') || line.includes('motor number')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.motorNumber = nextLine;
            }
        }
        
        // Vehicle model
        if (line.includes('የተሽ/ሞዴል') || line.includes('vehicle model')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.vehicleModel = nextLine;
            }
        }
        
        // Gender
        if (line.includes('ጾታ') || line.includes('gender')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && (nextLine.includes('ወንድ') || nextLine.includes('ሴት'))) {
                vehicleData.gender = nextLine;
            }
        }
        
        // Nationality
        if (line.includes('ዜግነት') || line.includes('nationality')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.nationality = nextLine;
            }
        }
        
        // City
        if (line.includes('ከተማ') || line.includes('city')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.city = nextLine;
            }
        }
        
        // Phone
        if (line.includes('ሰልክ') || line.includes('phone')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && this.looksLikePhoneNumber(nextLine)) {
                vehicleData.phone = nextLine;
            }
        }
        
        // Color
        if (line.includes('ቀለም') || line.includes('color')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.color = nextLine;
            }
        }
        
        // Manufacturer
        if (line.includes('የተሰራበት ሀገር') || line.includes('manufacturer')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.manufacturer = nextLine;
            }
        }
        
        // Year
        if (line.includes('የተሰራበት ዘመን') || line.includes('year')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && /^\d{4}$/.test(nextLine)) {
                vehicleData.manufactureYear = nextLine;
            }
        }
        
        // Vehicle type
        if (line.includes('የመኪና አይነት')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.vehicleType = nextLine;
            }
        }
        
        // Body type
        if (line.includes('የአካሉ አይነት')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.bodyType = nextLine;
            }
        }
        
        // Fuel type
        if (line.includes('የነዳጅ ዓይነት')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine) {
                vehicleData.fuelType = nextLine;
            }
        }
        
        // Engine power
        if (line.includes('የሞተር የፈረስ ጉልበት')) {
            const nextLine = lines[index + 1] || '';
            if (nextLine && /^\d+$/.test(nextLine)) {
                vehicleData.enginePower = nextLine;
            }
        }
    });
    
    // Clean up extracted data
    Object.keys(vehicleData).forEach(key => {
        if (vehicleData[key]) {
            vehicleData[key] = vehicleData[key].replace(/[^\wሀ-ፕ\-\s]/g, '').trim();
        }
    });
    
    console.log('EXTRACTED DATA:', vehicleData);
    return vehicleData;
}

looksLikePlateNumber(text) {
    return /[ኢትሀለሐመረሰዐጠጨፈA-Z0-9\-\s]{4,15}/.test(text);
}

looksLikeName(text) {
    if (text.length < 3 || text.length > 50) return false;
    if (/\d/.test(text)) return false;
    return /[ሀ-ፕA-Za-z]/.test(text);
}

looksLikeChassisNumber(text) {
    return /[A-HJ-NPR-Z0-9]{10,17}/.test(text.replace(/\s/g, ''));
}

looksLikePhoneNumber(text) {
    return /^[\d\s\-+]{8,15}$/.test(text);
}





extractVehicleData(text) {
    const vehicleData = {};
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 1);
    
    // Field mapping - what to look for and where the value typically is
    const fieldMap = {
        'የሰሌዳ ቁጥር': 'plateNumber',
        'plate number': 'plateNumber',
        'የቀድሞ ሰሌዳ': 'previousPlate', 
        'previous plate': 'previousPlate',
        'ስም': 'ownerName',
        'name': 'ownerName',
        'የሻንሺ ቁጥር': 'chassisNumber',
        'chassis number': 'chassisNumber',
        'የሞተር ቁጥር': 'motorNumber',
        'motor number': 'motorNumber',
        'የተሽ/ሞዴል': 'vehicleModel',
        'vehicle model': 'vehicleModel',
        'ጾታ': 'gender',
        'gender': 'gender',
        'ዜግነት': 'nationality',
        'nationality': 'nationality',
        'ከተማ': 'city',
        'city': 'city',
        'ክ/ከተማ': 'subcity',
        'ቀበሌ/ወረዳ': 'woreda',
        'የቤት ቁጥር': 'houseNumber',
        'ሰልክ': 'phone',
        'phone': 'phone',
        'ቀለም': 'color',
        'color': 'color',
        'የተሰራበት ሀገር': 'manufacturer',
        'manufacturer': 'manufacturer',
        'የተሰራበት ዘመን': 'manufactureYear',
        'year': 'manufactureYear',
        'የመኪና አይነት': 'vehicleType',
        'የአካሉ አይነት': 'bodyType',
        'የነዳጅ ዓይነት': 'fuelType',
        'የሞተር የፈረስ ጉልበት': 'enginePower',
        'የተሽ/ጠቅ/ክብደት': 'totalWeight',
        'ነጠላ ክብደት': 'unladenWeight',
        'የጭነት መጠን': 'loadCapacity',
        'የሞተር ችሎታ/ሲሲ/': 'engineCapacity',
        'የሲሊንደር ብዛት': 'cylinderCount',
        'የተፈቀደለት የስራ ጸባይ': 'permittedWork'
    };

    // Parse each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line contains a field label
        for (const [fieldLabel, dataKey] of Object.entries(fieldMap)) {
            if (line.includes(fieldLabel)) {
                // Try to extract value from current line first
                const inlineMatch = line.match(new RegExp(fieldLabel + '[\\s:]*([^\\s].*)', 'i'));
                if (inlineMatch && inlineMatch[1]) {
                    vehicleData[dataKey] = inlineMatch[1].trim();
                } else {
                    // Look at next line for value
                    const nextLine = lines[i + 1];
                    if (nextLine && !this.isFieldLabel(nextLine, fieldMap)) {
                        vehicleData[dataKey] = nextLine;
                    }
                }
                break;
            }
        }
    }

    // Clean extracted values
    Object.keys(vehicleData).forEach(key => {
        if (vehicleData[key]) {
            vehicleData[key] = vehicleData[key]
                .replace(/^[:\-\s]+|[:\-\s]+$/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }
    });

    return vehicleData;
}

isFieldLabel(line, fieldMap) {
    for (const fieldLabel of Object.keys(fieldMap)) {
        if (line.includes(fieldLabel)) {
            return true;
        }
    }
    return false;
}






detectLanguage(text) {
        // Simple language detection based on character sets
        const ethiopicChars = /[ሀ-ፕ]/;
        const latinChars = /[a-zA-Z]/;
        
        const hasEthiopic = ethiopicChars.test(text);
        const hasLatin = latinChars.test(text);
        
        if (hasEthiopic && hasLatin) return 'am-en'; // Amharic-English bilingual
        if (hasEthiopic) return 'am'; // Amharic
        if (hasLatin) return 'en'; // English
        return 'unknown';
    }

    extractTopics(text) {
        const words = text.toLowerCase().split(/\s+/);
        const wordFreq = {};
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\wሀ-ፕ]/g, '');
            if (cleanWord.length > 3 && !this.isCommonWord(cleanWord)) {
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
            if (cleanWord.length > 2) {
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




    Robust Version with Multiple Fallbacks:
const patterns = {
    plateNumber: [
        /(?:የሰሌዳ\s*ቁጥር|plate\s*number)[^:\n]*[:;\s-]+([^\n]+)/i,
        /(?:licence|license)\s*plate[^:\n]*[:;\s-]+([^\n]+)/i,
        /[\s]([A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+)(?=\s|$)/, // Pattern: XXX-XX-XXXX
        /[\s]([A-Z]{2,3}-\d{1,2}-[A-Z0-9]{4,5})(?=\s|$)/ // Ethiopian plate pattern
    ],
    
    chassisNumber: [
        /(?:ሻሺ\s*ቁጥር|chassis\s*number)[^:\n]*[:;\s-]+([^\n]+)/i,
        /(?:VIN|vin)[^:\n]*[:;\s-]+([A-HJ-NPR-Z0-9]{17})/i, // Standard VIN format
        /[\s]([A-HJ-NPR-Z0-9]{17})(?=\s|$)/ // Standalone VIN
    ],
    
    motorNumber: [
        /(?:የሞተር\s*ቁጥር|motor\s*number|engine\s*number)[^:\n]*[:;\s-]+([^\n]+)/i,
        /engine[^:\n#]*[#\s:]+([A-Z0-9]+)/i
    ],
    
    vehicleModel: [
        /(?:የተሽ\s*\/?\s*ሞዴል|vehicle\s*model|model)[^:\n]*[:;\s-]+([^\n]+)/i,
        /make[^:\n]*model[^:\n]*[:;\s-]+([^\n]+)/i
    ],
    
    manufacturer: [
        /(?:የተሰራበት\s*ሀገር|manufacturer|made\s*in)[^:\n]*[:;\s-]+([^\n]+)/i,
        /country[^:\n]*[:;\s-]+([^\n]+)/i
    ],
    
    manufactureYear: [
        /(?:የተሰራበት\s*ዘመን|manufacture\s*year|year)[^:\n]*[:;\s-]+(\d{4})/i,
        /model\s*year[^:\n]*[:;\s-]+(\d{4})/i,
        /\b(19|20)\d{2}\b/ // Any 4-digit year
    ],
    
    ownerName: [
        /(?:ስም|name|owner)[^:\n]*[:;\s-]+([^\n]+?)(?=\s*(?:\n|ፆታ|gender|$))/i,
        /owner['"]?s?\s*name[^:\n]*[:;\s-]+([^\n]+)/i
    ],
    
    color: [
        /(?:ቀለም|color|colour)[^:\n]*[:;\s-]+([^\n]+)/i,
        /paint[^:\n]*[:;\s-]+([^\n]+)/i
    ],
    
    fuelType: [
        /(?:የነዳጅ\s*ዓይነት|fuel\s*type|fuel)[^:\n]*[:;\s-]+([^\n]+)/i,
        /(?:diesel|petrol|gasoline|electric|hybrid)\b/i
    ]
};
Extraction Function:
extractVehicleData(text) {
    const vehicleData = {};
    
    for (const [key, patternArray] of Object.entries(patterns)) {
        let value = null;
        
        // Handle both single pattern and array of patterns
        const patternsToTry = Array.isArray(patternArray) ? patternArray : [patternArray];
        
        for (const pattern of patternsToTry) {
            const match = text.match(pattern);
            if (match && match[1]) {
                value = match[1].trim();
                // Clean up the value
                value = value.replace(/^[:;\s-]+|[:;\s-]+$/g, '');
                break;
            }
        }
        
        if (value) {
            vehicleData[key] = value;
        }
    }
    
    return vehicleData;
}
Key Improvements:
Multiple pattern alternatives for each field

Lookahead assertions to stop at logical boundaries

Flexible spacing with \s*

Multiple separator handling (colons, semicolons, dashes)

Format-specific patterns for known formats (VIN, plate numbers)

Better boundary detection using lookaheads

Value cleaning to remove trailing separators

This approach will handle various document layouts, different label formats, and both Amharic and English terminology much more reliably.

Let me break down the most complex regex from the improved patterns:

Regex: /(?:የሰሌዳ\s*ቁጥር|plate\s*number|licence\s*plate)[\s:;-]*([^\n]+?)(?=\s*(?:\n|$|የ|ሻሺ|Chassis|Motor|ሞተር|ፆታ|$))/i
Breakdown by Components:
1. Label Matching (Non-capturing group):

regex
(?:የሰሌዳ\s*ቁጥር|plate\s*number|licence\s*plate)
(?:...) - Non-capturing group (groups without saving)

የሰሌዳ\s*ቁጥር - Amharic "plate number" with optional spaces

| - OR operator

plate\s*number - English "plate number" with optional spaces

| - OR operator

licence\s*plate - Alternative English spelling

2. Separators:

regex
[\s:;-]*
Matches zero or more of: spaces, colons, semicolons, or dashes

3. Value Capture (Lazy capture):

regex
([^\n]+?)
([^\n]+?) - Captures one or more characters that are NOT newlines

+? - Lazy quantifier (stops at the first opportunity)

4. Lookahead Boundary (Complex part):

regex
(?=\s*(?:\n|$|የ|ሻሺ|Chassis|Motor|ሞተር|ፆታ|$))
Understanding the Lookahead:
The lookahead (?=...) says: "Stop capturing when you see what's coming next, but don't consume it"

Inside the lookahead:

\s* - Optional whitespace

(?:...) - Non-capturing group of stop conditions:

\n - Newline (stop at end of line)

$ - End of string

የ - Amharic character that often starts new fields

ሻሺ - Amharic "chassis" (next field)

Chassis - English "chassis" (next field)

Motor - English "motor" (next field)

ሞተር - Amharic "motor" (next field)

ፆታ - Amharic "gender" (much later field)

How It Works in Practice:
Example Document Text:

text
የሰሌዳ ቁጥር: ኢት-03-A28940 ሻሺ ቁጥር: LVS6PEB7RI501508
Step-by-step Matching:

Finds label: የሰሌዳ ቁጥር

Skips separator: :

Starts capturing: ኢት-03-A28940

Sees lookahead: Space + ሻሺ (stop condition!)

Stops capturing: Returns ኢት-03-A28940

Why This is Better:
Without lookahead: Might capture: ኢት-03-A28940 ሻሺ ቁጥር: LVS6PEB7RI501508

With lookahead: Correctly captures only: ኢት-03-A28940

Alternative Simpler Version:
If the lookahead is too complex, you could use:

regex
/(?:የሰሌዳ\s*ቁጥር|plate\s*number)[\s:;-]*([^\s\n]+([\s]+[^\s\n]+)*)/
This captures words separated by spaces, but stops at newlines.

The lookahead approach is more precise because it understands the document structure and knows what typically comes after each field.




extractVehicleData(text) {
        const vehicleData = {};
        
        // Extract vehicle information using regex patterns
        const patterns = {
            plateNumber: /የሰሌዳ ቁጥር[\s:]*([^\s\n]+)/i,
            chassisNumber: /Chassis Number[\s:]*([^\s\n]+)|ሻንሺ ቁጥር[\s:]*([^\s\n]+)/i,
            motorNumber: /Motor Number[\s:]*([^\s\n]+)|የሞተር ቁጥር[\s:]*([^\s\n]+)/i,
            vehicleModel: /የተሽ\/ሞዴል[\s:]*([^\s\n]+)|vehicle model[\s:]*([^\s\n]+)/i,
            manufacturer: /የተሰራበት ሀገር[\s:]*([^\s\n]+)|manufacturer[\s:]*([^\s\n]+)/i,
            manufactureYear: /የተሰራበት ዘመን[\s:]*([^\s\n]+)|year[\s:]*([^\s\n]+)/i,
            ownerName: /ስም[\s:]*([^\n]+)|name[\s:]*([^\n]+)/i,
            color: /ቀለም[\s:]*([^\s\n]+)|color[\s:]*([^\s\n]+)/i,
            fuelType: /የነዳጅ ዓይነት[\s:]*([^\s\n]+)|fuel type[\s:]*([^\s\n]+)/i
        };
        
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) {
                // Use the first non-empty capture group
                vehicleData[key] = match[1] || match[2] || match[0];
            }
        }
        
        return vehicleData;
    }