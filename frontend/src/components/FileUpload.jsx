import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

const ACCEPTED_TYPES = {
  'application/pdf': 'PDF',
  'text/plain': 'TXT',
};

export default function FileUpload({ onResult, onError }) {
  const { token } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const fileRef = useRef();

  const processFile = async (file) => {
    const typeLabel = ACCEPTED_TYPES[file.type];
    if (!typeLabel) {
      onError?.('Only PDF and TXT files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError?.('File must be under 10 MB.');
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await axios.post(`${API}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      onResult?.(data);
    } catch (err) {
      onError?.(err.response?.data?.error || 'Failed to process file. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        id="file-upload-zone"
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        aria-label="Upload file"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id="file-input"
        />

        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div className="spinner" />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-dark)', fontWeight: 600 }}>
              Processing {fileName}...
            </div>
            <div style={{
              width: '100%', maxWidth: 280, height: 6, background: 'var(--border)',
              borderRadius: 'var(--radius-full)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'var(--green-primary)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{progress}%</div>
          </div>
        ) : (
          <>
            <span className="upload-icon">📄</span>
            <div className="upload-title">Drop your document here</div>
            <div className="upload-subtitle">
              Aadhaar, PAN, Passport, Medical Report, Bank Statement — any sensitive document
            </div>
            <div className="upload-types" style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              {Object.values(ACCEPTED_TYPES).map((t) => (
                <span key={t} className="type-badge">{t}</span>
              ))}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Max 10 MB</span>
            </div>
            <div style={{
              marginTop: 18, padding: '8px 18px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)', display: 'inline-block',
              fontSize: '0.8rem', fontWeight: 600, color: 'var(--green-primary)',
              cursor: 'pointer',
            }}>
              Browse Files
            </div>
          </>
        )}
      </div>
    </div>
  );
}
