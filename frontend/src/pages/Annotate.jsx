import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Annotate() {
  const [rawText, setRawText] = useState("Client: [[Renata Alvarez|name]]\nAccount Reference: [[SC-4471-AX|account]]\nDate of Birth: [[02/08/1983|dob]]\nBranch Office: [[Downtown Seattle|location]]\nInternal File Code: [[FX-9921|id]]");
  const [parsedChunks, setParsedChunks] = useState([]);
  const navigate = useNavigate();

  // Parse raw text into chunks (text strings or entity objects)
  useEffect(() => {
    const parseAnnotations = (text) => {
      const regex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
      const chunks = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Add preceding text
        if (match.index > lastIndex) {
          chunks.push({ type: 'text', content: text.substring(lastIndex, match.index) });
        }
        // Add annotation chunk
        chunks.push({
          type: 'annotation',
          text: match[1],
          label: match[2].toUpperCase(),
          raw: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        chunks.push({ type: 'text', content: text.substring(lastIndex) });
      }
      return chunks;
    };

    setParsedChunks(parseAnnotations(rawText));
  }, [rawText]);

  const removeAnnotation = (chunk) => {
    // Replace the exact raw match [[text|label]] with just the text
    const newText = rawText.substring(0, chunk.startIndex) + chunk.text + rawText.substring(chunk.endIndex);
    setRawText(newText);
  };

  const handleAnalyze = () => {
    // Generate clean text and entities
    let cleanText = '';
    const entities = [];
    
    parsedChunks.forEach(chunk => {
      if (chunk.type === 'text') {
        cleanText += chunk.content;
      } else if (chunk.type === 'annotation') {
        const startIndex = cleanText.length;
        cleanText += chunk.text;
        const endIndex = cleanText.length;
        
        entities.push({
          text: chunk.text,
          type: chunk.label,
          confidence: 100,
          reason: 'Manually annotated by user.',
          evidence: ['Human Annotation'],
          privacy_risk: 'Explicitly flagged',
          startIndex,
          endIndex,
          replacement: `[${chunk.label}-MANUAL]`,
          status: 'pending'
        });
      }
    });

    navigate('/', { 
      state: { 
        preAnnotatedData: {
          text: cleanText,
          entities,
          filename: 'annotated_document.txt'
        }
      }
    });
  };

  return (
    <div className="container" style={{ maxWidth: 1000, marginTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 12 }}>
          Annotate Document
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Input text with <code style={{background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:4}}>[[entity|type]]</code> tags or paste your pre-annotated document.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
        {/* Raw Input Box */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FileText size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)' }}>Raw Input</h2>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            style={{
              width: '100%',
              height: 200,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 8,
              padding: 16,
              color: 'var(--text-dark)',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
            placeholder="E.g. Client: [[Renata Alvarez|name]]"
          />
        </div>

        {/* Visual Preview */}
        <div className="glass-card" style={{ padding: 24, position: 'relative' }}>
          <div className="glow-orb" style={{ background: 'var(--primary)', top: -30, right: -30, width: 100, height: 100, opacity: 0.15 }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 16 }}>Parsed Preview</h2>
          
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: 8,
            padding: 24,
            minHeight: 120,
            whiteSpace: 'pre-wrap',
            lineHeight: '2',
            color: 'var(--text-dark)',
            fontSize: '1rem'
          }}>
            {parsedChunks.map((chunk, idx) => {
              if (chunk.type === 'text') {
                return <span key={idx}>{chunk.content}</span>;
              } else {
                return (
                  <span key={idx} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    margin: '0 4px',
                    fontWeight: 500,
                    color: 'var(--conf-red)'
                  }}>
                    <span style={{ textDecoration: 'line-through', marginRight: 8, opacity: 0.8 }}>{chunk.text}</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: 'var(--conf-red)', 
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                      marginRight: 6
                    }}>
                      [{chunk.label}]
                    </span>
                    <button
                      onClick={() => removeAnnotation(chunk)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--conf-red)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        marginLeft: 4,
                        opacity: 0.7
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = 1}
                      onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                    >
                      <X size={14} />
                    </button>
                  </span>
                );
              }
            })}
            {parsedChunks.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No text to preview.</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-btn"
              onClick={handleAnalyze}
              disabled={parsedChunks.length === 0}
              style={{
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              Analyze Annotated Document <ChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
