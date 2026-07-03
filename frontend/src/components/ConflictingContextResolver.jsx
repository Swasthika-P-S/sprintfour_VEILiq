import React from 'react';
import { Users, Check, X, HelpCircle, AlertTriangle } from 'lucide-react';

export default function ConflictingContextResolver({ conflicts, onResolve, entities = [], text = '' }) {
  const [mappings, setMappings] = React.useState({});
  
  if (!conflicts || conflicts.length === 0) return null;

  const findAllOccurrences = (str, target) => {
    const occs = [];
    if (!str || !target) return occs;
    const regex = new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let m;
    while ((m = regex.exec(str)) !== null) {
      occs.push({ index: m.index, text: m[0] });
    }
    return occs;
  };

  const getContextSnippet = (str, index, targetLength) => {
    const start = Math.max(0, index - 40);
    const end = Math.min(str.length, index + targetLength + 40);
    return '...' + str.substring(start, end).replace(/\n/g, ' ') + '...';
  };

  const existingIdentities = Array.from(new Set(
    entities
      .filter(e => e.replacement && e.replacement.match(/\[(NAME|PERSON)-\d+\]/i))
      .map(e => e.replacement)
  )).sort();

  const handleMappingChange = (conflictIdx, occurrenceIdx, value) => {
    setMappings(prev => ({ ...prev, [`${conflictIdx}-${occurrenceIdx}`]: value }));
  };

  return (
    <div className="glass-card" style={{ marginTop: 24, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="icon-glass-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            Possible Different Entities — Same Name Detected
            <span style={{ background: '#F59E0B', color: '#000', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
              {conflicts.length}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>We found conflicting facts for this entity. Are they referring to the same thing/person?</div>
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
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 8 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 4 }}>Assign an identity to each occurrence:</div>
                    {findAllOccurrences(text, conflict.name).map((occ, oIdx) => {
                      const snippet = getContextSnippet(text, occ.index, occ.text.length);
                      return (
                      <div key={oIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: 8 }}>
                          {snippet}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <button 
                            className={`btn btn-sm ${mappings[`${idx}-${oIdx}`] === 'NEW' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            onClick={() => handleMappingChange(idx, oIdx, 'NEW')}
                          >
                            New Distinct Person
                          </button>
                          {existingIdentities.map(id => (
                            <button 
                              key={id}
                              className={`btn btn-sm ${mappings[`${idx}-${oIdx}`] === id ? 'btn-primary' : 'btn-outline'}`}
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              onClick={() => handleMappingChange(idx, oIdx, id)}
                            >
                              Link to {id}
                            </button>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '140px', justifyContent: 'center' }}
                      onClick={() => onResolve(idx, 'CUSTOM', mappings, findAllOccurrences(text, conflict.name))}
                      disabled={!findAllOccurrences(text, conflict.name).every((_, i) => mappings[`${idx}-${i}`])}
                    >
                      <Check size={14} /> Confirm Assignments
                    </button>
                    <button 
                      className="btn btn-sm btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: '140px', justifyContent: 'center', borderColor: 'var(--text-muted)', color: 'var(--text-dark)' }}
                      onClick={() => onResolve(idx, 'UNSURE', null, null)}
                    >
                      <HelpCircle size={14} /> Unsure (Flag All)
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
