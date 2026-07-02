import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Diff, ChevronDown, ChevronUp, Hash } from 'lucide-react';

// Compute a simple SHA-256 hash of text using SubtleCrypto
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function useSHA256(text) {
  const [hash, setHash] = useState('computing…');
  useMemo(() => {
    if (!text) { setHash('—'); return; }
    sha256(text).then(setHash);
  }, [text]);
  return hash;
}

export default function DiffView({ originalText, redactedText, entities, redactedSet }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('side-by-side'); // 'side-by-side' | 'inline'
  const originalHash = useSHA256(originalText);

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
    let redCursor = 0;
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
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border-glass)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="icon-glass-wrapper" style={{ background: 'rgba(96,165,250,0.1)', color: '#60A5FA', width: 40, height: 40 }}>
            <Diff size={20} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.95rem' }}>Before vs After</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {diffStats.hidden} entities redacted · Provenance hash preserved
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px' }}>
              {/* Stats row */}
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

              {/* SHA-256 provenance hash */}
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Hash size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)' }}>Original Document Hash (SHA-256)</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--primary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                  {originalHash}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  This hash proves what the original document contained without storing the sensitive content itself. You can verify any future version against this fingerprint.
                </p>
              </div>

              {/* Mode switcher */}
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

              {/* Diff panels */}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
