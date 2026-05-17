// client/src/services/pdfExtractor.js
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export class PDFTextExtractor {
  constructor() {
    this.pdfjsLib = pdfjsLib
  }

  async extractAndSend(file) {
    try {
      // Convert file to array buffer
      const fileBuffer = await file.arrayBuffer()
      
      // Load PDF document
      const pdf = await this.pdfjsLib.getDocument(fileBuffer).promise
      
      // Extract text from all pages
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }

      // Send raw text to server
      const response = await fetch('/api/pdf/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text: fullText,
          fileName: file.name,
          fileSize: file.size,
          pageCount: pdf.numPages
        })
      })

      return await response.json()

    } catch (error) {
      console.error('PDF extraction error:', error)
      throw new Error(`PDF extraction failed: ${error.message}`)
    }
  }
}

// Export singleton instance
export const pdfExtractor = new PDFTextExtractor()