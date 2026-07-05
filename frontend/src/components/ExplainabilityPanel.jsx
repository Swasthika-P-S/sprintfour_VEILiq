import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Info, HelpCircle, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';

// ── Compliance Mapping Data ──────────────────────────────────────────────────
const COMPLIANCE_MAP = {
  NAME: [
    { regulation: 'GDPR', article: 'Art. 4(1)', description: 'Personal data — any information relating to an identified or identifiable natural person.' },
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)', description: 'Safe Harbor identifier: Names of individuals.' },
    { regulation: 'CCPA', article: 'Cal. Civ. Code §1798.140(o)', description: 'Personal information — real name, alias, or other identifier.' },
  ],
  ADDRESS: [
    { regulation: 'GDPR', article: 'Art. 4(1)', description: 'Personal data — geographic data that can identify a person.' },
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)(2)(i)', description: 'Safe Harbor: All geographic subdivisions smaller than a State.' },
    { regulation: 'CCPA', article: 'Cal. Civ. Code §1798.140(o)', description: 'Personal information — postal address.' },
  ],
  ORG: [
    { regulation: 'GDPR', article: 'Art. 4(1)', description: 'Personal data — information about legal persons may indirectly identify natural persons.' },
    { regulation: 'CCPA', article: 'Cal. Civ. Code §1798.140(o)', description: 'Business affiliation may constitute personal information.' },
  ],
  INDIRECT: [
    { regulation: 'GDPR', article: 'Art. 4(1) + Recital 26', description: 'Indirect identifiers — information that, when combined, can identify a person (mosaic effect).' },
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)(2)', description: 'Safe Harbor identifiers include account numbers, device identifiers, URLs, and other unique identifiers.' },
  ],
  EMAIL: [
    { regulation: 'GDPR', article: 'Art. 4(1)', description: 'Personal data — electronic contact data directly linked to a natural person.' },
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)(2)(vii)', description: 'Safe Harbor identifier: Electronic mail addresses.' },
    { regulation: 'CCPA', article: 'Cal. Civ. Code §1798.140(o)', description: 'Personal information — email address.' },
  ],
  PHONE: [
    { regulation: 'GDPR', article: 'Art. 4(1)', description: 'Personal data — telephone numbers directly linked to a natural person.' },
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)(2)(iv)', description: 'Safe Harbor identifier: Telephone numbers.' },
  ],
  SSN: [
    { regulation: 'HIPAA', article: '45 CFR §164.514(b)(2)(xi)', description: 'Safe Harbor identifier: Social Security numbers.' },
    { regulation: 'CCPA', article: 'Cal. Civ. Code §1798.140(o)', description: 'Sensitive personal information — government identification numbers.' },
  ],
};

// ── Plain-language translations ───────────────────────────────────────────────
function simplify(entity, isSafe) {
  const typeLabel = {
    NAME: "a person's name",
    ADDRESS: "a home or work address",
    ORG: "the name of a company or organisation",
    INDIRECT: "an indirect clue that could identify someone",
    EMAIL: "an email address",
    PHONE: "a phone number",
    SSN: "a government ID or social security number",
  }[entity.type] || "a piece of sensitive information";

  if (isSafe) {
    return {
      reason: `The AI looked at this and decided it's safe to leave in — it doesn't look like ${typeLabel} that could personally identify anyone.`,
      confidence: `The AI is ${entity.confidence}% sure this is safe.`,
    };
  }
  return {
    reason: `The AI thinks this looks like ${typeLabel}. If it ended up in the wrong hands, it could be used to identify or harm someone.`,
    risk: `If this leaked, someone could use it for: ${entity.privacy_risk || 'identity tracking'}.`,
    evidence: (entity.evidence || []).map(ev => ev.replace(/\b([A-Z]{2,})\b/g, m => m.toLowerCase())),
    confidence: `The AI is ${entity.confidence}% confident this needs to be hidden.`,
  };
}

export default function ExplainabilityPanel({ selectedEntity }) {
  const [expanded, setExpanded] = useState(false);
  const [plainLanguage, setPlainLanguage] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);

  if (!selectedEntity) {
    return (
      <div className="empty-panel-state glass-card">
        <div className="glow-orb" />
        <Info size={40} color="var(--primary)" style={{ opacity: 0.8, marginBottom: 16 }} />
        <h4 style={{ color: 'var(--text-dark)', fontWeight: 700, marginBottom: 8 }}>AI Inspection Panel</h4>
        <p style={{ color: 'var(--text-muted)' }}>Select any highlighted word in the document to inspect the AI's deep reasoning process.</p>
      </div>
    );
  }

  const isSafe = selectedEntity.isSafe || false;
  const isRedacted = selectedEntity.isRedacted || false;
  const confColor = getConfidenceColor(selectedEntity.confidence);
  const simple = simplify(selectedEntity, isSafe);
  const complianceRules = COMPLIANCE_MAP[selectedEntity.type] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      key={selectedEntity.idx ?? selectedEntity.text}
      className="explainability-card glass-card"
    >
      {/* Plain-language toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => setPlainLanguage(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: plainLanguage ? 'rgba(16,185,129,0.12)' : 'var(--bg-glass-strong)',
            border: `1px solid ${plainLanguage ? 'var(--primary)' : 'var(--border-glass)'}`,
            borderRadius: 20, padding: '4px 12px', color: plainLanguage ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          {plainLanguage ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          {plainLanguage ? 'Plain Language ON' : 'Plain Language'}
        </button>
      </div>

      <div className="card-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="icon-glass-wrapper" style={{
            background: isSafe ? 'rgba(52,211,153,0.1)' : 'var(--conf-red-bg)',
            color: isSafe ? 'var(--conf-green)' : 'var(--conf-red)',
            boxShadow: isSafe ? 'var(--shadow-glow)' : 'var(--shadow-glow-red)'
          }}>
            {isSafe ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>
          <div>
            <div className="entity-text gradient-text" style={{ fontSize: '1.4rem' }}>{selectedEntity.text}</div>
            <div className="decision-badge" style={{
              background: isSafe ? 'rgba(52,211,153,0.1)' : (isRedacted ? 'var(--conf-red-bg)' : 'rgba(245,158,11,0.1)'),
              color: isSafe ? 'var(--conf-green)' : (isRedacted ? 'var(--conf-red)' : 'var(--conf-orange)'),
              borderColor: isSafe ? 'var(--conf-green)' : (isRedacted ? 'var(--conf-red)' : 'var(--conf-orange)'),
              border: '1px solid'
            }}>
              Decision: {isSafe ? 'KEPT VISIBLE' : (isRedacted ? 'HIDDEN' : 'VISIBLE (Needs Review)')}
            </div>
          </div>
        </div>
      </div>

      <div className="metric-row" style={{ gap: 16, marginBottom: 28 }}>
        <div className="metric-box glass-box" style={{ flex: 1 }}>
          <span className="metric-label">{plainLanguage ? 'How sure is the AI?' : 'Confidence'}</span>
          <span className="metric-value neon-text" style={{ color: confColor }}>{selectedEntity.confidence}%</span>
          {plainLanguage && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>{simple.confidence}</span>}
        </div>
        {!isSafe && selectedEntity.type && (
          <div className="metric-box glass-box" style={{ flex: 1 }}>
            <span className="metric-label">{plainLanguage ? 'What type?' : 'Entity Type'}</span>
            <span className="metric-value">{selectedEntity.type}</span>
          </div>
        )}
      </div>

      <div className="section-title">{plainLanguage ? 'Why did the AI make this decision?' : 'Primary Reason'}</div>
      <div className="glass-box reason-box" style={{ marginBottom: 24 }}>
        <p className="reason-text" style={{ margin: 0 }}>{plainLanguage ? simple.reason : selectedEntity.reason}</p>
      </div>

      {isSafe ? (
        <div className="glass-box" style={{ borderLeft: '3px solid var(--conf-green)', marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--conf-green)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <ShieldCheck size={16} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              {plainLanguage
                ? "The AI looked at this carefully and decided it's fine to leave it in. It doesn't think anyone could use this to figure out who this person is."
                : "This entity was evaluated by the AI and deliberately kept visible. The AI found no significant privacy risk associated with including it in the output."}
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="section-title">{plainLanguage ? 'What could go wrong if this leaks?' : 'Privacy Risk (If leaked)'}</div>
          <div className="glass-box risk-box" style={{ marginBottom: 24, borderLeft: '4px solid var(--red)' }}>
            <p className="risk-text" style={{ margin: 0, color: 'var(--red)' }}>
              {plainLanguage ? simple.risk : selectedEntity.privacy_risk}
            </p>
          </div>

          {!isRedacted && (
            <div className="glass-box" style={{ borderLeft: '3px solid var(--conf-orange)', marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--conf-orange)' }}>
                <strong>Why is this visible?</strong> This entity was detected, but its confidence score ({selectedEntity.confidence}%) is below your automatic redaction threshold. It requires human review.
              </p>
            </div>
          )}

          <div className="section-title">{plainLanguage ? 'Clues the AI noticed' : 'Supporting Evidence'}</div>
          <ul className="evidence-list glass-list" style={{ marginBottom: 24 }}>
            {(plainLanguage ? (simple.evidence || []) : (selectedEntity.evidence || [])).map((ev, i) => (
              <li key={i} className="glass-list-item">{ev}</li>
            ))}
          </ul>

          {/* Compliance Mapping Panel */}
          {complianceRules.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => setShowCompliance(v => !v)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: 10,
                  padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="var(--primary)" />
                  {plainLanguage ? 'Which privacy laws cover this?' : `Compliance Mapping (${complianceRules.length} regulation${complianceRules.length > 1 ? 's' : ''})`}
                </span>
                {showCompliance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <AnimatePresence>
                {showCompliance && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {complianceRules.map((rule, i) => (
                        <div key={i} className="glass-box" style={{ borderLeft: `3px solid var(--primary)` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{rule.regulation}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontFamily: 'monospace' }}>{rule.article}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {plainLanguage
                              ? rule.description.replace(/\bpersonal data\b/gi, 'private info').replace(/\bnatural person\b/gi, 'individual')
                              : rule.description}
                          </p>
                        </div>
                      ))}
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', margin: '4px 0 0', fontStyle: 'italic' }}>
                        ⚠️ For reference only — verify exact articles with a legal professional before relying on this for compliance.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      <div className="cross-examination-section" style={{ marginTop: 16, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
        <button className="expand-btn glass-btn" onClick={() => setExpanded(!expanded)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={18} /> {plainLanguage ? 'Explain this decision step-by-step' : 'AI Clinical Analysis'}
          </span>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="qna-list" style={{ overflow: 'hidden', marginTop: 16 }}
            >
              <div className="qna-item glass-box" style={{ marginBottom: 12 }}>
                <div className="q-text" style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                  {plainLanguage ? `Why was "${selectedEntity.text}" ${isSafe ? 'left in' : (isRedacted ? 'removed' : 'flagged')}?` : `Why was this ${isSafe ? 'kept visible' : (isRedacted ? 'hidden' : 'flagged for review')}?`}
                </div>
                <div className="a-text">{plainLanguage ? simple.reason : selectedEntity.reason}</div>
              </div>
              {!isSafe && (
                <div className="qna-item glass-box">
                  <div className="q-text" style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                    {plainLanguage ? 'What could happen if it stayed visible?' : 'What if this stayed visible?'}
                  </div>
                  <div className="a-text">
                    {plainLanguage
                      ? `Someone could use this to: ${selectedEntity.privacy_risk}. That's why it was hidden.`
                      : `It poses a direct risk of ${selectedEntity.privacy_risk}.`}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function getConfidenceColor(conf) {
  if (conf >= 98) return 'var(--conf-green)';
  if (conf >= 90) return 'var(--conf-yellow)';
  if (conf >= 70) return 'var(--conf-orange)';
  return 'var(--conf-red)';
}
