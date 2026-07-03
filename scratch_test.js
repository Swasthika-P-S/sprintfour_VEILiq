require('dotenv').config({ path: './.env' });
const { detectWithGemini } = require('./backend/services/geminiService');

const text = 'Full Name: Arun Kumar. Arun lives in Mumbai. Arun is a student. Batch A Arun got 8.1 GPA in the Data Structures. Batch C Arun got 9 GPA in the Digital Systems.';

async function run() {
  console.log('Running Gemini...');
  const geminiResult = await detectWithGemini(text);
  console.log('Raw Gemini Result:', JSON.stringify(geminiResult, null, 2));

  // Run the analyzeController logic
  const conflictingEntities = [];
  (geminiResult.conflicting_context || []).forEach((conflict, conflictIdx) => {
    if (!conflict.name) return;
    const lowerText = text.toLowerCase();
    const lowerName = conflict.name.toLowerCase();
    
    const allMatches = [];
    const regex = new RegExp('\\b' + lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    let m;
    while ((m = regex.exec(lowerText)) !== null) {
      allMatches.push(m.index);
    }

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
        const targetWords = targetSnippet.split(/\W+/).filter(w => w.length > 2);
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
          startIndex: pos,
          endIndex: pos + conflict.name.length,
          replacement: '[PERSON-CONFLICT-' + conflictIdx + '-' + occIdx + ']',
          context_snippet: occ.context_snippet || occ.text
        });
        occIdx++;
      }
    });
  });

  console.log('Conflicting Entities mapped:', JSON.stringify(conflictingEntities, null, 2));
}
run();
