const crypto = require('crypto');
const { detectWithRegex } = require('../services/piiDetector');
const { detectWithGemini, translateSafeText, simulatePrivacyRisk, explainSelection } = require('../services/geminiService');

// Caching and Quota tracking variables
const geminiCache = new Map();
let requestCount = 0;

/**
 * POST /api/analyze
 * Body: { text: string }
 * Returns: { entities: PII[] }
 */
async function analyzeText(req, res, next) {
  try {
    let { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a non-empty text field.' });
    }

    // Strip "quick fillers at top"
    text = text.replace(/^\s*conflicting-context\s*\n\s*detection in PII redaction tools\.\s*\n?/gi, '');

    if (text.length > 50000) {
      return res.status(400).json({ error: 'Text is too long. Maximum 50,000 characters.' });
    }

    // Step 1: Run fast regex detection
    const regexEntities = detectWithRegex(text);

    // 1. Quota Tracking
    requestCount++;
    if (requestCount === 15) {
      console.warn('⚠️ [WARNING] Gemini API requests approaching daily free-tier limit (15/20)');
    }

    // 2. Caching
    const textHash = crypto.createHash('md5').update(text).digest('hex');
    let geminiResponse;

    if (geminiCache.has(textHash)) {
      console.log('⚡ [CACHE HIT] Returning cached Gemini response for text hash:', textHash);
      geminiResponse = geminiCache.get(textHash);
    } else {
      console.log('🤖 [API CALL] Calling Gemini API for text hash:', textHash);
      geminiResponse = await detectWithGemini(text);
      if (!geminiResponse.ai_error) {
        geminiCache.set(textHash, geminiResponse);
      }
    }

    let { sensitive_entities, safe_entities, suggested_aliases, conflicting_context, ai_error } = geminiResponse;
    let fallbackMode = false;

    // 3. Fallback Mode Promotion (Bug 1)
    if (ai_error || !sensitive_entities || sensitive_entities.length === 0) {
      fallbackMode = true;
      console.warn('⚠️ [FALLBACK MODE] Gemini API failed or returned empty. Running regex fallback promotion...');
      
      sensitive_entities = [];
      safe_entities = [];
      suggested_aliases = [];
      conflicting_context = [];

      const likelyNameRegex = /(?:of|is|Mr\.|Dr\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
      let m;
      likelyNameRegex.lastIndex = 0;
      const seenNames = new Set();
      const distinctNames = [];

      while ((m = likelyNameRegex.exec(text)) !== null) {
        const candidate = m[1].trim();
        const lowerCand = candidate.toLowerCase();
        if (!seenNames.has(lowerCand)) {
          seenNames.add(lowerCand);
          distinctNames.push(candidate);
        }
      }

      // Re-run fallback names through findAllOccurrences and assign sequential pseudonyms
      distinctNames.forEach((name, idx) => {
        const pseudonym = `[PERSON-${idx + 1}]`;
        const indices = [];
        const lowerText = text.toLowerCase();
        const lowerName = name.toLowerCase();
        let pos = lowerText.indexOf(lowerName);
        while (pos !== -1) {
          indices.push(pos);
          pos = lowerText.indexOf(lowerName, pos + lowerName.length);
        }

        indices.forEach((startIndex) => {
          sensitive_entities.push({
            text: name,
            type: 'NAME',
            confidence: 60,
            reason: 'Detected via fallback heuristic (AI unavailable)',
            evidence: ['Regex context heuristic matcher'],
            privacy_risk: 'Identity Tracking',
            startIndex,
            endIndex: startIndex + name.length,
            replacement: pseudonym,
            status: 'pending',
          });
        });
      });
    } else {
      // Log console warnings for likely name candidates missed by Gemini during successful runs
      const likelyNameRegex = /(?:of|is|Mr\.|Dr\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g;
      let m;
      likelyNameRegex.lastIndex = 0;
      while ((m = likelyNameRegex.exec(text)) !== null) {
        const candidate = m[1].trim();
        const foundInGemini = sensitive_entities.some(e => e.text.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(e.text.toLowerCase()));
        if (!foundInGemini) {
          console.warn(`⚠️ [WARNING] Gemini AI might have missed likely name candidate: "${candidate}"`);
        }
      }
    }

    // Step 3: Merge & Reconcile — prioritize Gemini/Fallback entities over Regex
    const filteredRegex = regexEntities.filter(
      (r) => {
        // If same text caught by both, deduplicate (discard regex)
        const exactTextMatch = sensitive_entities.some(e => e.text.toLowerCase() === r.text.toLowerCase());
        if (exactTextMatch) return false;

        return !sensitive_entities.some((e) => {
          return (
            (r.startIndex >= e.startIndex && r.startIndex < e.endIndex) ||
            (r.endIndex > e.startIndex && r.endIndex <= e.endIndex) ||
            (r.startIndex <= e.startIndex && r.endIndex >= e.endIndex)
          );
        });
      }
    );

    // Process conflicting context to ensure they are safely redacted by default
    // Process conflicting context to ensure they are safely redacted by default
    const conflictingEntities = [];
    (conflicting_context || []).forEach((conflict, conflictIdx) => {
      if (conflict.name && text.toLowerCase().includes(conflict.name.toLowerCase())) {
        // Find occurrences of this conflicting name
        const lowerText = text.toLowerCase();
        const lowerName = conflict.name.toLowerCase();
        let pos = lowerText.indexOf(lowerName);
        let occIdx = 1;
        while (pos !== -1) {
          const originalText = text.substring(pos, pos + conflict.name.length);
          conflictingEntities.push({
            text: originalText,
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
          pos = lowerText.indexOf(lowerName, pos + conflict.name.length);
        }
      }
    });

    const allEntities = [...filteredRegex, ...sensitive_entities, ...conflictingEntities].sort(
      (a, b) => {
        if (a.startIndex === b.startIndex) {
          return b.endIndex - a.endIndex; // longer entity takes precedence
        }
        return a.startIndex - b.startIndex;
      }
    );

    return res.json({
      entities: allEntities,
      safeEntities: safe_entities || [],
      suggested_aliases: suggested_aliases || [],
      conflicting_context: conflicting_context || [],
      total: allEntities.length,
      fallbackMode,
      detectionMethods: {
        regex: filteredRegex.length,
        ai: sensitive_entities.length,
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
