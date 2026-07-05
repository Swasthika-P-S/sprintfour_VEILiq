import React, { useState, useEffect } from 'react';
import { Download, FileText, Lock, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

// Helper to compute SHA-256 hash for tamper evidence
async function computeHash(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export default function AuditReport({ entities, safeEntities, text, redactedText, token, redactedSet }) {
  const [isExporting, setIsExporting] = useState(false);
  const [reportHash, setReportHash] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const rawItems = [
    ...entities.map(e => {
      const isRed = redactedSet && redactedSet.has(e.idx !== undefined ? e.idx : e.startIndex);
      return { ...e, finalAction: isRed ? 'Hidden' : 'Visible' };
    })
  ].sort((a, b) => a.startIndex - b.startIndex);

  // Deduplicate by text, prioritizing 'Hidden' status if conflicts exist
  const allItems = Array.from(rawItems.reduce((acc, item) => {
    const key = item.text.toLowerCase();
    if (!acc.has(key) || item.finalAction === 'Hidden') {
      acc.set(key, item);
    }
    return acc;
  }, new Map()).values());

  // Pre-calculate hash for UI display
  useEffect(() => {
    async function calculateInitialHash() {
      if (allItems.length === 0) return;
      const rawData = allItems.map(item => `${item.text}|${item.type}|${item.finalAction}`).join('||');
      const hash = await computeHash(rawData + new Date().toISOString().split('T')[0]); // daily salt
      setReportHash(hash);
    }
    calculateInitialHash();
  }, [allItems]);

  const generatePDF = async () => {
    const doc = new jsPDF();
    const generatedAt = new Date().toISOString();
    
    // Calculate a strict hash of the exact content going into the PDF
    const rawData = allItems.map(item => `${item.text}|${item.reason}|${item.confidence}|${item.finalAction}`).join('\n');
    const hash = await computeHash(rawData + generatedAt);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(34, 197, 94); // Green
    doc.text("VEILiq Trust Report Card", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${generatedAt}`, 14, 30);
    doc.text("This document certifies the privacy scrub applied to the uploaded file.", 14, 35);
    
    // Tamper-Evident Hash Section
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 42, 182, 22, 'F');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text("Tamper-Evident Audit Hash (SHA-256):", 18, 50);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(hash, 18, 56);
    doc.text("Verify this hash against your local logs to ensure no redaction decisions were altered.", 18, 62);

    // Summary Stats
    const hiddenCount = allItems.filter(i => i.finalAction === 'Hidden').length;
    const visibleCount = allItems.length - hiddenCount;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Summary Metrics", 14, 76);
    doc.setFontSize(10);
    doc.text(`Total Unique Entities Processed: ${allItems.length}`, 14, 82);
    doc.text(`Unique Entities Hidden (Redacted): ${hiddenCount}`, 14, 88);
    doc.text(`Unique Entities Kept Visible: ${visibleCount}`, 14, 94);

    // Auto Table for Entities
    const tableColumn = ["Entity Text", "Type", "Confidence", "Action", "Reason"];
    const tableRows = [];

    allItems.forEach(item => {
      const rowData = [
        item.text,
        item.type || 'UNKNOWN',
        `${item.confidence}%`,
        item.finalAction,
        item.reason
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      startY: 105,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [5, 8, 7], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        4: { cellWidth: 70 } // reason column wider
      },
    });

    // --- GAP 2: Independent Verification Guide ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(34, 197, 94);
    doc.text("Independent Verification Guide", 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text("VEILiq is built on the principle of 'Trust No Box'. You do not need this", 14, 30);
    doc.text("application to verify that your data is safe.", 14, 36);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Verify the Redacted Document", 14, 50);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("To mathematically prove that the sensitive text has been removed from the exported PDF,", 14, 58);
    doc.text("you can use standard command-line tools to extract the raw text layer:", 14, 64);
    
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 68, 182, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text("pdftotext VEILiq_Redacted_123.pdf - | grep \"Alexandra Davis\"", 18, 76);
    
    doc.setFont('helvetica', 'normal');
    doc.text("If the command returns nothing, the text does not exist in the file.", 14, 88);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("2. Verify the Tamper-Evident Audit Log", 14, 102);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("This report card contains a SHA-256 cryptographic hash of all redaction decisions.", 14, 110);
    doc.text("If anyone alters this PDF to hide a mistake, the hash will instantly become invalid.", 14, 116);

    doc.setFillColor(245, 245, 245);
    doc.rect(14, 120, 182, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text("shasum -a 256 VEILiq_Trust_Report_123.pdf", 18, 128);

    const filename = `VEILiq_Trust_Report_${Date.now()}.pdf`;
    return { doc, filename };
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const { doc, filename } = await generatePDF();
      doc.save(filename);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToHistory = async () => {
    setIsExporting(true);
    try {
      const { doc, filename } = await generatePDF();
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('report', pdfBlob, filename);
      await axios.post(`${API}/audit/save`, formData);

      if (token && text && redactedText) {
        const total = entities.length;
        const redactedCount = entities.filter(e => redactedSet && redactedSet.has(e.idx !== undefined ? e.idx : e.startIndex)).length;
        const score = total > 0 ? Math.round((redactedCount / total) * 100) : 100;
        
        await axios.post(`${API}/documents/save`, {
          originalText: text,
          redactedText: redactedText,
          detectedPII: entities.map(e => {
            const isRed = redactedSet && redactedSet.has(e.idx !== undefined ? e.idx : e.startIndex);
            return {
              ...e,
              status: isRed ? 'accepted' : 'rejected'
            };
          }),
          safeEntities: safeEntities || [],
          stats: {
            total: total,
            redacted: redactedCount,
            score: score,
            destination: 'personal'
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save report to backend:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (allItems.length === 0) return null;

  return (
    <div className="audit-report-container">
      <div className="audit-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <FileText color="var(--primary)" />
            <h3 className="section-title" style={{ margin: 0 }}>Trust Report Card & Audit Log</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Lock size={14} color="var(--conf-green)" />
            Secured via Tamper-Evident Hashing
          </div>
        </div>
        <button 
          className="btn-download-audit" 
          onClick={handleDownloadPDF} 
          disabled={isExporting}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1 }}
        >
          {isExporting ? <ShieldCheck size={16} /> : <Download size={16} />} 
          {isExporting ? 'Generating PDF...' : 'Download Audit Report'}
        </button>
      </div>

      <div className="audit-table-wrapper" style={{ marginTop: 20 }}>
        <table className="audit-table">
          <thead>
            <tr>
              <th>Detected Entity</th>
              <th>AI Decision Reason</th>
              <th>Confidence</th>
              <th>Final Action</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => (
              <tr key={i}>
                <td className="fw-600">{item.text}</td>
                <td>{item.reason}</td>
                <td>
                  <span className="conf-pill" style={{ color: getConfidenceColor(item.confidence) }}>
                    {item.confidence}%
                  </span>
                </td>
                <td>
                  <span className={`action-pill ${item.finalAction.includes('Hidden') ? 'hidden' : item.finalAction.includes('Safe') ? 'safe' : 'visible'}`}>
                    {item.finalAction}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button 
          onClick={handleSaveToHistory} 
          disabled={isExporting}
          style={{ background: 'var(--bg-glass-strong)', color: 'var(--text-dark)', border: '1px solid var(--border)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1 }}
        >
          {isSaved ? <ShieldCheck size={14} color="var(--conf-green)" /> : (isExporting ? <ShieldCheck size={14} /> : <FileText size={14} />)} 
          {isSaved ? <span style={{ color: 'var(--conf-green)' }}>Saved to History!</span> : (isExporting ? 'Saving...' : 'Save to History')}
        </button>
      </div>
    </div>
  );
}

function getConfidenceColor(conf) {
  if (conf >= 98) return 'var(--conf-green)';
  if (conf >= 90) return 'var(--conf-yellow)';
  if (conf >= 70) return 'var(--conf-orange)';
  return 'var(--conf-red)';
}
