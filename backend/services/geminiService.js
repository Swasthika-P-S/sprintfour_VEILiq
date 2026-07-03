const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Use Gemini to detect Names and Addresses that regex can't catch.
 * Returns an array of entity objects.
 */
function findAllOccurrences(haystack, needle) {
  const indices = [];
  if (!needle) return indices;
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let pos = lowerHaystack.indexOf(lowerNeedle);
  while (pos !== -1) {
    indices.push(pos);
    pos = lowerHaystack.indexOf(lowerNeedle, pos + lowerNeedle.length);
  }
  return indices;
}

async function detectWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not set. Skipping AI detection.');
    return { sensitive_entities: [], safe_entities: [] };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a PII (Personally Identifiable Information) detection expert.
Analyze the following text and perform two tasks:

TASK 1: Identifiy Sensitive Entities
Identify Names, Physical Addresses, Organizations, and Indirect Identifiers (like Roll Numbers, Job Titles).
CRITICAL (Alias Resolution & Pseudonymization): 
You MUST provide a unique pseudonym in the "replacement" field for EVERY entity you find. 
- You MUST standardize ALL redaction tags to the format [TYPE-N], e.g.: [PERSON-1], [PHONE-1], [EMAIL-1], [ADDRESS-1], [ORG-1], [DOB-1], [AADHAAR-1], [PAN-1], [UPI_ID-1]. 
- Do NOT use formats like "[REDACTED - phone 1]" or "[Person A]".
- The numbers N must be scoped per entity TYPE (the first phone number is [PHONE-1], the second is [PHONE-2], etc.).
- If you detect the same person or entity referred to by multiple names, nicknames, or shorthand, you MUST group them by assigning them the EXACT same pseudonym.
- CRITICAL ALIAS RULE: If you find a full name (e.g., Alexandra Davis) and ALSO a shorter nickname/first name (e.g., Alex, Alexandra) that might be the same person, put the shorter name ONLY in 'suggested_aliases'. DO NOT put the shorter name in 'sensitive_entities'. This allows the UI to explicitly ask the user to confirm the link.

CRITICAL DETECTION RULES:
1. NAMES & HONORIFICS: Detect EVERY person's name regardless of how many times it appears, whether it appears in a labeled field, after an honorific (Mr./Mrs./Dr./Ms./Prof.), or in free-flowing prose with no special formatting. A name mentioned only ONCE is exactly as important to detect as a name mentioned five times.
2. ADDRESSES: Treat a full multi-line or comma-separated address (e.g., "24 Lakeview Residency, MG Road, Bengaluru, Karnataka 560001") as ONE single ADDRESS entity. Do not split it. Also, flag standalone PIN codes (e.g. "560001") as INDIRECT if they appear without context.
2. LABELED FIELDS: Treat values following labels like "Full Name:", "Witness:", "Account Holder:", "Claimant:" as EXTREMELY HIGH confidence PII.
3. UPI IDs vs EMAILS: Distinguish UPI IDs (e.g., "name@fnb", "name@okhdfcbank") from true EMAIL addresses. Tag them as type "UPI_ID", not EMAIL.
4. CONSISTENCY RULE: If the same entity (name, organization, address, etc.) appears multiple times in the document, you MUST assign it the SAME replacement pseudonym every time. The "text" field MUST contain ONLY the exact entity text and NEVER any surrounding context or punctuation. Do a second pass across the full text to confirm every occurrence of each detected entity is included in sensitive_entities with matching replacement values.
5. CONFLICTING CONTEXT RULE: If the same entity appears multiple times in the document, check the immediately surrounding context for each occurrence. If you find factual attributes or performance metrics attached to that entity which conflict or are mutually exclusive across occurrences (e.g. different ages, different addresses, different GPAs or grade achievements like '8.1 GPA' vs '9 GPA', or different ID numbers), do NOT assume they are the exact same entity. Instead, return this as an entry in a new "conflicting_context" array. DO NOT put this entity in the "sensitive_entities" array at all. However, if this conflicting entity is ALSO a shorter nickname/first name of a full name found in the document (e.g., "Arun" and "Arun Kumar"), you MUST ALSO add it to the 'suggested_aliases' array linked to that full name.
6. NON-PII RULE: Do NOT redact or flag academic performance metrics like GPA, grades, or exam scores. These are NOT considered Personally Identifiable Information on their own. If you see a GPA or grade, DO NOT put it in 'sensitive_entities'.
7. HEADING / TITLE RULE: Do NOT redact or flag document section titles, headings, or structural labels (e.g., "Student Enrollment Record", "Semester Grade Report", "Faculty Advisor Note", "Student Academic Review", "Batch A", "Batch C") as PII. They are generic structural elements, not sensitive entities.

Return a JSON object ONLY (no explanation, no markdown). It must have this exact structure:
{
  "sensitive_entities": [
    {
      "text": "Exact text from input",
      "type": "NAME" | "ADDRESS" | "ORG" | "INDIRECT",
      "confidence": 99.8,
      "reason": "Brief explanation of why this is PII",
      "evidence": ["Matches pattern", "Nearby keyword X", "Government format verified"],
      "privacy_risk": "Identity theft / Financial fraud / Medical Exposure / etc",
      "replacement": "[PERSON-1]" 
    }
  ],
  "suggested_aliases": [
    {
      "text": "Alex",
      "base_entity": "Alexandra Davis",
      "proposed_replacement": "[PERSON-1]",
      "reason": "Shorthand for Alexandra Davis."
    }
  ],
  "conflicting_context": [
    {
      "name": "Arun",
      "type": "NAME",
      "occurrences": [
        { "text": "Arun lives in Mumbai", "context_snippet": "...Arun is based in Mumbai..." },
        { "text": "Arun resides in Delhi", "context_snippet": "...Arun's Delhi address..." }
      ],
      "conflict_reason": "Same entity associated with two mutually exclusive addresses",
      "confidence": 70
    }
  ],
  "safe_entities": [
    {
      "text": "Exact text from input",
      "confidence": 99.4,
      "reason": "Brief explanation of why this is explicitly SAFE to keep"
    }
  ]
}

If nothing is found, return empty arrays.

Text to analyze:
"""
${text}
"""`;

    let result;
    let retries = 3;
    let delay = 1000;
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (e) {
        if ((e.message.includes('503') || e.message.includes('429')) && retries > 1) {
          const wait = e.message.includes('429') ? 20000 : delay;
          console.warn(`Gemini ${e.message.includes('429') ? '429' : '503'} error. Retrying in ${wait}ms...`);
          await new Promise(resolve => setTimeout(resolve, wait));
          delay *= 2;
          retries--;
        } else {
          throw e;
        }
      }
    }
    
    const response = result.response.text().trim();

    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const sensitive = parsed.sensitive_entities || [];
    const safe = parsed.safe_entities || [];

    const uniqueSensitive = Array.from(
      new Map(
        sensitive
          .filter((e) => e.text && e.text.trim().length > 0 && e.type && text.toLowerCase().includes(e.text.trim().toLowerCase()))
          .map((e) => [e.text.trim(), e])
      ).values()
    );

    const sensitive_entities = uniqueSensitive
      .flatMap((e) => {
        const indices = findAllOccurrences(text, e.text.trim());
        return indices.map((startIndex) => {
          const entityText = text.substring(startIndex, startIndex + e.text.trim().length);
          const endIndex = startIndex + entityText.length;
          return {
            text: e.text,
            type: e.type,
            confidence: e.confidence || 80,
            reason: e.reason || `Detected by AI as ${e.type}`,
            evidence: e.evidence || ["AI Contextual Match"],
            privacy_risk: e.privacy_risk || "Data Exposure",
            startIndex,
            endIndex,
            replacement: e.replacement || `[${e.type}]`,
            status: 'pending',
          };
        });
      });

    const uniqueSafe = Array.from(
      new Map(
        safe
          .filter((e) => e.text && text.toLowerCase().includes(e.text.trim().toLowerCase()))
          .map((e) => [e.text, e])
      ).values()
    );

    const safe_entities = uniqueSafe
      .flatMap((e) => {
        const indices = findAllOccurrences(text, e.text);
        return indices.map((startIndex) => {
          const endIndex = startIndex + e.text.length;
          return {
            text: e.text,
            confidence: e.confidence || 95,
            reason: e.reason || "Evaluated as safe.",
            startIndex,
            endIndex,
          };
        });
      });

    const suggested_aliases = parsed.suggested_aliases || [];
    const conflicting_context = parsed.conflicting_context || [];

    return { sensitive_entities, safe_entities, suggested_aliases, conflicting_context };
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    return { sensitive_entities: [], safe_entities: [], suggested_aliases: [], conflicting_context: [], ai_error: err.message };
  }
}

/**
 * Translates text to the specified target language safely.
 */
async function translateSafeText(text, targetLanguage = 'English') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Cannot translate.');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an expert translator. 
Translate the following text into ${targetLanguage}. 
Keep the tone professional. 
DO NOT translate any placeholder tags like [NAME], [EMAIL], [PHONE], etc. Leave them exactly as they are.

Text to translate:
"""
${text}
"""`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Simulates privacy risk (re-identification) based on redacted text and context.
 */
async function simulatePrivacyRisk(redactedText, context = 'Personal (Default)') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Cannot run privacy simulation.');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a privacy auditor assessing k-anonymity and indirect re-identification risk.

Analyze the following redacted text. Your goal is to determine if the combination of remaining unredacted information could still allow someone to uniquely identify the person.

CRITICAL INSTRUCTIONS:
1. Pay close attention to indirect identifiers: even if a name is missing, details like roll number, college name, or location present a HIGH risk of the "mosaic effect".
2. Be realistic with your "confidence" score. Do not blindly output 100%.

Return a JSON object ONLY (no explanation, no markdown).
The JSON must have these exact fields:
- "riskLevel": string, strictly one of "Low", "Medium", or "High"
- "confidence": number, 0 to 100
- "suggestions": array of strings, 1-3 short bullet points explicitly showing how remaining unredacted data can indirectly reveal redacted data (e.g., "Age is redacted, but Date of Birth is unredacted. Hide DOB.", or "College is hidden, but Register Number is visible.").

Redacted Text:
"""
${redactedText}
"""`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();

  const cleaned = response
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini simulation JSON:', cleaned);
    throw new Error('Failed to parse simulation results.');
  }
}

/**
 * Adversarial re-identification check — tries to re-identify redacted entities from context.
 */
async function redTeamCheck(redactedText, entities) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { reidentification_risks: [] };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const replacements = [...new Set(entities.map(e => e.replacement).filter(Boolean))];

  const prompt = `You are a hostile privacy attacker performing a red-team re-identification analysis.

Your task: Given the redacted document below, try to re-identify what each redacted token (e.g., [PERSON-1], [ORG-1]) refers to, using ONLY the surrounding unredacted context clues.

For each unique redaction token found in the text, provide:
- The redaction token (e.g., "[PERSON-1]")
- A risk_score from 0 to 100 (how likely an attacker could identify the real entity)
- leaking_context: a short phrase explaining what surrounding text is doing the leaking
- suggestion: what additional text should also be redacted to reduce this risk

Return ONLY a JSON object:
{
  "reidentification_risks": [
    {
      "replacement": "[PERSON-1]",
      "risk_score": 75,
      "leaking_context": "'the CEO of a Boston fintech founded in 2019' narrows identity to a small set",
      "suggestion": "Also redact 'Boston', 'fintech', and 'founded in 2019'"
    }
  ]
}

Redacted document:
"""
${redactedText}
"""`;

  let result;
  let retries = 4;
  let delay = 1500;
  while (retries > 0) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (e) {
      const isRetryable = e.message.includes('503') || e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED');
      if (isRetryable && retries > 1) {
        console.warn(`Gemini Red Team: retryable error (${e.message.slice(0,30)}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      } else {
        console.error('Gemini API Error during Red Team check:', e.message);
        return { reidentification_risks: [] };
      }
    }
  }

  let response = '';
  try {
    response = result.response.text().trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(response);
  } catch (err) {
    console.error('Failed to parse Red Team Gemini response:', err.message);
    console.log('Raw response was:', response);
    return { reidentification_risks: [] };
  }
}

/**
 * Grounded interrogation chat — answers questions about this specific document's redaction decisions.
 */
async function interrogationChat(question, metadata) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { answer: 'AI service is unavailable. Please check the API key.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const metaSummary = JSON.stringify({
    entities_hidden: (metadata.entities || []).filter((_, i) => (metadata.redactedIndices || []).includes(i)).map(e => ({ text: e.text, type: e.type, confidence: e.confidence, reason: e.reason, replacement: e.replacement })),
    entities_kept_visible: (metadata.safeEntities || []).map(e => ({ text: e.text, reason: e.reason, confidence: e.confidence })),
    alias_resolutions: metadata.aliasSuggestions || [],
  }, null, 2);

  const prompt = `You are VEILiq, a document privacy assistant. You have access to the following redaction metadata for a specific document that was just analyzed:

--- REDACTION METADATA ---
${metaSummary}
--- END METADATA ---

Your ONLY job is to answer questions about THIS document's redaction decisions, using the metadata above as your sole source of truth. 
Do NOT answer general questions unrelated to this document's redaction data.
If a question is unrelated, respond exactly: "I can only answer questions about this document's specific redaction decisions."

Be concise, clear, and direct. Reference specific entity names and reasons from the metadata in your answer.

User question: "${question}"`;

  let result;
  let retries = 3;
  let delay = 1000;
  while (retries > 0) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (e) {
      if (e.message.includes('503') && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
      } else {
        throw e;
      }
    }
  }

  return { answer: result.response.text().trim() };
}

/**
 * Explains why a user-selected text is or is not PII.
 * Used when users highlight text manually and click "Explain".
 */
async function explainSelection(selectedText, context) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { isPII: false, confidence: 0, reason: 'AI engine unavailable.', missReason: 'No API key configured.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const prompt = `You are a PII detection expert. A user has highlighted the following text in a document and is asking whether it is Personally Identifiable Information (PII).

Highlighted text: "${selectedText}"
Context (surrounding text): "${context}"

Analyze if the highlighted text is PII. Consider names, phone numbers, emails, ID numbers, addresses, and any information that could identify a person.

Return ONLY a JSON object:
{
  "isPII": true or false,
  "confidence": 0-100,
  "reason": "Short explanation of why this is or is not PII",
  "missReason": "If it IS PII, explain why an automated system might have missed it. If it is NOT PII, leave this as null."
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(raw);
  } catch (e) {
    console.error('explainSelection Gemini error:', e.message);
    return { isPII: false, confidence: 0, reason: 'AI engine temporarily unavailable.', missReason: null };
  }
}

module.exports = { detectWithGemini, translateSafeText, simulatePrivacyRisk, redTeamCheck, interrogationChat, explainSelection };
