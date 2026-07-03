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
      const NON_NAMES = [
        'computer science', 'electronics', 'data structures', 'digital systems',
        'bachelor', 'batch', 'course', 'program', 'semester', 'grade',
        'department', 'university', 'college', 'institute', 'school',
        'technology', 'engineering', 'systems', 'sciences', 'arts'
      ];

      while ((m = likelyNameRegex.exec(text)) !== null) {
        const candidate = m[1].trim();
        const lowerCand = candidate.toLowerCase();
        
        // Skip common false positives
        if (NON_NAMES.some(term => lowerCand.includes(term))) {
          continue;
        }

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
      // Post-processing safeguard: promote honorifics
      const likelyNameRegex = /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
      let m;
      likelyNameRegex.lastIndex = 0;
      const candidatesToAdd = new Set();
      while ((m = likelyNameRegex.exec(text)) !== null) {
        const candidate = m[2].trim();
        const foundInGemini = sensitive_entities.some(e => e.text.toLowerCase().includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(e.text.toLowerCase()));
        if (!foundInGemini) {
          candidatesToAdd.add(candidate);
        }
      }
      
      let maxPersonIdx = 0;
      sensitive_entities.forEach(e => {
        const match = (e.replacement || '').match(/\[(NAME|PERSON)-(\d+)\]/i);
        if (match) maxPersonIdx = Math.max(maxPersonIdx, parseInt(match[2], 10));
      });

      Array.from(candidatesToAdd).forEach(candidate => {
        maxPersonIdx++;
        const pseudonym = `[PERSON-${maxPersonIdx}]`;
        const lowerText = text.toLowerCase();
        const lowerCand = candidate.toLowerCase();
        let pos = lowerText.indexOf(lowerCand);
        while (pos !== -1) {
          sensitive_entities.push({
            text: candidate,
            type: 'NAME',
            confidence: 70,
            reason: 'Detected via honorific pattern backup check',
            evidence: ['Regex Context Heuristic Matcher'],
            privacy_risk: 'Identity Tracking',
            startIndex: pos,
            endIndex: pos + candidate.length,
            replacement: pseudonym,
            status: 'pending',
          });
          pos = lowerText.indexOf(lowerCand, pos + lowerCand.length);
        }
      });
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

    // Sequence the regex entities to avoid colliding with Gemini's tags and to ensure proper [TYPE-N] format
    const maxCounters = {};
    sensitive_entities.forEach(e => {
       const m = (e.replacement || '').match(/\[([A-Z_]+)-(\d+)\]/i);
       if (m) {
          const typeStr = m[1].toUpperCase();
          const val = parseInt(m[2], 10);
          maxCounters[typeStr] = Math.max(maxCounters[typeStr] || 0, val);
       }
    });

    filteredRegex.forEach(r => {
       const baseType = (r.replacement || '').replace(/\[|\]/g, '').toUpperCase();
       if (!maxCounters[baseType]) maxCounters[baseType] = 0;
       maxCounters[baseType]++;
       r.replacement = `[${baseType}-${maxCounters[baseType]}]`;
    });

    const conflictingEntities = [];
    (conflicting_context || []).forEach((conflict, conflictIdx) => {
      if (!conflict.name) return;
      const lowerText = text.toLowerCase();
      const lowerName = conflict.name.toLowerCase();
      
      // Find all absolute occurrences of the name as a word
      const allMatches = [];
      const regex = new RegExp(`\\b${lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let m;
      while ((m = regex.exec(lowerText)) !== null) {
        allMatches.push(m.index);
      }

      // Map Gemini occurrences to absolute occurrences
      const matchedIndices = new Set();
      let occIdx = 1;

      (conflict.occurrences || []).forEach(occ => {
        const targetSnippet = ((occ.context_snippet || '') + ' ' + (occ.text || '')).toLowerCase();
        let bestMatch = -1;
        let bestScore = -1;

        allMatches.forEach(matchPos => {
          if (matchedIndices.has(matchPos)) return;
          const start = Math.max(0, matchPos - 60);
          const end = Math.min(text.length, matchPos + lowerName.length + 60);
          const actualContext = lowerText.substring(start, end);

          const targetWords = targetSnippet.split(/\\W+/).filter(w => w.length > 2);
          let score = 0;
          targetWords.forEach(tw => {
            if (actualContext.includes(tw)) score++;
          });

          if (score > bestScore && score > 0) {
            bestScore = score;
            bestMatch = matchPos;
          }
        });

        if (bestMatch !== -1) {
          matchedIndices.add(bestMatch);
          const pos = bestMatch;
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
            context_snippet: occ.context_snippet || occ.text
          });
          occIdx++;
        }
      });
    });

    const conflictingNames = new Set(
      (conflicting_context || []).map(c => c.name.toLowerCase())
    );

    const allEntities = [...filteredRegex, ...sensitive_entities, ...conflictingEntities].sort(
      (a, b) => {
        if (a.startIndex === b.startIndex) {
          return b.endIndex - a.endIndex; // longer entity takes precedence
        }
        return a.startIndex - b.startIndex;
      }
    ).map(e => {
      // If an entity already has a clean [TYPE-N] pseudonym AND is not in conflicting context,
      // it is unambiguously identified — promote its confidence so it auto-redacts
      // without appearing in Human Review.
      const hasCleanReplacement = /^\[[A-Z_]+-\d+\]$/.test((e.replacement || '').trim());
      const isConflicting = conflictingNames.has((e.text || '').toLowerCase());
      if (hasCleanReplacement && !isConflicting && e.confidence < 90) {
        return { ...e, confidence: 92 };
      }
      return e;
    });

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
