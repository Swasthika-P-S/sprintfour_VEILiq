import React from 'react';
import { Users, Check, X, HelpCircle, Info } from 'lucide-react';

export default function ConflictingContextResolver({ conflicts, onResolve }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: 24, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="icon-glass-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Possible Different People Detected
            <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
              {conflicts.length}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contradictory context found for the same name.</div>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="glass-box" style={{ padding: '16px 20px', borderLeft: '3px solid #EF4444' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info size={20} color="var(--primary)" style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                    Are these occurrences of <strong>"{conflict.name}"</strong> the same person?
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {conflict.conflict_reason}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {conflict.occurrences && conflict.occurrences.map((occ, oIdx) => (
                      <div key={oIdx} style={{ background: 'var(--bg-muted)', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--text-dark)' }}>Occurrence {oIdx + 1}:</strong> "{occ.context_snippet || occ.text}"
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}
                      onClick={() => onResolve(idx, 'MERGE')}
                    >
                      <Check size={14} /> Yes, Merge
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', borderColor: 'var(--text-muted)', color: 'var(--text-dark)' }}
                      onClick={() => onResolve(idx, 'SPLIT')}
                    >
                      <X size={14} /> No, Different People
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', borderColor: '#F59E0B', color: '#F59E0B' }}
                      onClick={() => onResolve(idx, 'UNSURE')}
                    >
                      <HelpCircle size={14} /> Unsure (Review Queue)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
