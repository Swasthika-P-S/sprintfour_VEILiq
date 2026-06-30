import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const CATEGORY_CONFIG = {
  keep:       { label: 'Keep',        icon: '✓', color: 'var(--green-primary)',  bg: 'var(--green-light)' },
  review:     { label: 'Review',      icon: '⚠', color: 'var(--amber)',          bg: 'var(--amber-bg)' },
  alwaysHide: { label: 'Always Hide', icon: '✕', color: 'var(--red)',            bg: 'var(--red-bg)' },
};

function PolicyChip({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: bg,
      color,
      fontSize: '0.78rem',
      fontWeight: 600,
      border: `1px solid ${color}22`,
    }}>
      {label}
    </span>
  );
}

/**
 * PrivacyPolicyTemplates
 *
 * Props:
 *  - token         : JWT string
 *  - onApply(policy): called when user clicks "Apply Policy"
 *                     parent should use this to auto-redact alwaysHide PII types
 */
export default function PrivacyPolicyTemplates({ token, onApply }) {
  const [policies, setPolicies]   = useState([]);
  const [selected, setSelected]   = useState(null); // policy object
  const [loading, setLoading]     = useState(true);
  const [open, setOpen]           = useState(false); // modal open
  const [activeTab, setActiveTab] = useState('keep');

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/policies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setPolicies(data.policies))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSelectPolicy = (policy) => {
    setSelected(policy);
    setActiveTab('keep');
    setOpen(true);
  };

  const handleApply = () => {
    if (selected && onApply) {
      onApply(selected);
    }
    setOpen(false);
  };

  if (loading) return null;

  const tabs = ['keep', 'review', 'alwaysHide'];

  return (
    <>
      {/* Trigger Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div className="card-title">📋 Privacy Policy Templates</div>
        </div>
        <div className="card-body" style={{ paddingTop: 12 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Choose a context to load predefined rules for which PII fields to keep, review, or always hide.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPolicy(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: selected?.id === p.id ? 'var(--green-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {p.description}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                  View →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {open && selected && (
        <div
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            width: '100%',
            maxWidth: 560,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
            animation: 'slideUp 0.25s ease',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '2rem' }}>{selected.icon}</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                  {selected.label} Privacy Policy
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selected.description}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', fontSize: '1.3rem',
                  cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 0 }}>
                {tabs.map((tab) => {
                  const cfg = CATEGORY_CONFIG[tab];
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? cfg.color : 'var(--text-muted)',
                        borderBottom: isActive ? `2px solid ${cfg.color}` : '2px solid transparent',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span>{cfg.icon}</span>
                      {cfg.label}
                      <span style={{
                        padding: '1px 7px',
                        borderRadius: 'var(--radius-full)',
                        background: cfg.bg,
                        color: cfg.color,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}>
                        {selected[tab]?.length || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '20px 24px' }}>
              {(() => {
                const cfg = CATEGORY_CONFIG[activeTab];
                const fields = selected[activeTab] || [];
                if (fields.length === 0) {
                  return (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No fields in this category.
                    </p>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {fields.map((f) => (
                      <PolicyChip
                        key={f.label}
                        label={f.label}
                        color={cfg.color}
                        bg={cfg.bg}
                      />
                    ))}
                  </div>
                );
              })()}

              {activeTab === 'alwaysHide' && selected.alwaysHide?.length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--red-bg)',
                  border: '1px solid var(--red)22',
                  fontSize: '0.8rem',
                  color: 'var(--red)',
                }}>
                  ⚠ Clicking <strong>"Apply Policy"</strong> will automatically redact all detected
                  PII matching the <em>Always Hide</em> categories in your current document.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApply} id="apply-policy-btn">
                ✓ Apply Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
