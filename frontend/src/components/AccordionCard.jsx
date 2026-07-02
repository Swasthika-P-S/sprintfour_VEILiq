import React from 'react';

export default function AccordionCard({ icon, iconColor, iconBg, title, subtitle, children, actionButton = null }) {

  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'transparent', borderBottom: '1px solid var(--border-glass)',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="icon-glass-wrapper" style={{ background: iconBg || 'rgba(96,165,250,0.1)', color: iconColor || '#60A5FA', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '0.95rem' }}>{title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
          {actionButton && (
            <div>
              {actionButton}
            </div>
          )}
        </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}
