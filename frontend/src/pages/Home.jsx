import React, { useState } from 'react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import PrivacyScore, { computePrivacyScore } from '../components/PrivacyScore';
import PrivacyCertificate from '../components/PrivacyCertificate';
import PrivacySimulation from '../components/PrivacySimulation';
import ContextSelector, { CONTEXTS } from '../components/ContextSelector';

import { useAuth } from '../context/AuthContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const PII_TYPE_COLORS = {
  NAME: 'badge-NAME', EMAIL: 'badge-EMAIL', PHONE: 'badge-PHONE',
  PAN: 'badge-PAN', AADHAAR: 'badge-AADHAAR', ADDRESS: 'badge-ADDRESS',
  DOB: 'badge-DOB', IFSC: 'badge-IFSC', PINCODE: 'badge-PINCODE',
};

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { token } = useAuth();
  const { lang, t } = useLanguage();
  // Map UI language code to full name for Gemini
  const langName = LANGUAGES.find(l => l.code === lang)?.label || 'English';

  // Input state
  const [inputTab, setInputTab] = useState('paste'); // 'paste' | 'upload'
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  // Analysis state
  const [entities, setEntities] = useState([]);
  const [redactedSet, setRedactedSet] = useState(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  // Translation state
  const [translatedText, setTranslatedText] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [viewMode, setViewMode] = useState('original'); // 'original' | 'translated'
  const [manualRedactInput, setManualRedactInput] = useState('');

  // Simulation state
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const [context, setContext] = useState('healthcare');
  const [showCertificate, setShowCertificate] = useState(false);
  const [confirmEntity, setConfirmEntity] = useState(null); // { idx, type: 'ignore' | 'redact' }
  const [ignoredSet, setIgnoredSet] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  // ── File Upload result handler ──
  const handleFileResult = (data) => {
    setText(data.text);
    setFileName(data.filename);
    setEntities(data.entities || []);
    setRedactedSet(new Set());
    setIgnoredSet(new Set());
    setTranslatedText(null);
    setViewMode('original');
    setSimulationResult(null);
    setAnalyzed(true);
    addToast(`${data.filename} processed — ${data.entities?.length || 0} PII items found.`);
  };

  // ── Analyze text ──
  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setAnalyzing(true);
    setAnalyzed(false);
    setRedactedSet(new Set());
    setIgnoredSet(new Set());
    setTranslatedText(null);
    setViewMode('original');
    setSimulationResult(null);
    try {
      const { data } = await axios.post(
        `${API}/analyze`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEntities(data.entities || []);
      setAnalyzed(true);
      if ((data.entities || []).length === 0) {
        addToast('No PII detected — document looks clean!', 'info');
      } else {
        addToast(`${data.entities.length} PII item${data.entities.length !== 1 ? 's' : ''} detected.`, 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Redact item ──
  const requestToggleRedact = (idx) => {
    if (redactedSet.has(idx)) {
      // If it's redacted, confirm before exposing data
      setConfirmEntity({ idx, type: 'unredact' });
    } else {
      // If not redacted, redact it directly
      toggleRedact(idx);
    }
  };

  const requestIgnore = (idx) => {
    // Confirm before ignoring/keeping a suggestion
    setConfirmEntity({ idx, type: 'ignore' });
  };

  const toggleRedact = (idx) => {
    setRedactedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setIgnoredSet((prev) => {
      const next = new Set(prev);
      next.delete(idx); // remove from ignored if we are redacting it
      return next;
    });
    setConfirmEntity(null);
  };

  const toggleIgnore = (idx) => {
    setIgnoredSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
    setRedactedSet((prev) => {
      const next = new Set(prev);
      next.delete(idx); // remove from redacted if we are ignoring it
      return next;
    });
    setConfirmEntity(null);
  };

  const redactAll = () => {
    const newRedacted = new Set();
    entities.forEach((_, i) => {
      if (!ignoredSet.has(i)) newRedacted.add(i);
    });
    setRedactedSet(newRedacted);
  };
  const clearAll = () => {
    setRedactedSet(new Set());
    setIgnoredSet(new Set());
  };

  // ── Build redacted text ──
  // NOTE: Backend returns startIndex/endIndex (not start/end)
  const buildRedactedText = () => {
    let result = text;
    const toRedact = entities
      .filter((_, i) => redactedSet.has(i))
      .sort((a, b) => (b.startIndex ?? b.start ?? 0) - (a.startIndex ?? a.start ?? 0)); // reverse order so slicing stays valid
    for (const e of toRedact) {
      const s = e.startIndex ?? e.start ?? 0;
      const en = e.endIndex ?? e.end ?? 0;
      let mask;
      if (e.type === 'CUSTOM') {
        mask = '█████';
      } else {
        mask = `[█ ${e.type}]`;
      }
      result = result.slice(0, s) + mask + result.slice(en);
    }
    return result;
  };

  // ── Interactive clickable document segments ──
  const buildDocSegments = () => {
    if (!entities.length) return [{ text, idx: null }];
    const sorted = [...entities]
      .map((e, idx) => ({ ...e, idx }))
      .sort((a, b) => (a.startIndex ?? a.start ?? 0) - (b.startIndex ?? b.start ?? 0));
    const segments = [];
    let cursor = 0;
    for (const e of sorted) {
      const s = e.startIndex ?? e.start ?? 0;
      const en = e.endIndex ?? e.end ?? 0;
      if (s > cursor) {
        segments.push({ text: text.slice(cursor, s), idx: null });
      }
      if (!ignoredSet.has(e.idx)) {
        segments.push({
          text: text.slice(s, en),
          idx: e.idx,
          isRedacted: redactedSet.has(e.idx),
          type: e.type
        });
      } else {
        // If ignored, just push as normal text without interaction
        segments.push({ text: text.slice(s, en), idx: null });
      }
      cursor = en;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor), idx: null });
    return segments;
  };

  const escapeHtml = (s = '') =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── Helper to get downloadable content ──
  const getOutputContent = () => {
    let content = viewMode === 'translated' ? translatedText : buildRedactedText();
    if (simulationResult) {
      content += '\n\n' + '='.repeat(40) + '\n';
      content += 'PRIVACY SIMULATION REPORT\n';
      content += '='.repeat(40) + '\n';
      content += `Risk Level: ${simulationResult.riskLevel} (${simulationResult.confidence}%)\n`;
      if (simulationResult.suggestions && simulationResult.suggestions.length > 0) {
        content += `\nFurther Recommendations (Mosaic Effect Prevention):\n`;
        simulationResult.suggestions.forEach((s, i) => {
          content += `- ${s}\n`;
        });
      }
    }
    return content;
  };

  // ── Copy redacted ──
  const handleCopy = () => {
    const textToCopy = getOutputContent();
    navigator.clipboard.writeText(textToCopy);
    addToast(`${viewMode === 'translated' ? 'Translated' : 'Redacted'} text copied!`);
  };

  // ── Download redacted doc ──
  const handleDownload = () => {
    const content = getOutputContent();
    const label = viewMode === 'translated' ? `translated_${langName.toLowerCase()}` : 'redacted';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veiliq_${label}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Document downloaded successfully!');
  };

  // ── Translate ──
  const handleTranslate = async () => {
    if (translating) return;
    setTranslating(true);
    try {
      const redacted = buildRedactedText();
      const { data } = await axios.post(
        `${API}/analyze/translate`,
        { text: redacted, targetLanguage: langName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTranslatedText(data.translatedText);
      setViewMode('translated');
      addToast(`Document translated to ${langName} safely!`, 'success');
    } catch (err) {
      addToast('Translation failed. Make sure your Gemini API key is valid.', 'error');
    } finally {
      setTranslating(false);
    }
  };

  // ── Simulate Privacy ──
  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimulationResult(null);
    try {
      const redacted = buildRedactedText();
      const contextLabel = CONTEXTS.find((c) => c.id === context)?.label || context;
      const { data } = await axios.post(
        `${API}/analyze/simulate`,
        { text: redacted, context: contextLabel },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSimulationResult(data.simulation);
      addToast('Privacy simulation completed successfully!', 'success');
    } catch (err) {
      addToast('Simulation failed. Make sure your Gemini API key is valid.', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // ── Save to history ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const redactedText = buildRedactedText();
      const score = computePrivacyScore(entities);
      await axios.post(
        `${API}/documents/save`,
        {
          originalText: text,
          redactedText,
          detectedPII: entities,
          stats: {
            total: entities.length,
            redacted: redactedSet.size,
            score,
            destination: context,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast('Analysis saved to history.');
    } catch {
      addToast('Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Certificate ──
  const handleCertificate = () => setShowCertificate(true);

  // ── Apply Policy Template ──
  const handleApplyPolicy = (policy) => {
    if (!analyzed || entities.length === 0) {
      addToast('Analyze a document first before applying a policy.', 'error');
      return;
    }
    // Build type sets for each category
    const hideTypes = new Set(
      (policy.alwaysHide || []).flatMap((f) => f.piiTypes).map(t => t.toUpperCase())
    );
    const keepTypes = new Set(
      (policy.keep || []).flatMap((f) => f.piiTypes).map(t => t.toUpperCase())
    );

    const newRedactedSet = new Set(redactedSet);
    const newIgnoredSet = new Set(ignoredSet);
    let hidden = 0;
    let revealed = 0;
    entities.forEach((e, idx) => {
      const et = (e.type || '').toUpperCase();
      if (hideTypes.has(et)) {
        if (!newRedactedSet.has(idx)) {
          newRedactedSet.add(idx);
          hidden++;
        }
        newIgnoredSet.delete(idx);
      } else if (keepTypes.has(et)) {
        if (newRedactedSet.has(idx)) {
          newRedactedSet.delete(idx);
          revealed++;
        }
        newIgnoredSet.add(idx);
      }
    });

    setRedactedSet(newRedactedSet);
    setIgnoredSet(newIgnoredSet);
    const parts = [];
    if (hidden > 0) parts.push(`${hidden} hidden`);
    if (revealed > 0) parts.push(`${revealed} revealed`);
    addToast(
      parts.length > 0
        ? `✓ "${policy.label}" policy applied — ${parts.join(', ')}.`
        : `"${policy.label}" policy applied. No changes needed.`,
      'success'
    );
  };

  // ── Manual Redaction ──
  const handleManualRedact = (e) => {
    e.preventDefault();
    if (!manualRedactInput.trim()) return;
    const term = manualRedactInput.trim();
    let startIndex = 0;
    let foundCount = 0;
    const newEntities = [...entities];
    const newRedactedSet = new Set(redactedSet);

    while ((startIndex = text.toLowerCase().indexOf(term.toLowerCase(), startIndex)) > -1) {
      const termEnd = startIndex + term.length;
      // Check for overlap with existing entity using startIndex/endIndex
      const overlap = newEntities.find(ent => {
        const s = ent.startIndex ?? ent.start ?? 0;
        const en = ent.endIndex ?? ent.end ?? 0;
        return startIndex < en && termEnd > s;
      });
      if (!overlap) {
        const newEntity = {
          text: text.substring(startIndex, termEnd),
          type: 'CUSTOM',
          startIndex: startIndex,
          endIndex: termEnd,
          confidence: 100,
          reason: 'Manually redacted by user',
        };
        const idx = newEntities.length;
        newEntities.push(newEntity);
        newRedactedSet.add(idx);
        foundCount++;
      }
      startIndex += term.length;
    }

    if (foundCount > 0) {
      setEntities(newEntities);
      setRedactedSet(newRedactedSet);
      addToast(`Manually redacted ${foundCount} instance(s) of "${term}".`);
    } else {
      addToast(`"${term}" not found or already redacted.`, 'info');
    }
    setManualRedactInput('');
  };

  const score = computePrivacyScore(analyzed ? entities : [], context);
  const destLabel = CONTEXTS.find((c) => c.id === context)?.label;

  return (
    <>
      <Toast toasts={toasts} />

      {/* Confirmation Modal */}
      {confirmEntity !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 450, padding: 24, boxShadow: 'var(--shadow-xl)' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-dark)', fontSize: '1.1rem', marginBottom: 16 }}>
              {confirmEntity.type === 'unredact' ? 'Remove Redaction?' : 'Ignore Suggestion?'}
            </h3>
            <p style={{ color: 'var(--text-body)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {confirmEntity.type === 'unredact' 
                ? 'Are you sure you want to un-redact and expose this item in the document?' 
                : 'Are you sure you want to ignore this AI suggestion and keep the text visible?'}
            </p>
            <div style={{ 
              background: 'var(--bg-input)', padding: 12, borderRadius: 'var(--radius-sm)',
              marginTop: 12, marginBottom: 24, border: '1px solid var(--border)' 
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>
                {entities[confirmEntity.idx]?.text}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {entities[confirmEntity.idx]?.reason || 'Detected as sensitive information.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmEntity(null)}>Cancel</button>
              {confirmEntity.type === 'unredact' ? (
                <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => toggleIgnore(confirmEntity.idx)}>Remove Redaction</button>
              ) : (
                <button className="btn btn-primary" style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => toggleIgnore(confirmEntity.idx)}>Ignore Suggestion</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCertificate && (
        <PrivacyCertificate
          stats={{
            originalCount: entities.length,
            redactedCount: redactedSet.size,
            remainingCount: entities.length - redactedSet.size,
            score: computePrivacyScore(
              entities.filter((_, i) => !redactedSet.has(i)),
              context
            ),
            destination: destLabel,
            timestamp: Date.now(),
          }}
          onClose={() => setShowCertificate(false)}
        />
      )}

      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <h1>VEILiq <span className="gradient-text">— Think Before You Share</span></h1>
          <p>Upload or paste any document. VEILiq will detect sensitive information and help you share safely.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: analyzed ? '1fr 380px' : '1fr', gap: 24 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* File Upload Area */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-body">

                {/* Tabs */}
                <div className="upload-tabs">
                  <button
                    id="tab-paste"
                    className={`upload-tab${inputTab === 'paste' ? ' active' : ''}`}
                    onClick={() => setInputTab('paste')}
                  >
                    {t.tabPaste}
                  </button>
                  <button
                    id="tab-upload"
                    className={`upload-tab${inputTab === 'upload' ? ' active' : ''}`}
                    onClick={() => setInputTab('upload')}
                  >
                    {t.tabUpload}
                  </button>
                </div>

                {inputTab === 'paste' ? (
                  <div className="field-group">
                    <textarea
                      id="text-input"
                      placeholder={t.placeholderInput}
                      value={text}
                      onChange={(e) => { setText(e.target.value); setAnalyzed(false); }}
                      rows={10}
                    />
                  </div>
                ) : (
                  <FileUpload
                    onResult={handleFileResult}
                    onError={(msg) => addToast(msg, 'error')}
                  />
                )}

                {inputTab === 'paste' && (
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      id="analyze-btn"
                      className="btn btn-primary"
                      onClick={handleAnalyze}
                      disabled={analyzing || !text.trim()}
                    >
                      {analyzing ? <><span className="btn-spinner" /> {t.btnAnalyzing}</> : t.btnAnalyze}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Viewer (after analysis) */}
            {analyzed && text && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    📄 {t.previewTitle}
                    {fileName && (
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'none', letterSpacing: 0 }}>
                        — {fileName}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <form onSubmit={handleManualRedact} style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder={t.placeholderHide}
                        value={manualRedactInput}
                        onChange={(e) => setManualRedactInput(e.target.value)}
                        style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <button type="submit" className="btn btn-secondary btn-sm" disabled={!manualRedactInput.trim()}>
                        {t.btnHideWord}
                      </button>
                    </form>
                    <div style={{ height: '24px', width: '1px', background: 'var(--border)' }} />
                    <button className="btn btn-secondary btn-sm" onClick={redactAll} id="redact-all-btn">{t.btnRedactAll}</button>
                    <button className="btn btn-ghost btn-sm" onClick={clearAll} id="clear-all-btn">{t.btnClear}</button>
                  </div>
                </div>
                <div className="card-body">
                  {translatedText && (
                    <div className="upload-tabs" style={{ marginBottom: 12, display: 'inline-flex', width: 'auto' }}>
                      <button
                        className={`upload-tab${viewMode === 'original' ? ' active' : ''}`}
                        onClick={() => setViewMode('original')}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        {t.viewOriginal}
                      </button>
                      <button
                        className={`upload-tab${viewMode === 'translated' ? ' active' : ''}`}
                        onClick={() => setViewMode('translated')}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        {t.viewTranslated}
                      </button>
                    </div>
                  )}
                  {viewMode === 'translated' ? (
                    <div className="doc-viewer" style={{ color: 'var(--green-primary)', whiteSpace: 'pre-wrap' }}>
                      {translatedText}
                    </div>
                  ) : (
                    <div className="doc-viewer">
                      {buildDocSegments().map((seg, i) =>
                        seg.idx === null ? (
                          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.text}</span>
                        ) : (
                          <mark
                            key={i}
                            className={seg.isRedacted ? 'redacted-mark' : ''}
                            title={seg.isRedacted ? `Click to un-redact (${seg.type})` : `Click to redact (${seg.type})`}
                            onClick={() => requestToggleRedact(seg.idx)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            {seg.text}
                          </mark>
                        )
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={handleCopy} id="copy-btn">
                      {t.btnCopy}
                    </button>
                    <button className="btn btn-primary" onClick={handleDownload} id="download-btn">
                      {t.btnDownload}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleSimulate}
                      disabled={simulating}
                    >
                      {simulating ? t.btnSimulating : t.btnSimulate}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={handleSave}
                      disabled={saving}
                      id="save-btn"
                    >
                      {saving ? t.btnSaving : t.btnSave}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={handleCertificate}
                      id="certificate-btn"
                    >
                      {t.btnCertificate}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(simulating || simulationResult) && (
              <PrivacySimulation
                simulation={simulationResult}
                loading={simulating}
                onSimulate={handleSimulate}
              />
            )}
          </div>

          {/* Right Column (shown after analysis) */}
          {analyzed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Privacy Score */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">{t.scoreTitle}</div>
                </div>
                <div className="card-body">
                  <PrivacyScore
                    entities={entities.filter((_, i) => !redactedSet.has(i))}
                    redactedCount={redactedSet.size}
                    context={context}
                  />
                </div>
              </div>



              {/* Detected PII (Active / Unredacted) */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    Active AI Suggestions
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                      background: 'var(--red-bg)', color: 'var(--red)',
                      fontSize: '0.72rem', fontWeight: 700,
                    }}>
                      {entities.filter((_, i) => !redactedSet.has(i) && !ignoredSet.has(i)).length}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  {entities.filter((_, i) => !redactedSet.has(i) && !ignoredSet.has(i)).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      No active suggestions remaining.
                    </div>
                  ) : (
                    <div className="pii-list">
                      {entities.map((e, idx) => {
                        if (redactedSet.has(idx) || ignoredSet.has(idx)) return null;
                        return (
                          <div key={idx} className="pii-item">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={`pii-type-badge ${PII_TYPE_COLORS[e.type] || 'badge-DEFAULT'}`}>
                                    {e.type}
                                  </span>
                                  <span className="pii-text">{e.text}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--green-primary)' }}>{e.confidence || 100}% Match</span>
                                  {e.reason && ` — ${e.reason}`}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="pii-btn"
                                  onClick={() => requestToggleRedact(idx)}
                                  title="Redact this item"
                                  style={{ color: 'var(--green-primary)' }}
                                >
                                  🔒
                                </button>
                                <button
                                  className="pii-btn"
                                  onClick={() => requestIgnore(idx)}
                                  title="Ignore suggestion (Keep text)"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Handled PII (Redacted) */}
              {redactedSet.size > 0 && (
                <div className="card" style={{ marginTop: 24, opacity: 0.85 }}>
                  <div className="card-header">
                    <div className="card-title">
                      Redacted PII (Hidden)
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: 'var(--green-bg)', color: 'var(--green-primary)',
                        fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        {redactedSet.size}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="pii-list">
                      {entities.map((e, idx) => {
                        if (!redactedSet.has(idx)) return null;
                        return (
                          <div key={idx} className="pii-item redacted">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={`pii-type-badge ${PII_TYPE_COLORS[e.type] || 'badge-DEFAULT'}`}>
                                    {e.type}
                                  </span>
                                  <span className="pii-text" style={{ textDecoration: 'line-through' }}>{e.text}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--green-primary)' }}>{e.confidence || 100}% Match</span>
                                  {e.reason && ` — ${e.reason}`}
                                </div>
                              </div>
                              <button
                                className="pii-btn keep"
                                onClick={() => requestToggleRedact(idx)}
                                title="Remove redaction"
                              >
                                ↩
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Handled PII (Ignored) */}
              {ignoredSet.size > 0 && (
                <div className="card" style={{ marginTop: 24, opacity: 0.75 }}>
                  <div className="card-header">
                    <div className="card-title">
                      Ignored Suggestions (Kept)
                      <span style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-input)', color: 'var(--text-muted)',
                        fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        {ignoredSet.size}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="pii-list">
                      {entities.map((e, idx) => {
                        if (!ignoredSet.has(idx)) return null;
                        return (
                          <div key={idx} className="pii-item">
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={`pii-type-badge ${PII_TYPE_COLORS[e.type] || 'badge-DEFAULT'}`}>
                                    {e.type}
                                  </span>
                                  <span className="pii-text">{e.text}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--green-primary)' }}>{e.confidence || 100}% Match</span>
                                  {e.reason && ` — ${e.reason}`}
                                </div>
                              </div>
                              <button
                                className="pii-btn"
                                onClick={() => requestToggleRedact(idx)}
                                title="Redact this item instead"
                              >
                                🔒
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}



            </div>
          )}

        </div>
      </div>
    </>
  );
}
