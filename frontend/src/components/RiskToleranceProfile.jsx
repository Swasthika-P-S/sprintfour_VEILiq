import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

const PROFILES = [
  {
    id: 'paranoid',
    label: 'Maximum Privacy',
    description: 'Sharing with a stranger / public audience',
    threshold: 15,
    color: 'var(--conf-red)',
    emoji: '🔴',
  },
  {
    id: 'cautious',
    label: 'High Caution',
    description: 'Sending to an external partner or regulator',
    threshold: 30,
    color: 'var(--conf-orange)',
    emoji: '🟠',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Sharing internally within a trusted team',
    threshold: 60,
    color: 'var(--conf-yellow)',
    emoji: '🟡',
  },
  {
    id: 'relaxed',
    label: 'Relaxed',
    description: 'Internal review only — document stays in-house',
    threshold: 80,
    color: 'var(--conf-green)',
    emoji: '🟢',
  },
];

export default function RiskToleranceProfile({ onThresholdChange, currentThreshold }) {
  const [open, setOpen] = useState(false);
  const active = PROFILES.find(p => p.threshold >= currentThreshold) || PROFILES[PROFILES.length - 1];

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border-glass)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="icon-glass-wrapper" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--conf-yellow)', width: 36, height: 36 }}>
            <SlidersHorizontal size={16} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.88rem' }}>
              Risk Profile: <span style={{ color: active.color }}>{active.emoji} {active.label}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Redacting anything above {currentThreshold}% risk
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '16px 20px' }}
        >
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Choose how aggressively to redact. The AI will auto-hide everything above your chosen confidence threshold.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PROFILES.map(profile => {
              const isActive = currentThreshold === profile.threshold;
              return (
                <button
                  key={profile.id}
                  onClick={() => onThresholdChange(profile.threshold)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                    background: isActive ? `${profile.color}18` : 'var(--bg-glass-strong)',
                    border: `1px solid ${isActive ? profile.color : 'var(--border-glass)'}`,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{profile.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: isActive ? profile.color : 'var(--text-dark)', fontSize: '0.88rem' }}>
                      {profile.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile.description}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: profile.color, fontFamily: 'monospace' }}>
                    &gt;{profile.threshold}%
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-glass-strong)', borderRadius: 8, border: '1px solid var(--border-glass)' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-dark)' }}>Current setting:</strong> Anything the AI detects with more than <strong style={{ color: active.color }}>{currentThreshold}%</strong> confidence will be automatically redacted.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
