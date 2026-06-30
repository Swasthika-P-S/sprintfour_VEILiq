import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.PROD ? '/api' : 'http://localhost:7860/api';

function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function SignUp() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', dob: '', guardianName: '', guardianEmail: '', consent: false });
  const [age, setAge] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1=main, 2=guardian (if minor)

  useEffect(() => {
    if (form.dob) setAge(calculateAge(form.dob));
  }, [form.dob]);

  const isMinor = age !== null && age < 14; // We just use this to block now

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (isMinor) return setError('You must be at least 14 years old to register.');

    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, dob: form.dob };

      const { data } = await axios.post(`${API}/auth/register`, payload);
      login({ _id: data._id, name: data.name, email: data.email, isMinor: data.isMinor }, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Max DOB = today (can't be born in the future)
  const maxDob = new Date().toISOString().split('T')[0];
  // Min DOB = 100 years ago
  const minDob = new Date(new Date().getFullYear() - 100, 0, 1).toISOString().split('T')[0];

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-blob blob-1" />
        <div className="auth-blob blob-2" />
        <div className="auth-blob blob-3" />
        <div className="auth-blob blob-4" />
      </div>
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="var(--green-primary)" opacity="0.12" />
            <path d="M16 6C11.6 6 8 9.6 8 14v2c0 1.1-.9 2-2 2v2h20v-2c-1.1 0-2-.9-2-2v-2c0-4.4-3.6-8-8-8zm0 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" fill="var(--green-primary)" />
          </svg>
          Privacy<span className="auth-logo-dot">Lens</span>
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Protect your documents with AI-powered privacy</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-grid">
            <div className="field-group">
              <label htmlFor="signup-name">Full Name</label>
              <input id="signup-name" type="text" name="name" placeholder="Name: XYZ" value={form.name} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label htmlFor="signup-email">Email Address</label>
              <input id="signup-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="field-group">
              <label htmlFor="signup-dob">
                Date of Birth
                {age !== null && (
                  <span className={`age-badge ${isMinor ? 'age-badge--minor' : 'age-badge--adult'}`}>
                    {isMinor ? `Age ${age} — Minor` : `Age ${age}`}
                  </span>
                )}
              </label>
              <input id="signup-dob" type="date" name="dob" value={form.dob} onChange={handleChange} required min={minDob} max={maxDob} />
            </div>
            <div className="field-group">
              <label htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            <div className="field-group field-group--full">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <input id="signup-confirm" type="password" name="confirmPassword" placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} required />
            </div>
          </div>



          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
        <p className="auth-privacy-note">
          Your information is encrypted and stored securely. We never share your data.
        </p>
      </div>
    </div>
  );
}
