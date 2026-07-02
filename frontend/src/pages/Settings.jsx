import React, { useState } from 'react';
import { Shield, Settings as SettingsIcon, Save } from 'lucide-react';
import DataFlowPanel from '../components/DataFlowPanel';

export default function Settings() {
  const [rules, setRules] = useState({
    hideNames: true,
    hideEmails: true,
    hidePhones: true,
    hideFinancial: true,
    hideMedical: false,
    customRegex: ''
  });

  const handleSave = () => {
    // In a real app, save to backend or context
    alert('Settings saved successfully!');
  };

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth: 800, margin: '40px auto', padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <SettingsIcon size={32} color="var(--primary)" />
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-dark)', margin: 0 }}>Rule-Based Redaction Settings</h2>
        </div>

        <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
          Configure automatic redaction rules for your organization. When these rules are enabled, VEILiq will automatically hide these entities upon document upload without waiting for manual human review, ensuring baseline compliance.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="setting-row">
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--text-dark)' }}>Auto-Hide Names</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automatically redact all detected person names.</div>
            </div>
            <input type="checkbox" checked={rules.hideNames} onChange={e => setRules({...rules, hideNames: e.target.checked})} className="toggle-checkbox" />
          </div>

          <div className="setting-row">
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--text-dark)' }}>Auto-Hide Emails</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automatically redact all email addresses.</div>
            </div>
            <input type="checkbox" checked={rules.hideEmails} onChange={e => setRules({...rules, hideEmails: e.target.checked})} className="toggle-checkbox" />
          </div>

          <div className="setting-row">
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--text-dark)' }}>Auto-Hide Phone Numbers</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automatically redact all phone numbers globally.</div>
            </div>
            <input type="checkbox" checked={rules.hidePhones} onChange={e => setRules({...rules, hidePhones: e.target.checked})} className="toggle-checkbox" />
          </div>
          
          <div className="setting-row">
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--text-dark)' }}>Auto-Hide Financial Data</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automatically redact PAN, Aadhaar, Credit Cards, and IFSC codes.</div>
            </div>
            <input type="checkbox" checked={rules.hideFinancial} onChange={e => setRules({...rules, hideFinancial: e.target.checked})} className="toggle-checkbox" />
          </div>

          <div className="setting-row">
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--text-dark)' }}>Auto-Hide Medical Terms</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Automatically redact specific diseases, hospital names, and treatments.</div>
            </div>
            <input type="checkbox" checked={rules.hideMedical} onChange={e => setRules({...rules, hideMedical: e.target.checked})} className="toggle-checkbox" />
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <h4 style={{ margin: '0 0 12px', color: 'var(--text-dark)' }}>Custom Keywords (Comma separated)</h4>
          <textarea 
            className="input-field" 
            style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dark)', fontFamily: 'inherit' }} 
            placeholder="e.g. Project Apollo, Internal Code 44"
            value={rules.customRegex}
            onChange={e => setRules({...rules, customRegex: e.target.value})}
          />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleSave}>
          <Save size={18} /> Save Rule Configuration
        </button>

        <style>{`
          .setting-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 16px 20px; background: var(--bg-muted); border-radius: 12px;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
          }
          .setting-row:hover {
            border-color: var(--primary);
            background: var(--bg-card);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .toggle-checkbox {
            width: 24px; height: 24px; accent-color: var(--primary); cursor: pointer;
            margin-left: 16px; flex-shrink: 0;
          }
        `}</style>
      </div>

      <DataFlowPanel />
    </div>
  );
}
