import React from 'react';
import { UserPlus, Check, X, Info } from 'lucide-react';

export default function AliasResolver({ aliases, onResolve }) {
  if (!aliases || aliases.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: 24, border: '1px solid rgba(167, 139, 250, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="icon-glass-wrapper" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserPlus size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Alias Resolution Required
            <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem' }}>
              {aliases.length}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Did we find a nickname for someone?</div>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {aliases.map((alias, idx) => (
            <div key={idx} className="glass-box" style={{ padding: '16px 20px', borderLeft: '3px solid #A78BFA' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info size={20} color="var(--primary)" style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                    Is <strong>"{alias.text}"</strong> the same person as <strong>"{alias.base_entity}"</strong>?
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {alias.reason}
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}
                      onClick={() => onResolve(idx, true)}
                    >
                      <Check size={14} /> Yes, Link to {alias.proposed_replacement}
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', borderColor: 'var(--text-muted)', color: 'var(--text-dark)' }}
                      onClick={() => onResolve(idx, false)}
                    >
                      <X size={14} /> No, Different Person
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
