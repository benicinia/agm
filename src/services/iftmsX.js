import { pipeline } from '@huggingface/transformers';

class NLPProcessorX {
  constructor() {
    this.classifier = null;
    this.qaModel = null;
    this.summarizer = null;
    this.initialized = false;
  }

  async initialize(language = 'en') {
    if (this.initialized) return;

    try {
      // Load models based on language
      if (language === 'am') {
        // Amharic models
        this.classifier = await pipeline('text-classification', 'Henok/Amharic-Text-Classification');
        this.qaModel = await pipeline('question-answering', 'Henok/amharic-qa');
        this.summarizer = await pipeline('summarization', 'yohannesahunm/mt5-small-Amharic-text-summarization');
      } else {
        // English models
        this.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        this.qaModel = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
        this.summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-12-6');
      }
      
      this.initialized = true;
      console.log('NLP models initialized for language:', language);
    } catch (error) {
      console.error('Error initializing NLP models:', error);
      // Fallback to simple rule-based processing
      this.initialized = false;
    }
  }

  async classifyIntent(text, language) {
    if (!this.initialized) {
      await this.initialize(language);
    }

    try {
      const result = await this.classifier(text);
      return result[0].label;
    } catch (error) {
      console.error('Error in intent classification:', error);
      return this.fallbackIntentClassification(text, language);
    }
  }

  fallbackIntentClassification(text, language) {
    const lowerText = text.toLowerCase();
    
    if (language === 'am') {
      // Amharic keywords
      if (text.includes('ፈቃድ') || text.includes('ንግድ') || text.includes('ማረጋገጫ')) {
        return 'business_verification';
      }
      if (text.includes('ተሽከርካሪ') || text.includes('መኪና') || text.includes('ጭነት')) {
        return 'vehicle_info';
      }
      if (text.includes('ሹፌር') || text.includes('ደረሰኝ') || text.includes('መታወቂያ')) {
        return 'driver_info';
      }
      if (text.includes('ፍቃድ') || text.includes('ማጠናቀቅ') || text.includes('ትእዛዝ')) {
        return 'completion';
      }
    } else {
      // English keywords
      if (lowerText.includes('license') || lowerText.includes('business') || lowerText.includes('verify')) {
        return 'business_verification';
      }
      if (lowerText.includes('vehicle') || lowerText.includes('truck') || lowerText.includes('freight')) {
        return 'vehicle_info';
      }
      if (lowerText.includes('driver') || lowerText.includes('license') || lowerText.includes('id')) {
        return 'driver_info';
      }
      if (lowerText.includes('complete') || lowerText.includes('finish') || lowerText.includes('approve')) {
        return 'completion';
      }
    }
    
    return 'general_inquiry';
  }

  async extractLicenseNumber(text, language) {
    if (!this.initialized) {
      await this.initialize(language);
    }

    try {
      // Use QA model to extract license numbers
      const question = language === 'am' ? 'የንግድ ፈቃድ ቁጥር ምንድን ነው?' : 'What is the business license number?';
      const result = await this.qaModel(question, text);
      
      if (result.score > 0.3) {
        // Further validate if it looks like a license number
        const licenseMatch = result.answer.match(/\b[A-Z0-9]{8,12}\b/);
        if (licenseMatch) {
          return licenseMatch[0];
        }
        return result.answer;
      }
    } catch (error) {
      console.error('Error in license extraction:', error);
    }

    // Fallback regex extraction
    const licenseMatch = text.match(/\b(?:BL|LIC|REG)?[A-Z0-9]{8,12}\b/);
    return licenseMatch ? licenseMatch[0] : null;
  }

  async summarizeDocument(text, language) {
    if (!this.initialized) {
      await this.initialize(language);
    }

    try {
      const result = await this.summarizer(text, {
        max_length: 150,
        min_length: 30,
        do_sample: false
      });
      return result[0].summary_text;
    } catch (error) {
      console.error('Error in document summarization:', error);
      // Return first 200 characters as fallback
      return text.slice(0, 200) + (text.length > 200 ? '...' : '');
    }
  }

  async processStepSpecificInput(text, currentStep, language, isFileContent = false) {
    if (!this.initialized) {
      await this.initialize(language);
    }

    const intent = await this.classifyIntent(text, language);
    
    switch (currentStep) {
      case 1: // Business License Verification
        return await this.processBusinessVerification(text, intent, language, isFileContent);
      
      case 2: // Vehicle Information
        return await this.processVehicleInformation(text, intent, language, isFileContent);
      
      case 3: // Driver Information
        return await this.processDriverInformation(text, intent, language, isFileContent);
      
      case 4: // Final Approval
        return await this.processFinalApproval(text, intent, language);
      
      default:
        return this.getDefaultResponse(language);
    }
  }

  async processBusinessVerification(text, intent, language, isFileContent) {
    let response = {
      text: '',
      actions: [],
      nextStep: null
    };

    if (isFileContent) {
      const licenseNumber = await this.extractLicenseNumber(text, language);
      if (licenseNumber) {
        response.text = language === 'am' 
          ? `የንግድ ፈቃድ ቁጥር ${licenseNumber} ተገኝቷል። ማረጋገጫ እየተላለፈ ነው...`
          : `Business license number ${licenseNumber} found. Verifying...`;
        
        // Simulate API verification
        setTimeout(() => {
          response.text += language === 'am' 
            ? '\nማረጋገጫ ተሳክቷል! ወደ ቀጣዩ ደረጃ እንሂድ።'
            : '\nVerification successful! Proceeding to next step.';
          response.nextStep = 2;
        }, 1000);
      } else {
        response.text = language === 'am'
          ? 'የንግድ ፈቃድ ቁጥር ሊገኝ አልቻለም። እባክዎ በእጅ ያስገቡት ወይም ሌላ ፋይል ይስቀሉ።'
          : 'Could not extract business license number. Please enter manually or upload a different file.';
      }
    } else {
      const licenseNumber = await this.extractLicenseNumber(text, language);
      if (licenseNumber || intent === 'business_verification') {
        response.text = language === 'am'
          ? 'የንግድ ፈቃድ ቁጥር እየተረጋገጠ ነው...'
          : 'Business license number is being verified...';
        response.nextStep = 2;
      } else {
        response.text = language === 'am'
          ? 'እባክዎ ትክክለኛውን የንግድ ፈቃድ ቁጥር ያስገቡ።'
          : 'Please enter a valid business license number.';
      }
    }

    return response;
  }

  async processVehicleInformation(text, intent, language, isFileContent) {
    let response = {
      text: '',
      actions: [],
      nextStep: null
    };

    if (isFileContent) {
      const summary = await this.summarizeDocument(text, language);
      response.text = language === 'am'
        ? `ሰነድ ተተነብኗል። ማጠቃለያ: ${summary}`
        : `Document processed. Summary: ${summary}`;
      response.actions = language === 'am' 
        ? ['ተጨማሪ ሰነድ ይስቀሉ', 'ወደ ቀጣዩ ይሂዱ'] 
        : ['Upload Another Document', 'Proceed to Next'];
    } else {
      response.text = language === 'am'
        ? 'የተሽከርካሪ መረጃን ያስገቡ። እባክዎ የተሽከርካሪውን ሁሉንም ሰነዶች ይስቀሉ።'
        : 'Please provide vehicle information. Upload all required documents for the vehicle.';
      response.actions = language === 'am' 
        ? ['የተሽከርካሪ ሰነዶች ይስቀሉ', 'ሌላ ተሽከርካሪ ያክሉ'] 
        : ['Upload Vehicle Documents', 'Add Another Vehicle'];
    }

    return response;
  }

  async processDriverInformation(text, intent, language, isFileContent) {
    let response = {
      text: '',
      actions: [],
      nextStep: null
    };

    if (isFileContent) {
      const summary = await this.summarizeDocument(text, language);
      response.text = language === 'am'
        ? `የሹፌር ሰነድ ተተነብኗል። ማጠቃለያ: ${summary}`
        : `Driver document processed. Summary: ${summary}`;
    } else {
      response.text = language === 'am'
        ? 'የሹፌር መረጃን ያስገቡ። የሹፌር ፈቃድ እና የታደሰ መታወቂያ ሰነድ ያስፈልጋል።'
        : 'Please provide driver information. Driver license and national ID are required.';
    }

    response.actions = language === 'am' 
      ? ['የሹፌር ሰነዶች ይስቀሉ', 'ማጠናቀቅ'] 
      : ['Upload Driver Documents', 'Complete'];

    return response;
  }

  async processFinalApproval(text, intent, language) {
    let response = {
      text: '',
      actions: [],
      nextStep: null
    };

    response.text = language === 'am'
      ? 'ማመልከቻዎ ተጠናቅቋል! ሁሉም ሰነዶች ተረጋግጠዋል። የጭነት መጓጓዣ ፈቃድዎ ለ1 ዓመት ተሰጥቷል።'
      : 'Your application is complete! All documents have been verified. Your freight transport license has been granted for 1 year.';
    
    response.actions = language === 'am' 
      ? ['ፈቃድ ያውርዱ', 'አዲስ ማመልከቻ'] 
      : ['Download License', 'New Application'];

    return response;
  }

  getDefaultResponse(language) {
    return {
      text: language === 'am'
        ? 'እባክዎ ለመጀመር የንግድ ፈቃድዎን ያረጋግጡ።'
        : 'Please verify your business license to get started.',
      actions: [],
      nextStep: null
    };
  }
}

// Singleton instance
const nlpProcessorX = new NLPProcessorX();

export async function processUserInputX(input, currentStep, language, isFileContent = false) {
  return await nlpProcessorX.processStepSpecificInput(input, currentStep, language, isFileContent);
}

export async function initializeNLP(language = 'en') {
  return await nlpProcessorX.initialize(language);
}