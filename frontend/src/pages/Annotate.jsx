import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, FileText, Loader2, ClipboardPaste, UploadCloud, ArrowRight, Send, X, MessageCircle, HelpCircle, Trash2, ShieldCheck, Download } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import FileUpload from '../components/FileUpload';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const TYPE_LABEL = (type) => {
  if (!type) return 'PII';
  const t = type.toUpperCase();
  const map = {
    PERSON: 'PERSON', NAME: 'PERSON',
    EMAIL: 'EMAIL', EMAIL_ADDRESS: 'EMAIL',
    PHONE: 'PHONE', PHONE_NUMBER: 'PHONE',
    ADDRESS: 'ADDRESS', LOCATION: 'LOCATION',
    DATE: 'DATE', DATE_TIME: 'DATE',
    ID: 'ID', ID_NUMBER: 'ID', GOVERNMENT_ID: 'ID',
    ACCOUNT: 'ACCOUNT', ACCOUNT_NUMBER: 'ACCOUNT',
    ORGANIZATION: 'ORG', ORG: 'ORG',
    DOB: 'DOB', MEDICAL: 'MEDICAL', FINANCIAL: 'FINANCIAL',
  };
  return map[t] || t;
};

const TYPE_COLOR = (type) => {
  return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.45)', text: '#f87171' };
};

const STEPS = [
  'Parsing document structure…',
  'Running PII pattern detection…',
  'Cross-referencing with semantic model…',
  'Preparing redaction preview…',
];

/* ──────────────────────────────────────────────────────────
   Mini floating popover shown on entity click or text select
────────────────────────────────────────────────────────── */
function EntityPopover({ entity, selection, onDismiss, onClose }) {
  if (!entity && !selection) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        width: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        background: entity ? TYPE_COLOR(entity.type).bg : 'rgba(148,163,184,0.08)',
      }}>
        {entity ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: TYPE_COLOR(entity.type).bg,
                border: `1px solid ${TYPE_COLOR(entity.type).border}`,
                color: TYPE_COLOR(entity.type).text,
                borderRadius: 5, padding: '2px 8px',
                fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em',
              }}>
                [{TYPE_LABEL(entity.type)}]
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '1.05rem' }}>
                {entity.text}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', paddingLeft: 16 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {entity.confidence}% confidence
              </span>
              <button 
                onClick={onDismiss} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <X size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.9rem' }}>
                "{selection?.slice(0, 30)}{selection?.length > 30 ? '…' : ''}"
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Not flagged
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginLeft: 16 }}>
              <X size={18} />
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

function AnnotatedRenderer({ text, entities, onEntityClick, onTextSelect }) {
  if (!text) return null;
  // Sort entities by start index, then by length (longest first)
  const sorted = [...entities].sort((a, b) => {
    if (a.startIndex === b.startIndex) {
      return b.endIndex - a.endIndex;
    }
    return a.startIndex - b.startIndex;
  });

  // Filter overlapping entities
  const nonOverlapping = [];
  let lastEnd = -1;
  for (const e of sorted) {
    if (e.startIndex >= lastEnd) {
      nonOverlapping.push(e);
      lastEnd = e.endIndex;
    }
  }

  const parts = [];
  let cursor = 0;

  nonOverlapping.forEach((entity, idx) => {
    const { startIndex: start, endIndex: end } = entity;
    if (start > cursor) {
      parts.push(
        <span key={`t${idx}`} style={{ color: 'var(--text-dark)' }}>
          {text.slice(cursor, start)}
        </span>
      );
    }
    const c = TYPE_COLOR(entity.type);
    parts.push(
      <span
        key={`e${idx}`}
        onClick={() => onEntityClick(entity)}
        style={{ display: 'inline', cursor: 'pointer' }}
        title={`Click to inspect: ${entity.text}`}
      >
        <span style={{
          textDecoration: 'line-through',
          textDecorationColor: c.text,
          textDecorationThickness: '2px',
          color: c.text,
          fontWeight: 500,
          borderRadius: 3,
          padding: '0 2px',
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = c.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {entity.text}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 4, padding: '1px 6px',
          fontSize: '0.72rem', fontWeight: 700, color: c.text,
          marginLeft: 4, verticalAlign: 'middle', letterSpacing: '0.04em',
        }}>
          [{TYPE_LABEL(entity.type)}]
        </span>
      </span>
    );
    cursor = end;
  });

  if (cursor < text.length) {
    parts.push(<span key="tail" style={{ color: 'var(--text-dark)' }}>{text.slice(cursor)}</span>);
  }

  return (
    <div
      onMouseUp={() => {
        const sel = window.getSelection();
        const selText = sel?.toString().trim();
        if (selText && selText.length > 2) onTextSelect(selText);
      }}
      style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '0.95rem', fontFamily: "'Inter', sans-serif", cursor: 'text' }}
    >
      {parts}
    </div>
  );
}

/* ──────────────────────────────
   Main Corpus Ingestion Page
────────────────────────────── */
export default function CorpusIngestion() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [rawText, setRawText] = useState('');
  const [filename, setFilename] = useState('');
  const [inputMode, setInputMode] = useState('upload');
  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Popover state
  const [popover, setPopover] = useState(null); // { type: 'entity'|'selection', entity?, selection? }

  const handleFileUploaded = (data) => {
    setRawText(data.text);
    setFilename(data.filename);
    setError(null);
    runIngestion(data.text, data.filename);
  };

  const runIngestion = async (raw, fname) => {
    const text = raw?.trim();
    if (!text) { setError('Please provide a document first.'); return; }
    setResult(null); setError(null); setProcessing(true); setStepIndex(0);
    const intervals = STEPS.map((_, i) => setTimeout(() => setStepIndex(i), i * 900));
    try {
      const { data } = await axios.post(`${API}/analyze`, { text }, { headers: { Authorization: `Bearer ${token}` } });
      intervals.forEach(clearTimeout);
      setResult({ ...data, text, filename: fname || 'document.txt' });
    } catch (err) {
      intervals.forEach(clearTimeout);
      setError(err.response?.data?.error || 'Ingestion failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismissEntity = (entity) => {
    setResult(prev => ({
      ...prev,
      entities: prev.entities.filter(e => e.startIndex !== entity.startIndex),
    }));
    setPopover(null);
  };

  const handleContinueToAnalyse = () => {
    navigate('/', {
      state: {
        corpusData: {
          text: result.text,
          filename: result.filename,
          entities: result.entities || [],
          safeEntities: result.safeEntities || [],
          suggested_aliases: result.suggested_aliases || [],
          conflicting_context: result.conflicting_context || [],
          fallbackMode: result.fallbackMode || false,
        },
      },
    });
  };

  const entityCount = result?.entities?.length || 0;
  const safeCount = result?.safeEntities?.length || 0;

  return (
    <div
      className="container"
      style={{ 
        maxWidth: 960, 
        margin: '0 auto',
        paddingTop: result ? 40 : 'max(40px, 10vh)', 
        paddingBottom: 80,
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: result ? 'flex-start' : 'center'
      }}
      onClick={(e) => {
        // Close popover on outside click
        if (popover && !e.target.closest('.entity-popover')) setPopover(null);
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 8, letterSpacing: '-0.02em', textAlign: 'center' }}>
            Corpus Ingestion
          </h1>
        </motion.div>
      </div>

      {/* Input Card */}
      {!result && !processing && (
        <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
          <motion.div className="glass-card" style={{ padding: 32 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          >
            <FileUpload onResult={handleFileUploaded} onError={msg => setError(msg)} />

            {error && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#f87171', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            
            {/* Footer Note */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)', fontSize: '0.8rem', justifyContent: 'center' }}>
              <ShieldCheck size={14} color="var(--primary)" />
              Your document is processed securely. Nothing is stored beyond your session.
            </div>
          </motion.div>
        </div>
      )}

      {/* Processing */}
      <AnimatePresence>
        {processing && (
          <motion.div className="glass-card" style={{ padding: 40, textAlign: 'center' }}
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          >
            <div className="spinner-glow" style={{ margin: '0 auto 24px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8 }}>
              Running Corpus Ingestion…
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={stepIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {STEPS[stepIndex]}
              </motion.div>
            </AnimatePresence>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= stepIndex ? 'var(--primary)' : 'var(--border-glass)', transition: 'background 0.4s' }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '8px 16px', color: 'var(--green-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                ✓ Ingestion Complete
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{entityCount}</span> PII entities detected
              </div>



              <button onClick={() => { setResult(null); setRawText(''); setFilename(''); setPopover(null); }}
                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: 8, padding: '6px 14px', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 }}>
                ↺ Start Over
              </button>
            </div>

            {/* Annotated Document */}
            <div className="glass-card" style={{ padding: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={14} />
                Annotated Corpus Output — {result.filename}
              </div>
              <AnnotatedRenderer
                text={result.text}
                entities={result.entities || []}
                onEntityClick={(entity) => setPopover({ type: 'entity', entity })}
                onTextSelect={(sel) => setPopover({ type: 'selection', selection: sel })}
              />
            </div>

            {/* CTA Row */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const sorted = [...(result.entities || [])].sort((a, b) => a.startIndex - b.startIndex);
                  let annotated = '';
                  let cursor = 0;
                  sorted.forEach(entity => {
                    annotated += result.text.slice(cursor, entity.startIndex);
                    annotated += `[${entity.text} → ${TYPE_LABEL(entity.type)}]`;
                    cursor = entity.endIndex;
                  });
                  annotated += result.text.slice(cursor);
                  const blob = new Blob([annotated], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `annotated_${result.filename.replace(/\.[^.]+$/, '')}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'transparent',
                  color: 'var(--primary)', border: '2px solid var(--primary)', borderRadius: 14,
                  padding: '16px 32px', fontWeight: 800, fontSize: '1.05rem',
                  cursor: 'pointer', letterSpacing: '-0.01em',
                }}
              >
                <Download size={20} /> Download Annotated
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleContinueToAnalyse}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'var(--primary)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '16px 32px', fontWeight: 800, fontSize: '1.05rem',
                  cursor: 'pointer', letterSpacing: '-0.01em',
                  boxShadow: '0 8px 32px rgba(52,211,153,0.25)',
                }}
              >
                Continue to Analyse <ArrowRight size={20} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Popover */}
      <AnimatePresence>
        {popover && (
          <div className="entity-popover">
            <EntityPopover
              entity={popover.type === 'entity' ? popover.entity : null}
              selection={popover.type === 'selection' ? popover.selection : null}
              onDismiss={() => handleDismissEntity(popover.entity)}
              onClose={() => setPopover(null)}
              entities={result?.entities || []}
              token={token}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
