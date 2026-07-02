import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ChevronDown, ChevronUp, Shield, Cloud, Server, Eye, Clock, Lock } from 'lucide-react';

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

const RISK_COLORS = {
  low: { color: 'var(--conf-green)', label: '✅ Low' },
  medium: { color: 'var(--conf-orange)', label: '⚠️ Medium' },
  high: { color: 'var(--conf-red)', label: '🔴 Note' },
};

export default function DataFlowPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border-glass)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="icon-glass-wrapper" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', width: 36, height: 36 }}>
            <Radio size={16} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.88rem' }}>Data Flow Transparency</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>What data goes where when you use VEILiq</div>
          </div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DATA_FLOWS.map((section, si) => (
                <div key={si}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ color: '#60A5FA' }}>{section.icon}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.85rem' }}>{section.title}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {section.items.map((item, ii) => (
                      <div key={ii} className="glass-box" style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.82rem' }}>{item.label}</span>
                          <span style={{ fontSize: '0.7rem', color: RISK_COLORS[item.risk].color, whiteSpace: 'nowrap', fontWeight: 700 }}>
                            {RISK_COLORS[item.risk].label}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.value}</p>
                        {item.note && (
                          <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--conf-orange)', fontStyle: 'italic' }}>ℹ️ {item.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
