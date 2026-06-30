import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getRiskLevel, getRiskLabel } from '../components/PrivacyScore';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const SCORE_COLORS = {
  low:    { bar: 'var(--green-primary)', text: 'var(--green-primary)' },
  medium: { bar: 'var(--amber)',         text: 'var(--amber)'         },
  high:   { bar: 'var(--red)',           text: 'var(--red)'           },
};

export default function History() {
  const { token } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${API}/documents/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(data.documents || []);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document from history?')) return;
    try {
      await axios.delete(`${API}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory((prev) => prev.filter((d) => d._id !== id));
      if (selectedDoc?._id === id) setSelectedDoc(null);
    } catch {
      alert('Failed to delete.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedDoc.redactedText);
    setCopyMsg('Copied!');
    setTimeout(() => setCopyMsg(''), 2000);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Analysis History</h1>
        <p>Review past privacy analyses, inspect redacted outputs, and track your document safety.</p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📋</div>
          <h3 style={{ color: 'var(--text-dark)', marginBottom: 8, fontFamily: 'Space Grotesk' }}>No history yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Analyze a document and click "Save to History" to see it here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '1fr 420px' : '1fr', gap: 24 }}>

          {/* Left: History Grid */}
          <div className="history-grid">
            {history.map((doc) => {
              const score = doc.stats?.score ?? 100;
              const level = getRiskLevel(score);
              const label = getRiskLabel(score);
              const colors = SCORE_COLORS[level];
              const isSelected = selectedDoc?._id === doc._id;
              const dateStr = new Date(doc.createdAt).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <div
                  key={doc._id}
                  id={`history-card-${doc._id}`}
                  className="history-card"
                  style={isSelected ? { borderColor: 'var(--green-primary)', background: 'var(--green-light)' } : {}}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="hc-date">{dateStr}</div>

                  <div className="hc-title">
                    {doc.originalText?.slice(0, 80)}
                    {doc.originalText?.length > 80 ? '...' : ''}
                  </div>

                  <div className="hc-stats">
                    <div className="hc-stat">
                      <span style={{ color: 'var(--red)' }}>●</span> {doc.stats?.total || 0} detected
                    </div>
                    <div className="hc-stat">
                      <span style={{ color: 'var(--green-primary)' }}>●</span> {doc.stats?.redacted || 0} redacted
                    </div>
                    {doc.stats?.destination && (
                      <div className="hc-stat">
                        <span>→</span> {doc.stats.destination}
                      </div>
                    )}
                  </div>

                  <div className="hc-score">
                    <span style={{ fontSize: '0.72rem', color: colors.text, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {score}/100
                    </span>
                    <div className="hc-score-bar">
                      <div
                        className="hc-score-fill"
                        style={{ width: `${score}%`, background: colors.bar }}
                      />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{label}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: 'auto' }}
                      onClick={(e) => handleDelete(doc._id, e)}
                      id={`delete-${doc._id}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Document Detail */}
          {selectedDoc && (
            <div style={{ position: 'sticky', top: 80, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Document Inspection</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedDoc(null)}
                    id="close-detail-btn"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Score pill */}
                  {selectedDoc.stats?.score !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        padding: '4px 14px', borderRadius: 'var(--radius-full)',
                        background: SCORE_COLORS[getRiskLevel(selectedDoc.stats.score)].bar,
                        color: 'white', fontSize: '0.78rem', fontWeight: 700,
                      }}>
                        Privacy Score: {selectedDoc.stats.score}/100
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {getRiskLabel(selectedDoc.stats.score)}
                      </span>
                    </div>
                  )}

                  {/* Original */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Original Text
                    </div>
                    <div className="doc-viewer" style={{ maxHeight: 160 }}>
                      {selectedDoc.originalText}
                    </div>
                  </div>

                  {/* Redacted */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Redacted Output
                    </div>
                    <div className="doc-viewer" style={{ maxHeight: 160, color: 'var(--green-primary)' }}>
                      {selectedDoc.redactedText}
                    </div>
                  </div>

                  {/* PII Tags */}
                  {selectedDoc.detectedPII?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        PII Detected
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedDoc.detectedPII.map((pii, i) => (
                          <span
                            key={i}
                            className={`pii-type-badge badge-${pii.type || 'DEFAULT'}`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {pii.type}: {pii.text?.slice(0, 20)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={handleCopy}
                    id="copy-history-btn"
                  >
                    {copyMsg || '📋 Copy Redacted Text'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
