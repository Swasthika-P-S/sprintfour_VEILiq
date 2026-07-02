const { extractTextFromFile } = require('../services/fileProcessor');
const { detectWithRegex } = require('../services/piiDetector');

/**
 * POST /api/upload
 * Accepts multipart/form-data with a 'file' field.
 * Returns: { text, entities, method }
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const { path: filePath, mimetype, originalname } = req.file;
    let result;
    try {
      result = await extractTextFromFile(filePath, mimetype, originalname);
    } catch (err) {
      return res.status(422).json({
        error: `This PDF could not be fully parsed — results may be incomplete. Details: ${err.message}`,
        method: 'pdf-parse'
      });
    }

    let text = result.text || '';
    if (text.trim().length === 0) {
      return res.status(422).json({
        error: 'This PDF could not be fully parsed — no text extracted.',
        method: 'pdf-parse',
      });
    }
    // Strip "quick fillers at top"
    text = text.replace(/^\s*conflicting-context\s*\n\s*detection in PII redaction tools\.\s*\n?/gi, '');

    // Run regex PII detection on extracted text
    const entities = detectWithRegex(text);

    res.json({
      text,
      entities,
      method: result.method,
      filename: originalname,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadFile };
