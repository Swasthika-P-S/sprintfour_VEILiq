const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { protect } = require('../middleware/authMiddleware');
const { verifyIntegrity } = require('../services/integrityService');
const { redTeamCheck } = require('../services/geminiService');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/verify — run integrity check
router.post('/', protect, async (req, res, next) => {
  try {
    const { originalText, redactedText, entities, redactedIndices } = req.body;
    if (!redactedText) return res.status(400).json({ error: 'redactedText is required.' });
    
    // Tag entities with their redaction status for the check
    const taggedEntities = (entities || []).map((e, i) => ({
      ...e,
      _shouldBeRedacted: (redactedIndices || []).includes(i)
    }));
    
    const report = verifyIntegrity(originalText || '', redactedText, taggedEntities);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// POST /api/verify/redteam — adversarial re-identification check
router.post('/redteam', protect, async (req, res, next) => {
  try {
    const { redactedText, entities } = req.body;
    if (!redactedText) return res.status(400).json({ error: 'redactedText is required.' });
    const result = await redTeamCheck(redactedText, entities || []);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/verify/pdf — run integrity check on uploaded PDF
router.post('/pdf', protect, upload.single('file'), async (req, res, next) => {
  try {
    const { originalText, entities, redactedIndices } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'PDF file is required.' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ error: 'File must be a PDF.' });

    // Parse the PDF buffer to extract raw text
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    // Tag entities with their redaction status for the check
    const parsedEntities = entities ? JSON.parse(entities) : [];
    const parsedIndices = redactedIndices ? JSON.parse(redactedIndices) : [];
    
    const taggedEntities = parsedEntities.map((e, i) => ({
      ...e,
      _shouldBeRedacted: parsedIndices.includes(i)
    }));
    
    // Run the integrity check against the exact text extracted from the PDF
    const report = verifyIntegrity(originalText || '', extractedText, taggedEntities);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
