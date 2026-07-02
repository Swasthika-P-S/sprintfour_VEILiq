import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, EyeOff, TrendingUp } from 'lucide-react';

export default function TrustDashboard({ metrics }) {
  // metrics = { totalFound, hidden, reviewRequired, humanApproved, keptVisible, score, entities }
  
  // Feature 5: Confidence Calibration — compute accuracy stats from reviewed entities
  const calibration = useMemo(() => {
    const reviewed = (metrics.entities || []).filter(e => e.status === 'approved' || e.status === 'rejected');
    const correct = reviewed.filter(e => e.status === 'approved').length;
    const total = reviewed.length;
    if (total === 0) return null;
    const accuracy = Math.round((correct / total) * 100);
    const avgConfidence = Math.round(reviewed.reduce((s, e) => s + e.confidence, 0) / total);
    return { accuracy, avgConfidence, total };
  }, [metrics.entities]);

  const scoreColor = metrics.score >= 80 ? 'var(--conf-green)' : metrics.score >= 50 ? 'var(--conf-yellow)' : 'var(--conf-red)';

  return (
    <div className="trust-dashboard">
      <div className="trust-score-header">
        <div>
          <h3 className="dashboard-title">Document Trust Score</h3>
          <p className="dashboard-subtitle">Based on AI confidence and coverage</p>
        </div>
        <motion.div
          className="score-circle"
          style={{ color: scoreColor, borderColor: scoreColor, boxShadow: `0 0 20px ${scoreColor}33` }}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {metrics.score}%
        </motion.div>
      </div>

      <div className="metrics-grid">
        <MetricCard icon={<Shield color="var(--primary)" />} label="Sensitive Items" value={metrics.totalFound} />
        <MetricCard icon={<EyeOff color="var(--conf-green)" />} label="Hidden" value={metrics.hidden} />
        <MetricCard icon={<AlertTriangle color="var(--conf-orange)" />} label="Needs Review" value={metrics.reviewRequired} />
        <MetricCard icon={<CheckCircle color="var(--text-dark)" />} label="Human Approved" value={metrics.humanApproved} />
        {(metrics.keptVisible ?? 0) > 0 && (
          <MetricCard icon={<CheckCircle color="var(--conf-green)" />} label="Kept Visible" value={metrics.keptVisible} />
        )}
      </div>

      {/* Feature 5: Calibration Transparency */}
      {calibration ? (
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)' }}>AI Calibration Accuracy</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>When we say it's PII, we're right</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 5, background: 'var(--bg-muted)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${calibration.accuracy}%` }} transition={{ duration: 1 }}
                    style={{ height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{calibration.accuracy}%</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', margin: '6px 0 0' }}>
            Based on {calibration.total} human-reviewed decision{calibration.total !== 1 ? 's' : ''} · avg confidence stated: {calibration.avgConfidence}%
          </p>
        </div>
      ) : (metrics.totalFound > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-glass-strong)', border: '1px solid var(--border-glass)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} color="var(--text-faint)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
              Calibration data will appear as you review and approve/reject entities in the queue below.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="metric-card-mini">
      <div className="metric-icon-wrap">{icon}</div>
      <div className="metric-info">
        <span className="m-val">{value}</span>
        <span className="m-lab">{label}</span>
      </div>
    </div>
  );
}
