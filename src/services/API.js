class ApiHandler {
  constructor() {
    this.baseUrl = 'https://api.etrade.gov.et/api/v1';
    this.apiKey = 'process.env.ETRADE_API_KEY';
   
    // Sample database array with test business license data
    this.sampleDatabase = [
      {
        license_number: '14/668/5068/2004',
        valid: true,
        status: 'active',
        expiration_date: '2025-12-31',
        business_name: 'KEDIJA ALI WANDADI',
        business_type: 'Sole Proprietorship',
        registration_date: '2004-01-15',
        address: 'Addis Ababa, Ethiopia',
        tin_number: '0000369033',
        export_class: 'valid'
      },
      {
        license_number: '12/345/6789/2023',
        valid: true,
        status: 'active',
        expiration_date: '2024-06-30',
        business_name: 'ETHIO TRADING PLC',
        business_type: 'PLC',
        registration_date: '2023-03-20',
        address: 'Dire Dawa, Ethiopia',
        tin_number: '0000456712',
        export_class: 'valid'
      },
      {
        license_number: '15/789/1234/2022',
        valid: false,
        status: 'expired',
        expiration_date: '2023-12-31',
        business_name: 'AWASH IMPORT EXPORT',
        business_type: 'Private Limited',
        registration_date: '2022-02-10',
        address: 'Adama, Ethiopia',
        tin_number: '0000789456',
        export_class: 'expired'
      },
      {
        license_number: '11/222/3333/2021',
        valid: true,
        status: 'active',
        expiration_date: '2024-09-15',
        business_name: 'BLUE NILE MANUFACTURING',
        business_type: 'Manufacturing',
        registration_date: '2021-08-05',
        address: 'Bahir Dar, Ethiopia',
        tin_number: '0000895632',
        export_class: 'valid'
      }
    ];
  }

  // Find business license in sample database
  findInDatabase(licenseNumber) {
    const formattedLicense = this.formatLicenseNumber(licenseNumber);
    return this.sampleDatabase.find(item => 
      this.formatLicenseNumber(item.license_number) === formattedLicense
    );
  }

  async validateBusinessLicense(licenseNumber) {
    try {
      // Simulate API delay
      await this.simulateDelay();
      
      const businessData = this.findInDatabase(licenseNumber);
      
      if (!businessData) {
        return {
          isValid: false,
          businessData: null,
          status: 'not_found',
          expirationDate: null,
          businessName: null,
          businessType: null,
          registrationDate: null,
          address: null,
          tinNumber: null,
          exportClass: null,
          error: 'Business license not found in database'
        };
      }

      return {
        isValid: businessData.valid || false,
        businessData: businessData,
        status: businessData.status || 'unknown',
        expirationDate: businessData.expiration_date,
        businessName: businessData.business_name,
        businessType: businessData.business_type,
        registrationDate: businessData.registration_date,
        address: businessData.address,
        tinNumber: businessData.tin_number,
        exportClass: businessData.export_class,
        error: null
      };

    } catch (error) {
      console.error('Business license validation error:', error);
      return {
        isValid: false,
        error: error.message,
        businessData: null
      };
    }
  }

  async renewBusinessLicense(licenseNumber, supportingDocs = []) {
    try {
      await this.simulateDelay();
      
      const businessData = this.findInDatabase(licenseNumber);
      
      if (!businessData) {
        return {
          success: false,
          renewalId: null,
          newExpirationDate: null,
          status: 'not_found',
          message: 'License not found',
          error: 'Business license not found in database'
        };
      }

      // Simulate renewal process
      const renewalId = 'REN-' + Date.now();
      const newExpirationDate = new Date();
      newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
      
      // Update the sample data (in real scenario, this would update the database)
      businessData.expiration_date = newExpirationDate.toISOString().split('T')[0];
      businessData.status = 'active';
      businessData.valid = true;

      return {
        success: true,
        renewalId: renewalId,
        newExpirationDate: businessData.expiration_date,
        status: businessData.status,
        message: 'Business license renewed successfully',
        error: null
      };

    } catch (error) {
      console.error('Business license renewal error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLicenseStatus(licenseNumber) {
    try {
      await this.simulateDelay();
      
      const businessData = this.findInDatabase(licenseNumber);
      
      if (!businessData) {
        return {
          status: 'not_found',
          isValid: false,
          expirationDate: null,
          businessName: null,
          lastRenewalDate: null,
          daysUntilExpiry: null,
          tinNumber: null,
          error: 'Business license not found in database'
        };
      }

      // Calculate days until expiry
      const today = new Date();
      const expiryDate = new Date(businessData.expiration_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      return {
        status: businessData.status,
        isValid: businessData.valid || false,
        expirationDate: businessData.expiration_date,
        businessName: businessData.business_name,
        lastRenewalDate: businessData.registration_date, // Using registration as last renewal for sample
        daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
        tinNumber: businessData.tin_number,
        exportClass: businessData.export_class,
        error: null
      };

    } catch (error) {
      console.error('License status check error:', error);
      return {
        status: 'error',
        isValid: false,
        error: error.message
      };
    }
  }

  // Get all sample licenses (for testing/debugging)
  getAllSampleLicenses() {
    return this.sampleDatabase.map(item => ({
      licenseNumber: item.license_number,
      businessName: item.business_name,
      tinNumber: item.tin_number,
      status: item.status,
      isValid: item.valid,
      exportClass: item.export_class
    }));
  }

  // Add new sample license to database
  addSampleLicense(licenseData) {
    this.sampleDatabase.push(licenseData);
    return licenseData;
  }

  // Utility method to format license number
  formatLicenseNumber(licenseNumber) {
    return licenseNumber.replace(/[^\d\/]/g, '');
  }

  // Validate license number format
  isValidLicenseFormat(licenseNumber) {
    const formatted = this.formatLicenseNumber(licenseNumber);
    const licenseRegex = /^\d{2}\/\d{3,4}\/\d{3,4}\/\d{4}$/;
    return licenseRegex.test(formatted);
  }

  // Simulate API delay
  async simulateDelay(min = 100, max = 1000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

export const apiHandler = new ApiHandler();

// Example usage:
/*
async function testApiHandler() {
  // Test with the provided license number
  const result = await apiHandler.validateBusinessLicense('14/668/5068/2004');
  console.log('Validation Result:', result);
  
  // Test status check
  const status = await apiHandler.getLicenseStatus('14/668/5068/2004');
  console.log('Status Result:', status);
  
  // Test with non-existent license
  const notFound = await apiHandler.validateBusinessLicense('99/999/9999/9999');
  console.log('Not Found Result:', notFound);
  
  // Get all sample licenses
  const allLicenses = apiHandler.getAllSampleLicenses();
  console.log('All Sample Licenses:', allLicenses);
}

testApiHandler();
*/