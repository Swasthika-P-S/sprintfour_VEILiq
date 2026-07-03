import React from 'react';
import { ShieldAlert, Check, X, HelpCircle, AlertTriangle } from 'lucide-react';

export default function ReviewQueue({ entities, redactedSet, ignoredSet, onToggleRedact, onToggleIgnore, onSelect, fallbackMode }) {
  // An entity is "resolved" if it already has a clean [TYPE-N] pseudonym assigned
  const isResolved = (e) => /^\[[A-Z_]+-\d+\]$/.test((e.replacement || '').trim());

  const uncertainEntities = entities
    .map((e, idx) => ({ ...e, idx }))
    .filter(e => e.confidence < 90 && !redactedSet.has(e.idx) && !ignoredSet.has(e.idx) && !isResolved(e));

  if (uncertainEntities.length === 0) return null;

  // Group entities by exact text match
  const grouped = {};
  uncertainEntities.forEach(e => {
    const text = e.text;
    if (!grouped[text]) {
      grouped[text] = {
        text: e.text,
        confidence: e.confidence, // Display the confidence of the first occurrence
        reason: e.reason,
        indices: [],
        firstEntity: e // For selecting in UI
      };
    }
    grouped[text].indices.push(e.idx);
  });
  const groupedList = Object.values(grouped);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: 'var(--conf-orange)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <ShieldAlert size={16} /> Human Review Required
          <span style={{ background: 'var(--conf-orange)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem' }}>
            {groupedList.length}
          </span>
        </div>
        {fallbackMode && (
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={12} color="var(--conf-orange)" />
            AI engine temporarily unavailable — using pattern-based detection with reduced accuracy. Results should be manually reviewed before downloading.
          </div>
        )}
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupedList.map(group => (
            <div key={group.indices.join('-')} className="review-card" onClick={() => onSelect(group.firstEntity)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>
                  {group.text} {group.indices.length > 1 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>({group.indices.length} occurrences)</span>}
                </span>
                <span style={{ color: 'var(--conf-orange)', fontSize: '0.8rem', fontWeight: 600 }}>{group.confidence}%</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                {group.reason}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-sm btn-outline" style={{ flex: 1, borderColor: 'var(--conf-green)', color: 'var(--conf-green)' }} onClick={(ev) => { ev.stopPropagation(); onToggleIgnore(group.indices); }}>
                  <Check size={14} style={{ marginRight: 4 }} /> Keep {group.indices.length > 1 ? 'All' : ''}
                </button>
                <button className="btn btn-sm btn-outline" style={{ flex: 1, borderColor: 'var(--conf-red)', color: 'var(--conf-red)' }} onClick={(ev) => { ev.stopPropagation(); onToggleRedact(group.indices); }}>
                  <X size={14} style={{ marginRight: 4 }} /> Hide {group.indices.length > 1 ? 'All' : ''}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
