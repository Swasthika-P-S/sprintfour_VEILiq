/**
 * Regex-based PII detector for Indian documents.
 * Returns an array of entity objects with position info.
 */

const PII_PATTERNS = [
  {
    type: 'EMAIL',
    pattern: /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
    confidence: 98,
    reason: 'Matched standard email address format',
    replacement: '[EMAIL]',
  },
  {
    type: 'PAN',
    pattern: /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g,
    confidence: 99,
    reason: 'Matched Indian PAN card format',
    replacement: '[PAN]',
  },
  {
    type: 'AADHAAR',
    pattern: /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/g,
    confidence: 90,
    reason: 'Matched Aadhaar number format',
    replacement: '[AADHAAR]',
  },
  {
    type: 'IFSC',
    pattern: /\b([A-Z]{4}0[A-Z0-9]{6})\b/g,
    confidence: 97,
    reason: 'Matched Indian bank IFSC code',
    replacement: '[IFSC]',
  },
  {
    type: 'PINCODE',
    pattern: /\b([1-9][0-9]{5})\b/g,
    confidence: 75,
    reason: 'Matched Indian 6-digit PIN code',
    replacement: '[PINCODE]',
  },
  {
    type: 'DATE_OF_BIRTH',
    pattern: /\b((?:0?[1-9]|[12][0-9]|3[01])[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:19|20)\d{2}|(?:19|20)\d{2}[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12][0-9]|3[01])|(?:0?[1-9]|[12][0-9]|3[01])\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:19|20)\d{2})\b/gi,
    confidence: 95,
    reason: 'Matched date of birth pattern',
    replacement: '[DOB]',
  },
  {
    type: 'PASSPORT',
    pattern: /\b([A-Z]\d{7})\b/g,
    confidence: 99,
    reason: 'Matched Passport number format',
    replacement: '[PASSPORT]',
  },
  {
    type: 'DRIVING_LICENCE',
    pattern: /\b([A-Z]{2}\d{2}[\s\-]?\d{11})\b/g,
    confidence: 99,
    reason: 'Matched Driving Licence format',
    replacement: '[DL]',
  },
  {
    type: 'UPI_ID',
    pattern: /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}(?!\.[a-zA-Z]{2,})\b/g,
    confidence: 95,
    reason: 'Matched standard Indian UPI ID format',
    replacement: '[UPI_ID]',
  },
  {
    type: 'BANK_ACCOUNT',
    pattern: /\b\d{9,18}\b/g,
    confidence: 90,
    reason: 'Matched generic Bank Account number format',
    replacement: '[BANK_ACCOUNT]',
  },
  {
    type: 'PATIENT_ID',
    pattern: /\bP-\d{4}-\d+\b/g,
    confidence: 99,
    reason: 'Matched internal Patient ID format',
    replacement: '[PATIENT_ID]',
  },
  {
    type: 'INSURANCE',
    pattern: /\bHL\d+\b/g,
    confidence: 95,
    reason: 'Matched Insurance Policy format',
    replacement: '[INSURANCE_ID]',
  },
  {
    type: 'PHONE',
    // Strictly matches 10-digit Indian mobile numbers (e.g. +91 98765 43210, +91 9876543210)
    pattern: /(?:\+?91[\-\s]?)?(?:0)?(?:[6-9]\d{9}|[6-9]\d{4}[\-\s]\d{5})\b/g,
    confidence: 99,
    reason: 'Matched phone number format',
    replacement: '[PHONE]',
  },
  {
    type: 'NAME',
    // Contextual regex: matches exactly 1 or 2 capitalized words after specific keywords
    pattern: /(?:Name|Holder|Witness|Mr\.|Mrs\.|Ms\.|Dr\.)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    confidence: 95,
    reason: 'Matched contextual Name prefix',
    replacement: '[PERSON-REGEX]',
  },
];


function detectWithRegex(text) {
  const entities = [];

  for (const { type, pattern, confidence, reason, replacement } of PII_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[1] || match[0];
      const startIndex = match[1] ? match.index + match[0].lastIndexOf(match[1]) : match.index;
      const endIndex = startIndex + matchedText.length;

      // Skip if overlaps with any existing entity
      const isOverlapping = entities.some(
        (e) =>
          (startIndex >= e.startIndex && startIndex < e.endIndex) ||
          (endIndex > e.startIndex && endIndex <= e.endIndex) ||
          (startIndex <= e.startIndex && endIndex >= e.endIndex)
      );
      if (isOverlapping) continue;

      entities.push({
        text: matchedText,
        type,
        confidence,
        reason,
        startIndex,
        endIndex,
        replacement,
        status: 'pending',
      });
    }
    // Reset after use
    pattern.lastIndex = 0;
  }

  // Sort by position in text
  entities.sort((a, b) => a.startIndex - b.startIndex);
  return entities;
}

module.exports = { detectWithRegex };
