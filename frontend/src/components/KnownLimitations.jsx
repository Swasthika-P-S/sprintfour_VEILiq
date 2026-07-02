import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, AlertCircle, Globe, Brain, Scale } from 'lucide-react';

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

const SEVERITY_COLORS = {
  high: { bg: 'rgba(248,113,113,0.08)', border: 'var(--conf-red)', text: 'var(--conf-red)', label: 'HIGH' },
  medium: { bg: 'rgba(245,158,11,0.08)', border: 'var(--conf-orange)', text: 'var(--conf-orange)', label: 'MEDIUM' },
  low: { bg: 'rgba(52,211,153,0.08)', border: 'var(--conf-green)', text: 'var(--conf-green)', label: 'LOW' },
};

export default function KnownLimitations() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)',
          borderRadius: 20, color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <AlertCircle size={14} />
        Known Limitations
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
            }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 28 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ color: 'var(--text-dark)', fontWeight: 800, marginBottom: 4, fontSize: '1.1rem' }}>
                    Known Limitations
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    VEILiq is powerful but not perfect. Read before relying on it for critical decisions.
                  </p>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {LIMITATIONS.map((lim, i) => {
                  const sc = SEVERITY_COLORS[lim.severity];
                  return (
                    <div key={i} style={{
                      padding: '14px 16px', background: sc.bg, border: `1px solid ${sc.border}`,
                      borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start'
                    }}>
                      <div style={{ color: sc.text, marginTop: 2, flexShrink: 0 }}>{lim.icon}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem' }}>{lim.title}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: sc.text, padding: '1px 6px', border: `1px solid ${sc.border}`, borderRadius: 8 }}>
                            {sc.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{lim.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
