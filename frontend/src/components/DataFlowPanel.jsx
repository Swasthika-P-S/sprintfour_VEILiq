import React from 'react';
import { Cloud, Server, Clock, Lock, Info, AlertCircle, Globe, Brain, Scale, ShieldCheck } from 'lucide-react';

const DATA_FLOWS = [
  {
    icon: <Cloud size={16} />,
    title: 'What leaves your device',
    items: [
      { label: 'Document text', value: 'Sent to Google Gemini API for PII detection', risk: 'medium', note: 'Your text is processed by a third-party AI service.' },
      { label: 'Gemini API key', value: 'Stored in backend .env, never exposed to browser', risk: 'low' },
      { label: 'Authentication token', value: 'JWT sent with each API request', risk: 'low' },
    ]
  },
  {
    icon: <Server size={16} />,
    title: 'What stays on your server',
    items: [
      { label: 'Redaction decisions', value: 'Processed and returned in-memory only', risk: 'low' },
      { label: 'Audit log', value: 'Stored temporarily in session state — not persisted to disk by default', risk: 'low' },
    ]
  },
  {
    icon: <Clock size={16} />,
    title: 'Data retention',
    items: [
      { label: 'Google Gemini', value: 'Google may retain API inputs for up to 30 days for safety review per their terms', risk: 'high', note: 'See Google Cloud data processing terms for details.' },
      { label: 'VEILiq backend', value: 'No document content is stored to disk. Session data is cleared on logout.', risk: 'low' },
    ]
  },
  {
    icon: <Lock size={16} />,
    title: 'Local-only option',
    items: [
      { label: 'Regex engine', value: 'Runs entirely in your backend — no external API calls', risk: 'low', note: 'Use "Regex Only" mode for maximum privacy if you do not trust cloud APIs.' },
    ]
  },
];

const LIMITATIONS = [
  {
    icon: <Globe size={16} />,
    title: 'Non-English documents',
    detail: 'The AI performs best on English text. Indirect identifiers and cultural naming patterns in other languages may be missed or misclassified.',
    severity: 'medium',
  },
  {
    icon: <Brain size={16} />,
    title: 'Sarcasm and context-dependent PII',
    detail: 'Text like "you know who I mean" or "the usual suspect" may refer to a specific person but will not be detected without full context.',
    severity: 'medium',
  },
  {
    icon: <AlertCircle size={16} />,
    title: 'Indirect identifiers (Mosaic Effect)',
    detail: 'Individually harmless facts (job title + city + age range) can combine to uniquely identify someone. The AI flags common combinations but cannot exhaustively check all possibilities.',
    severity: 'high',
  },
  {
    icon: <Scale size={16} />,
    title: 'Legal compliance is not guaranteed',
    detail: 'Compliance mappings (GDPR, HIPAA, CCPA) are provided for reference only. They do not constitute legal advice. Always verify with a qualified legal professional.',
    severity: 'high',
  },
  {
    icon: <Globe size={16} />,
    title: 'Very long or complex documents',
    detail: 'Documents over 10,000 words may be truncated before reaching the AI. Entities near the end of very long documents may not be detected.',
    severity: 'low',
  },
  {
    icon: <Brain size={16} />,
    title: 'AI confidence is an estimate',
    detail: 'The stated confidence scores (e.g., 97%) are probabilistic estimates, not guarantees. Human review of low-confidence entities is strongly recommended.',
    severity: 'medium',
  },
];

const RISK_COLORS = {
  low: { color: 'var(--conf-green)', label: '✅ Low', bg: 'rgba(52,211,153,0.08)', border: 'var(--conf-green)' },
  medium: { color: 'var(--conf-orange)', label: '⚠️ Medium', bg: 'rgba(245,158,11,0.08)', border: 'var(--conf-orange)' },
  high: { color: 'var(--conf-red)', label: '🔴 High', bg: 'rgba(248,113,113,0.08)', border: 'var(--conf-red)' },
};

export default function DataFlowPanel() {
  return (
    <div className="card" style={{ maxWidth: 800, margin: '40px auto', padding: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Info size={32} color="#60A5FA" />
        <div>
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-dark)', margin: 0 }}>About This Tool</h2>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.9rem' }}>Transparency, Data Flow, and Limitations</p>
        </div>
      </div>

      <div style={{ marginBottom: 40, lineHeight: 1.6, color: 'var(--text-body)' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: 12 }}>What VEILiq does</h3>
        <p style={{ margin: 0 }}>
          VEILiq is an AI-powered document sanitization tool designed to identify, highlight, and redact personally identifiable information (PII) before documents are shared externally. It uses a combination of pattern matching and semantic AI to catch both direct and indirect identifiers while providing a tamper-evident audit trail of all redaction decisions.
        </p>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: 20 }}>Data Flow Transparency</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {DATA_FLOWS.map((section, si) => (
            <div key={si}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ color: '#60A5FA' }}>{section.icon}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '1rem' }}>{section.title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ padding: '16px 20px', background: 'var(--bg-muted)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{item.label}</span>
                      <span style={{ fontSize: '0.75rem', color: RISK_COLORS[item.risk].color, whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {RISK_COLORS[item.risk].label}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{item.value}</p>
                    {item.note && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--conf-orange)', fontStyle: 'italic' }}>ℹ️ {item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: 20 }}>Known Limitations</h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          VEILiq is powerful but not perfect. Read before relying on it for critical decisions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LIMITATIONS.map((lim, i) => {
            const sc = RISK_COLORS[lim.severity];
            return (
              <div key={i} style={{
                padding: '16px 20px', background: sc.bg, border: `1px solid ${sc.border}`,
                borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start'
              }}>
                <div style={{ color: sc.color, marginTop: 2, flexShrink: 0 }}>{lim.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{lim.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-body)', lineHeight: 1.6 }}>{lim.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-dark)', marginBottom: 12 }}>Independent Verification</h3>
        <div style={{ padding: '20px', background: 'var(--primary-light)', borderRadius: 12, border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>"Trust No Box" Verification Guide</h4>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-dark)', lineHeight: 1.6 }}>
            You don't have to take our word for it. When you export a document, we also generate a Trust Report containing a tamper-evident audit log with cryptographic hashes. You can independently verify that redactions were applied at the structural level (e.g., using <code>pdftotext</code>) and prove no audit records were altered.
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            Refer to the second page of your exported Trust Report PDF for step-by-step CLI instructions.
          </p>
        </div>
      </div>

    </div>
  );
}
