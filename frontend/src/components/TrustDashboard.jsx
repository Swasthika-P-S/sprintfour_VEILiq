import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, EyeOff, TrendingUp } from 'lucide-react';

export default function TrustDashboard({ metrics }) {
  // metrics = { totalFound, hidden, reviewRequired, humanApproved, keptVisible, score, entities }
  
  // metrics = { totalFound, hidden, reviewRequired, humanApproved, keptVisible, score, entities }

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
          style={{ background: scoreColor, color: 'white', boxShadow: `0 0 20px ${scoreColor}55` }}
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
        <MetricCard icon={<CheckCircle color="var(--text-dark)" />} label="Human Reviewed" value={metrics.humanApproved} />
      </div>

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
