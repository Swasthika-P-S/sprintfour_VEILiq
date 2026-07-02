import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, ChevronRight, CheckCircle2, XCircle, X, Target } from 'lucide-react';

// Ground-truth sample document
const SAMPLE_DOCUMENT = {
  text: `Patient Intake Form — Riverside Medical Center

Patient Name: Alexandra Davis
Date of Birth: 14 March 1987
Social Security Number: 412-78-9034
Home Address: 47 Birchwood Lane, Portland, OR 97201
Phone: (503) 842-1197
Email: adavis1987@gmail.com

Emergency Contact: James Davis (Spouse) — (503) 842-1190
Insurance Provider: BlueCross BlueShield
Policy Number: BCB-00441-XR

Attending Physician: Dr. Samuel Reeves, MD
Diagnosis: Type 2 Diabetes, Mild Hypertension
Medications: Metformin 500mg, Lisinopril 10mg

The patient works as a software engineer at Nexus Technologies in downtown Portland. 
She was referred by her previous physician at St. Luke's General Hospital.

Additional Notes: Patient is the sole proprietor of a custom woodworking shop on 12th Avenue.`,

  // Ground truth: exactly what SHOULD be detected
  groundTruth: [
    { text: 'Alexandra Davis', type: 'NAME' },
    { text: '14 March 1987', type: 'INDIRECT' },
    { text: '412-78-9034', type: 'SSN' },
    { text: '47 Birchwood Lane, Portland, OR 97201', type: 'ADDRESS' },
    { text: '(503) 842-1197', type: 'PHONE' },
    { text: 'adavis1987@gmail.com', type: 'EMAIL' },
    { text: 'James Davis', type: 'NAME' },
    { text: '(503) 842-1190', type: 'PHONE' },
    { text: 'BCB-00441-XR', type: 'INDIRECT' },
    { text: 'Dr. Samuel Reeves', type: 'NAME' },
    { text: 'Nexus Technologies', type: 'ORG' },
    { text: 'St. Luke\'s General Hospital', type: 'ORG' },
    { text: 'sole proprietor of a custom woodworking shop on 12th Avenue', type: 'INDIRECT' },
  ]
};

function computePrecisionRecall(detected, groundTruth) {
  const detectedTexts = new Set(detected.map(e => e.text.toLowerCase().trim()));
  const truthTexts = groundTruth.map(e => e.text.toLowerCase().trim());

  const tp = truthTexts.filter(t => detectedTexts.has(t)).length;
  const fp = detected.filter(e => !truthTexts.includes(e.text.toLowerCase().trim())).length;
  const fn = truthTexts.filter(t => !detectedTexts.has(t)).length;

  const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : 0;
  const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : 0;
  const f1 = precision + recall > 0 ? Math.round((2 * precision * recall) / (precision + recall)) : 0;

  const matched = truthTexts.filter(t => detectedTexts.has(t));
  const missed = truthTexts.filter(t => !detectedTexts.has(t));

  return { precision, recall, f1, tp, fp, fn, matched, missed };
}

export default function SandboxOnboarding({ onUseDocument }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);

  const handleUse = () => {
    onUseDocument(SAMPLE_DOCUMENT.text);
    setOpen(false);
  };

  // Show preview stats with hypothetical detection (simulated)
  const previewStats = computePrecisionRecall(
    SAMPLE_DOCUMENT.groundTruth.slice(0, 10), // simulate detecting 10/12
    SAMPLE_DOCUMENT.groundTruth
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="premium-sample-btn"
      >
        <FlaskConical size={14} />
        Try with Sample Doc
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
            }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ maxWidth: 680, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 28 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FlaskConical size={20} color="#A78BFA" />
                    <h3 style={{ color: 'var(--text-dark)', fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>Sandbox Onboarding</h3>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Build trust before uploading your real document. Use this sample patient record with known ground-truth PII to see exactly how accurate VEILiq is.
                  </p>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Ground truth table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.88rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} color="var(--primary)" />
                  Known PII in this document ({SAMPLE_DOCUMENT.groundTruth.length} entities)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SAMPLE_DOCUMENT.groundTruth.map((gt, i) => (
                    <div key={i} className="glass-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.85rem' }}>{gt.text}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{gt.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document preview */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-dark)', fontSize: '0.88rem', marginBottom: 8 }}>Document Preview</div>
                <div className="glass-box" style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7, maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {SAMPLE_DOCUMENT.text}
                </div>
              </div>

              <button
                onClick={handleUse}
                style={{
                  width: '100%', padding: '14px', background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                  border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s'
                }}
              >
                Load Sample Document & Start Analysis <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
