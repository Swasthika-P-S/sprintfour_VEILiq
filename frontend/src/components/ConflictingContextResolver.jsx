import React from 'react';
import { Users, Check, X, HelpCircle, AlertTriangle } from 'lucide-react';

export default function ConflictingContextResolver({ conflicts, onResolve }) {
  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: 24, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="icon-glass-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Possible Different People — Same Name Detected
            <span style={{ background: '#F59E0B', color: '#000', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
              {conflicts.length}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We found conflicting facts for this name. Are they the same person?</div>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {conflicts.map((conflict, idx) => (
            <div key={idx} className="glass-box" style={{ padding: '16px 20px', borderLeft: '3px solid #F59E0B' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertTriangle size={20} color="#F59E0B" style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                    Conflicting context found for <strong>"{conflict.name}"</strong>
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {conflict.conflict_reason}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                    {(conflict.occurrences || []).map((occ, oIdx) => (
                      <div key={oIdx} style={{ fontSize: '0.85rem', color: 'var(--text-light)', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: 8 }}>
                        "{occ.context_snippet}"
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '140px', justifyContent: 'center' }}
                      onClick={() => onResolve(idx, 'merge')}
                    >
                      <Check size={14} /> Yes, Merge
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '140px', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#EF4444' }}
                      onClick={() => onResolve(idx, 'separate')}
                    >
                      <X size={14} /> No, Separate
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '140px', justifyContent: 'center', borderColor: 'var(--text-muted)', color: 'var(--text-dark)' }}
                      onClick={() => onResolve(idx, 'unsure')}
                    >
                      <HelpCircle size={14} /> Unsure (Flag)
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
