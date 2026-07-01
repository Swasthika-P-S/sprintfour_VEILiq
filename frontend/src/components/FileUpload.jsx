import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

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
    <div style={{ padding: '8px' }}>
      <div
        className={`upload-zone premium-upload-zone ${dragOver ? 'drag-over' : ''}`}
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
          <div className="upload-progress-state">
            <div className="spinner-glow" />
            <div className="upload-progress-text">
              Securely processing <span style={{ color: 'var(--green-primary)' }}>{fileName}</span>...
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-percentage">{progress}%</div>
          </div>
        ) : (
          <div className="upload-empty-state">
            <div className="upload-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="feather-upload-cloud">
                <polyline points="16 16 12 12 8 16"></polyline>
                <line x1="12" y1="12" x2="12" y2="21"></line>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
                <polyline points="16 16 12 12 8 16"></polyline>
              </svg>
            </div>
            
            <h3 className="upload-title-premium">Drag & drop your document</h3>
            <p className="upload-subtitle-premium">
              Your Privacy, Your Control
            </p>
            
            <div className="upload-specs" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              Max 10MB file of .pdf, .txt
            </div>
            
            <button className="btn-upload-browse">
              Browse Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
