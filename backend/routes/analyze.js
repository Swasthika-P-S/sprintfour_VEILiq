const express = require('express');
const { analyzeText, translateText, simulatePrivacy, explainSelectionController } = require('../controllers/analyzeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/analyze
router.post('/', protect, analyzeText);

// POST /api/analyze/translate
router.post('/translate', protect, translateText);

// POST /api/analyze/simulate
router.post('/simulate', protect, simulatePrivacy);

// POST /api/analyze/explain-selection
router.post('/explain-selection', protect, explainSelectionController);

module.exports = router;
