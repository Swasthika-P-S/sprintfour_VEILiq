const fs = require('fs');
const path = require('path');

/**
 * Extract plain text from an uploaded file.
 * Supports: .pdf, .txt, and images (jpg/png via Gemini Vision if available)
 */
async function extractTextFromFile(filePath, mimetype, originalname = 'Unknown File') {
  try {
    if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      try {
        const data = await pdfParse(buffer);
        if (!data || !data.text) {
          throw new Error('No text content returned from parser.');
        }
        return { text: data.text, method: 'pdf-parse' };
      } catch (pdfErr) {
        console.error(`❌ PDF parse error on [${originalname}] (${filePath}):`, pdfErr.message);
        throw new Error(`PDF structure issue on [${originalname}]: ${pdfErr.message}`);
      }
    }

    if (mimetype === 'text/plain' || filePath.endsWith('.txt')) {
      const text = fs.readFileSync(filePath, 'utf8');
      return { text, method: 'text-read' };
    }

    // Images: try Gemini Vision OCR
    if (mimetype.startsWith('image/')) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.startsWith('AIza')) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const imageData = fs.readFileSync(filePath).toString('base64');
        const result = await model.generateContent([
          'Extract ALL text visible in this document image. Return only the raw text, no commentary.',
          { inlineData: { data: imageData, mimeType: mimetype } },
        ]);
        const text = result.response.text();
        return { text, method: 'gemini-vision' };
      }
      return { text: '', method: 'unsupported', error: 'Image OCR requires a valid Gemini API key.' };
    }

    return { text: '', method: 'unsupported', error: 'Unsupported file type.' };
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(filePath); } catch {}
  }
}

module.exports = { extractTextFromFile };
