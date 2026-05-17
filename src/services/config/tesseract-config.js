// src/config/tesseract-config.js
export const TESSERACT_CONFIG = {
    languages: {
        'eng': {
            name: 'English',
            // Vite will handle this path during build
            localPath: '/tesseract/dist/lang-data/eng.traineddata.gz'
        },
        'amh': {
            name: 'Amharic',
            localPath: '/tesseract/dist/lang-data/amh.traineddata.gz'
        }
    }
};