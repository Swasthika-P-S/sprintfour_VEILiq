const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;

/**
 * Use Gemini to detect Names and Addresses that regex can't catch.
 * Returns an array of entity objects.
 */
async function detectWithGemini(text) {
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
- For names, you MUST strictly use the format "[PERSON-1]", "[PERSON-2]", etc. DO NOT use "[Person A]" or any other format.
- For specific organizations or places, use a descriptive format like "[REDACTED - hospital 1]".
- If you detect the same person or entity referred to by multiple names, nicknames, or shorthand, you MUST group them by assigning them the EXACT same pseudonym.
- CRITICAL ALIAS RULE: If you find a full name (e.g., Alexandra Davis) and ALSO a shorter nickname/first name (e.g., Alex, Alexandra) that might be the same person, put the shorter name ONLY in `suggested_aliases`. DO NOT put the shorter name in `sensitive_entities`. This allows the UI to explicitly ask the user to confirm the link.

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

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    const cleaned = response
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    const sensitive = parsed.sensitive_entities || [];
    const safe = parsed.safe_entities || [];

    const sensitive_entities = sensitive
      .filter((e) => e.text && e.type && text.includes(e.text))
      .map((e) => {
        const startIndex = text.indexOf(e.text);
        const endIndex = startIndex + e.text.length;
        return {
          text: e.text,
          type: e.type,
          confidence: e.confidence || 80,
          reason: e.reason || \`Detected by AI as \${e.type}\`,
          evidence: e.evidence || ["AI Contextual Match"],
          privacy_risk: e.privacy_risk || "Data Exposure",
          startIndex,
          endIndex,
          replacement: e.replacement || \`[\${e.type}]\`,
          status: 'pending',
        };
      });

    const safe_entities = safe
      .filter((e) => e.text && text.includes(e.text))
      .map((e) => {
        const startIndex = text.indexOf(e.text);
        const endIndex = startIndex + e.text.length;
        return {
          text: e.text,
          confidence: e.confidence || 95,
          reason: e.reason || "Evaluated as safe.",
          startIndex,
          endIndex,
        };
      });

    return { sensitive_entities, safe_entities };
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    return { sensitive_entities: [], safe_entities: [] };
  }
}

/**
 * Translates text to the specified target language safely.
 */
async function translateSafeText(text, targetLanguage = 'English') {
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

module.exports = { detectWithGemini, translateSafeText, simulatePrivacyRisk };
