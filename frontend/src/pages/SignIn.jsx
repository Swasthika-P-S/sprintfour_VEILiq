import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/auth/login`, form);
      login({ _id: data._id, name: data.name, email: data.email, isMinor: data.isMinor }, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1" />
        <div className="auth-blob blob-2" />
        <div className="auth-blob blob-3" />
        <div className="auth-blob blob-4" />
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="var(--green-primary)" opacity="0.12" />
            <path d="M16 6C11.6 6 8 9.6 8 14v2c0 1.1-.9 2-2 2v2h20v-2c-1.1 0-2-.9-2-2v-2c0-4.4-3.6-8-8-8zm0 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill="var(--green-primary)" />
          </svg>
          Privacy<span className="auth-logo-dot">Lens</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your secure workspace</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-group">
            <label htmlFor="signin-email">Email address</label>
            <input
              id="signin-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="field-group">
            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
        <p className="auth-privacy-note">
          Your data is encrypted and never shared without your consent.
        </p>
      </div>
    </div>
  );
}
