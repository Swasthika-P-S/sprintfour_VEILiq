import React, { useState, useMemo } from 'react';
import { Diff, Hash, Eye, EyeOff } from 'lucide-react';
import AccordionCard from './AccordionCard';


export default function DiffView({ originalText, redactedText, entities, redactedSet }) {
  const [mode, setMode] = useState('side-by-side'); // 'side-by-side' | 'inline'

  const diffStats = useMemo(() => {
    const hidden = [...redactedSet].length;
    const originalWords = (originalText || '').split(/\s+/).filter(Boolean).length;
    const redactedWords = (redactedText || '').split(/\s+/).filter(Boolean).length;
    return { hidden, originalWords, redactedWords, removed: originalWords - redactedWords };
  }, [originalText, redactedText, redactedSet]);

  // Build highlighted redacted text for inline diff view
  const buildInlineDiff = () => {
    if (!originalText || !redactedText) return [];
    const segments = [];
    const origWords = originalText.split(/(\s+)/);
    const redWords = redactedText.split(/(\s+)/);

    for (let i = 0; i < Math.max(origWords.length, redWords.length); i++) {
      const orig = origWords[i] || '';
      const red = redWords[i] || '';
      if (orig === red) {
        segments.push({ type: 'same', text: orig });
      } else if (orig && !red) {
        segments.push({ type: 'removed', text: orig });
      } else if (!orig && red) {
        segments.push({ type: 'added', text: red });
      } else {
        segments.push({ type: 'removed', text: orig });
        segments.push({ type: 'added', text: red });
      }
    }
    return segments;
  };

  return (
    <AccordionCard
      icon={<Diff size={20} />}
      iconColor="#60A5FA"
      iconBg="rgba(96,165,250,0.1)"
      title="Before vs After"
      subtitle={`${diffStats.hidden} entities redacted`}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Entities Hidden', value: diffStats.hidden, color: 'var(--conf-red)' },
          { label: 'Original Words', value: diffStats.originalWords, color: 'var(--text-muted)' },
          { label: 'Output Words', value: diffStats.redactedWords, color: 'var(--primary)' },
        ].map(stat => (
          <div key={stat.label} className="glass-box" style={{ flex: 1, minWidth: 80, textAlign: 'center', padding: '10px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>



      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['side-by-side', 'inline'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '4px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
            border: `1px solid ${mode === m ? '#60A5FA' : 'var(--border-glass)'}`,
            background: mode === m ? 'rgba(96,165,250,0.12)' : 'transparent',
            color: mode === m ? '#60A5FA' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            {m === 'side-by-side' ? 'Side by Side' : 'Inline Diff'}
          </button>
        ))}
      </div>

      {mode === 'side-by-side' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="glass-box">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--conf-red)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Original</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.7, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {originalText}
            </div>
          </div>
          <div className="glass-box">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Redacted</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-body)', lineHeight: 1.7, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {redactedText}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-box" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Inline Diff</div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.9 }}>
            {buildInlineDiff().map((seg, i) => (
              <span key={i} style={{
                background: seg.type === 'removed' ? 'rgba(248,113,113,0.2)' : seg.type === 'added' ? 'rgba(52,211,153,0.15)' : 'transparent',
                color: seg.type === 'removed' ? 'var(--conf-red)' : seg.type === 'added' ? 'var(--conf-green)' : 'var(--text-body)',
                textDecoration: seg.type === 'removed' ? 'line-through' : 'none',
                padding: seg.type !== 'same' ? '1px 3px' : 0,
                borderRadius: 3,
                marginRight: 1,
              }}>
                {seg.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </AccordionCard>
  );
}
