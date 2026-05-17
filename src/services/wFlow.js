const iftmWorkflows = {
  registeR: {
    name: "register operator",
    steps: [
      { name: "get phone number", status: null },
      { name: "sent otp", status: null },
      { name: "verify otp", status: null },
      { name: "get business license number", status: null },
       { name: "validate business", status: null }
      
    ],
    status: null
  },
  addVehicle: {
    name: "addVehicle",
    steps: [
      { name: "get libre", status: null },
      { name: "get insurance info", status: null },
      { name: "get gps info", status: null },
       { name: "get driver info", status: null },
      { name: "extract casis number", status: null },
      { name: "decodeVin", status: null },
      { name: "extract plate number", status: null },
      { name: "vehicle have trailer", status: null,next: addVehicle },
      { name: "vehicle have driver",status: null, next: addDriver }
    ],
   status: null
  },
  receipt: {
    name: "Receipt Processing",
    steps: [
      { name: "Vendor Detection", func: detectVendor },
      { name: "Date Extraction", func: extractDate },
      { name: "Line Item Processing", func: processLineItems },
      { name: "Tax Analysis", func: analyzeTax },
      { name: "Payment Method Detection", func: detectPaymentMethod },
      { name: "Total Verification", func: verifyTotals }
    ],
    requiresFullText: false,
    icon: "🧾",
    category: "Financial"
  },
  ethiopianId: {
    name: "Ethiopian ID Verification",
    steps: [
      { name: "Text Extraction", func: extractIdText },
      { name: "Field Validation", func: validateIdFields },
      { name: "QR Code Analysis", func: analyzeQRCode },
      { name: "Biometric Check", func: checkBiometricData },
      { name: "Data Consistency Check", func: checkIdConsistency },
      { name: "Fraud Detection", func: detectIdFraud },
      { name: "Expiry Check", func: checkIdExpiry }
    ],
    requiresFullText: true,
    icon: "🪪",
    category: "Identity",
    priority: "high"
  },
  ethiopianBusinessLicense: {
    name: "Ethiopian Business License Analysis",
    steps: [
      { name: "Document Authentication", func: verifyLicenseAuthenticity },
      { name: "Business Info Extraction", func: extractBusinessInfo },
      { name: "Owner/Manager Verification", func: verifyOwnerManager },
      { name: "License Validation", func: validateLicenseDetails },
      { name: "Address Verification", func: verifyBusinessAddress },
      { name: "Capital Verification", func: verifyCapital },
      { name: "Expiry/Renewal Check", func: checkLicenseExpiry }
    ],
    requiresFullText: true,
    icon: "🏢",
    category: "Business",
    priority: "medium"
  },
  invoice: {
    name: "Invoice Processing",
    steps: [
      { name: "Vendor Extraction", func: extractVendorInfo },
      { name: "Invoice Number Detection", func: detectInvoiceNumber },
      { name: "Date Extraction", func: extractInvoiceDates },
      { name: "Line Item Processing", func: processInvoiceItems },
      { name: "Tax Analysis", func: analyzeInvoiceTax },
      { name: "Payment Terms Extraction", func: extractPaymentTerms }
    ],
    requiresFullText: false,
    icon: "🧾",
    category: "Financial"
  },
  governmentDocument: {
    name: "Government Document Analysis",
    steps: [
      { name: "Document Type Identification", func: identifyGovDocType },
      { name: "Header/Footer Analysis", func: analyzeHeadersFooters },
      { name: "Seal/Stamp Verification", func: verifySealsStamps },
      { name: "Signature Validation", func: validateSignatures },
      { name: "Content Classification", func: classifyContent },
      { name: "Sensitive Data Detection", func: detectSensitiveInfo }
    ],
    requiresFullText: true,
    icon: "🏛️",
    category: "Government"
  },
  medicalReport: {
    name: "Medical Report Analysis",
    steps: [
      { name: "Patient Info Extraction", func: extractPatientInfo },
      { name: "Diagnosis Identification", func: identifyDiagnoses },
      { name: "Treatment Analysis", func: analyzeTreatments },
      { name: "Medication Extraction", func: extractMedications },
      { name: "Sensitive Data Redaction", func: redactSensitiveInfo },
      { name: "Report Validation", func: validateMedicalReport }
    ],
    requiresFullText: true,
    icon: "🏥",
    category: "Healthcare",
    sensitive: true
  }
};