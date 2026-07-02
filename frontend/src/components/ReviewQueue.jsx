import React from 'react';
import { ShieldAlert, Check, X, HelpCircle } from 'lucide-react';

export default function ReviewQueue({ entities, redactedSet, ignoredSet, onToggleRedact, onToggleIgnore, onSelect }) {
  const uncertainEntities = entities
    .map((e, idx) => ({ ...e, idx }))
    .filter(e => e.confidence < 90 && !redactedSet.has(e.idx) && !ignoredSet.has(e.idx));

  if (uncertainEntities.length === 0) return null;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'var(--conf-orange)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <ShieldAlert size={16} /> Human Review Required
          <span style={{ background: 'var(--conf-orange)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem' }}>
            {uncertainEntities.length}
          </span>
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {uncertainEntities.map(e => (
            <div key={e.idx} className="review-card" onClick={() => onSelect(e)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{e.text}</span>
                <span style={{ color: 'var(--conf-orange)', fontSize: '0.8rem', fontWeight: 600 }}>{e.confidence}%</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                {e.reason}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" style={{ flex: 1, borderColor: 'var(--conf-green)', color: 'var(--conf-green)' }} onClick={(ev) => { ev.stopPropagation(); onToggleIgnore(e.idx); }}>
                  <Check size={14} style={{ marginRight: 4 }} /> Keep
                </button>
                <button className="btn btn-sm btn-outline" style={{ flex: 1, borderColor: 'var(--conf-red)', color: 'var(--conf-red)' }} onClick={(ev) => { ev.stopPropagation(); onToggleRedact(e.idx); }}>
                  <X size={14} style={{ marginRight: 4 }} /> Hide
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
