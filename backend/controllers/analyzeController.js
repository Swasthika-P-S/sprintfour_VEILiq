const { detectWithRegex } = require('../services/piiDetector');
const { detectWithGemini, translateSafeText, simulatePrivacyRisk, explainSelection } = require('../services/geminiService');

/**
 * POST /api/analyze
 * Body: { text: string }
 * Returns: { entities: PII[] }
 */
async function analyzeText(req, res, next) {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a non-empty text field.' });
    }

    if (text.length > 50000) {
      return res.status(400).json({ error: 'Text is too long. Maximum 50,000 characters.' });
    }

    // Step 1: Run fast regex detection
    const regexEntities = detectWithRegex(text);

    // Step 2: Run Gemini for names/addresses (in parallel, non-blocking)
    const { sensitive_entities, safe_entities, suggested_aliases, conflicting_context, ai_error } = await detectWithGemini(text);

    // Step 3: Merge — avoid duplicates (same startIndex)
    const filteredGemini = sensitive_entities.filter(
      (e) => {
        return !regexEntities.some((r) => {
          return (
            (e.startIndex >= r.startIndex && e.startIndex < r.endIndex) ||
            (e.endIndex > r.startIndex && e.endIndex <= r.endIndex) ||
            (e.startIndex <= r.startIndex && e.endIndex >= r.endIndex)
          );
        });
      }
    );

    // Process conflicting context to ensure they are safely redacted by default
    const conflictingEntities = [];
    (conflicting_context || []).forEach((conflict, conflictIdx) => {
      if (conflict.name && text.includes(conflict.name)) {
        // Find occurrences of this conflicting name
        let pos = text.indexOf(conflict.name);
        let occIdx = 1;
        while (pos !== -1) {
          conflictingEntities.push({
            text: conflict.name,
            type: 'NAME',
            confidence: conflict.confidence || 80,
            reason: conflict.conflict_reason || 'Conflicting context detected.',
            evidence: ['AI Contextual Analysis'],
            privacy_risk: 'Identity Exposure',
            startIndex: pos,
            endIndex: pos + conflict.name.length,
            replacement: `[PERSON-CONFLICT-${conflictIdx}-${occIdx}]`,
            status: 'pending',
          });
          occIdx++;
          pos = text.indexOf(conflict.name, pos + conflict.name.length);
        }
      }
    });

    const allEntities = [...regexEntities, ...filteredGemini, ...conflictingEntities].sort(
      (a, b) => a.startIndex - b.startIndex
    );

    return res.json({
      entities: allEntities,
      safeEntities: safe_entities || [],
      suggested_aliases: suggested_aliases || [],
      conflicting_context: conflicting_context || [],
      total: allEntities.length,
      detectionMethods: {
        regex: regexEntities.length,
        ai: filteredGemini.length,
      },
      ai_error: ai_error || null
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analyze/translate
 * Body: { text: string, targetLanguage: string }
 * Returns: { translatedText: string }
 */
async function translateText(req, res, next) {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Please provide text to translate.' });
    }
    
    const translatedText = await translateSafeText(text, targetLanguage || 'English');
    return res.json({ translatedText });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analyze/simulate
 * Body: { text: string, context: string }
 * Returns: { simulation: { riskLevel, confidence, reason, suggestions } }
 */
async function simulatePrivacy(req, res, next) {
  try {
    const { text, context } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Please provide redacted text to simulate.' });
    }
    
    const simulation = await simulatePrivacyRisk(text, context);
    return res.json({ simulation });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/analyze/explain-selection
 * Body: { selectedText: string, context: string }
 * Returns: { isPII: boolean, confidence: number, missReason: string }
 */
async function explainSelectionController(req, res, next) {
  try {
    const { selectedText, context } = req.body;
    if (!selectedText || typeof selectedText !== 'string') {
      return res.status(400).json({ error: 'Please provide selectedText to analyze.' });
    }
    
    const explanation = await explainSelection(selectedText, context || '');
    return res.json(explanation);
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeText, translateText, simulatePrivacy, explainSelectionController };
