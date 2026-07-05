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

  const handleDownload = (doc) => {
    const timestamp = new Date(doc.createdAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `redacted_${timestamp}.txt`;
    const blob = new Blob([doc.redactedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
              const total = doc.stats?.total || 0;
              const redacted = doc.stats?.redacted || 0;
              const score = total > 0 ? Math.round((redacted / total) * 100) : 100;
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
              
              {/* Header & Score Card */}
              <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-dark)', fontSize: '1.1rem', fontWeight: 600 }}>Analysis Details</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(selectedDoc.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDoc(null)}
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    ✕ Close
                  </button>
                </div>

                {selectedDoc.stats?.score !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                    <div style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: SCORE_COLORS[getRiskLevel(selectedDoc.stats.score)].bar,
                      color: 'white', fontSize: '0.9rem', fontWeight: 700,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}>
                      Score: {selectedDoc.stats.score}/100
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-faint)', fontWeight: 600 }}>Privacy Level</span>
                      <span style={{ fontSize: '0.9rem', color: SCORE_COLORS[getRiskLevel(selectedDoc.stats.score)].text, fontWeight: 600 }}>
                        {getRiskLabel(selectedDoc.stats.score)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Redacted Output Card */}
              <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Redacted Output
                  </div>
                  <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                    {copyMsg || 'Copy Text'}
                  </button>
                </div>
                <div style={{ 
                  maxHeight: 180, overflowY: 'auto', padding: 16, 
                  background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', 
                  borderRadius: 12, fontSize: '0.85rem', color: 'var(--text-dark)', lineHeight: 1.6
                }}>
                  {selectedDoc.redactedText}
                </div>
              </div>

              {/* Original Text Card */}
              <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Original Text
                </div>
                <div style={{ 
                  maxHeight: 120, overflowY: 'auto', padding: 16, 
                  background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', 
                  borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-faint)', lineHeight: 1.5
                }}>
                  {selectedDoc.originalText}
                </div>
              </div>

              {/* PII Tags */}
              {selectedDoc.detectedPII?.length > 0 && (
                <div style={{ padding: 20, borderRadius: 16, background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Entities Handled
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedDoc.detectedPII.map((pii, i) => {
                      const isHidden = pii.status === 'accepted';
                      return (
                        <span key={i} style={{ 
                          padding: '4px 10px', 
                          background: isHidden ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)',
                          color: isHidden ? 'var(--green-primary)' : 'var(--conf-orange)',
                          border: `1px solid ${isHidden ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)'}`,
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 500,
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <strong style={{ opacity: 0.8 }}>{pii.type}</strong> {pii.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Download Action */}
              <button
                onClick={() => handleDownload(selectedDoc)}
                style={{ 
                  width: '100%', padding: '14px', borderRadius: 12, 
                  background: 'var(--primary)', color: 'white', border: 'none', 
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                }}
              >
                ⬇ Download Redacted Document
              </button>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
