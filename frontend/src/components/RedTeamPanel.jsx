import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Loader2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import AccordionCard from './AccordionCard';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

function RiskBar({ score }) {
  const color = score >= 70 ? 'var(--conf-red)' : score >= 40 ? 'var(--conf-orange)' : 'var(--conf-green)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-muted)', borderRadius: 6, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 6 }}
        />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color, minWidth: 36 }}>{score}%</span>
    </div>
  );
}

export default function RedTeamPanel({ redactedText, entities, redactedIndices, token }) {
  const [risks, setRisks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runRedTeam = async () => {
    setLoading(true);
    setError(null);
    setRisks(null);
    try {
      const res = await fetch(`${API}/verify/redteam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ redactedText, entities, redactedIndices })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Red team check failed. Please try again.');
        return;
      }
      if (!data.reidentification_risks || data.reidentification_risks.length === 0) {
        setRisks([]);
      } else {
        setRisks(data.reidentification_risks);
      }
    } catch (e) {
      console.error('Red team fetch error:', e);
      setError('Red team check failed. The AI service may be temporarily unavailable. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const highRisk = risks ? risks.filter(r => r.risk_score >= 50) : [];

  const actionButton = (
    <button
      className="glass-btn"
      style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', background: 'var(--conf-red)', color: '#fff', border: 'none' }}
      onClick={runRedTeam}
      disabled={loading}
    >
      {loading ? <><Loader2 size={12} className="spin-animation" style={{ marginRight: 4 }} /> Attacking…</> : 'Run Attack'}
    </button>
  );

  return (
    <AccordionCard
      icon={<Swords size={20} />}
      iconColor="var(--conf-red)"
      iconBg="rgba(248,113,113,0.1)"
      title="Red Team Re-identification Check"
      subtitle="Can an attacker reverse your redactions?"
      actionButton={actionButton}
    >
      <AnimatePresence mode="wait">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: 'var(--conf-red)', fontSize: '0.85rem', padding: '8px 12px', background: 'var(--conf-red-bg)', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </motion.div>
        )}

        {!risks && !loading && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)' }}>
            <Swords size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: '0.85rem' }}>Run a simulated adversarial attack. VEILiq will attempt to uniquely re-identify the subject using the remaining visible data.</div>
          </motion.div>
        )}

        {risks && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Summary banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: highRisk.length === 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${highRisk.length === 0 ? 'var(--conf-green)' : 'var(--conf-red)'}`,
              borderRadius: 10, marginBottom: 16
            }}>
              {highRisk.length === 0
                ? <CheckCircle2 size={22} color="var(--conf-green)" />
                : <AlertTriangle size={22} color="var(--conf-red)" />}
              <div>
                <div style={{ fontWeight: 700, color: highRisk.length === 0 ? 'var(--conf-green)' : 'var(--conf-red)', fontSize: '0.9rem' }}>
                  {risks.length === 0
                    ? 'No redacted tokens found to attack'
                    : highRisk.length === 0
                      ? `✅ Low re-identification risk across ${risks.length} redacted token(s)`
                      : `⚠️ ${highRisk.length} of ${risks.length} token(s) are at high re-identification risk`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scores above 50% require additional redaction</div>
              </div>
            </div>

            {/* Per-entity risks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {risks.map((r, i) => (
                <div key={i} className="glass-box" style={{
                  borderLeft: `3px solid ${r.risk_score >= 50 ? 'var(--conf-red)' : 'var(--conf-green)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {r.replacement}
                    </span>
                    {r.risk_score >= 50 && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--conf-red-bg)', color: 'var(--conf-red)', borderRadius: 10, fontWeight: 700 }}>
                        HIGH RISK
                      </span>
                    )}
                  </div>
                  <RiskBar score={r.risk_score} />
                  <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-dark)' }}>What's leaking:</strong> {r.leaking_context}
                  </div>
                  {r.risk_score >= 50 && r.suggestion && (
                    <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--conf-orange)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ChevronRight size={12} /> <strong>Fix:</strong> {r.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.spin-animation { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AccordionCard>
  );
}
