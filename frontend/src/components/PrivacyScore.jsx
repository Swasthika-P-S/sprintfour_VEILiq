import React, { useEffect, useRef } from 'react';

const RISK_WEIGHTS = {
  AADHAAR: 25,
  PAN: 20,
  PHONE: 12,
  EMAIL: 10,
  ADDRESS: 15,
  NAME: 8,
  DOB: 12,
  PASSPORT: 25,
  IFSC: 10,
  PINCODE: 5,
};

const CONTEXT_MULTIPLIERS = {
  personal: 1.0,
  public_ai: 1.5, // Much stricter for public AI
  hr: 0.8, // More lenient for resumes/applications
  healthcare: 1.2,
  banking: 1.2,
  legal: 1.0,
  education: 0.9,
};

export function computePrivacyScore(entities, totalFound = 0, context = 'healthcare') {
  if (!entities || entities.length === 0) {
    return totalFound > 0 ? 99 : 100;
  }
  const found = new Set(entities.map((e) => e.type));
  let risk = 0;
  found.forEach((type) => {
    risk += RISK_WEIGHTS[type] || 8;
  });
  
  // Apply context multiplier
  const multiplier = CONTEXT_MULTIPLIERS[context] || 1.0;
  risk = risk * multiplier;

  // Additional risk for quantity
  const extra = Math.min(entities.length * 2, 20);
  const rawScore = Math.max(Math.round(100 - risk), 0);
  return totalFound > 0 ? Math.min(rawScore, 99) : rawScore;
}

export function getRiskLevel(score) {
  if (score >= 70) return 'low';
  if (score >= 40) return 'medium';
  return 'high';
}

export function getRiskLabel(score) {
  if (score >= 70) return 'Low Risk';
  if (score >= 40) return 'Medium Risk';
  return 'High Risk';
}

const CIRCUMFERENCE = 2 * Math.PI * 50; // r=50

export default function PrivacyScore({ entities = [], totalFound = 0, redactedCount = 0, context = 'healthcare' }) {
  const score = computePrivacyScore(entities, totalFound, context);
  const level = getRiskLevel(score);
  const label = getRiskLabel(score);
  const ringRef = useRef();

  const strokeColor =
    level === 'low' ? 'var(--green-primary)' :
    level === 'medium' ? 'var(--amber)' : 'var(--red)';

  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = dashOffset;
      ringRef.current.style.stroke = strokeColor;
    }
  }, [score, dashOffset, strokeColor]);

  // Top risk reasons
  const reasons = entities
    .reduce((acc, e) => {
      if (!acc.find((a) => a.type === e.type)) acc.push(e);
      return acc;
    }, [])
    .slice(0, 4);

  return (
    <div className="privacy-score-panel">
      <div className="score-ring-container">
        <div className="score-ring-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle className="score-ring-track" cx="60" cy="60" r="50" />
            <circle
              ref={ringRef}
              className="score-ring-fill"
              cx="60" cy="60" r="50"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1), stroke 0.5s' }}
            />
          </svg>
          <div className="score-ring-label">
            <span className="score-number" style={{ color: strokeColor }}>{score}</span>
            <span className="score-max">/100</span>
          </div>
        </div>

        <div className="score-details">
          <div className={`score-level ${level}`}>
            <span>{level === 'low' ? '✓' : level === 'medium' ? '⚠' : '✕'}</span>
            {label}
          </div>

          {reasons.length > 0 && (
            <div className="score-reasons">
              {reasons.map((e) => (
                <div key={e.type} className="score-reason-item">
                  <div
                    className="score-reason-dot"
                    style={{ background: strokeColor }}
                  />
                  <span>
                    {e.type.charAt(0) + e.type.slice(1).toLowerCase()} detected
                  </span>
                </div>
              ))}
            </div>
          )}

          {redactedCount > 0 && (
            <div style={{
              marginTop: 12, fontSize: '0.78rem', color: 'var(--green-primary)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>✓</span> {redactedCount} item{redactedCount !== 1 ? 's' : ''} redacted
            </div>
          )}
        </div>
      </div>

      {entities.length === 0 && (
        <div style={{
          padding: '12px 16px', background: 'var(--green-light)',
          borderRadius: 'var(--radius-md)', fontSize: '0.875rem',
          color: 'var(--green-primary)', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>✓</span> No sensitive information detected.
        </div>
      )}
    </div>
  );
}
