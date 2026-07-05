import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/signin');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <NavLink to="/" className="navbar-brand" id="nav-brand">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="14" fill="var(--primary)" opacity="0.18" />
          <path
            d="M14 4L6 7.5V14c0 4.6 3.4 8.9 8 9.9 4.6-1 8-5.3 8-9.9V7.5L14 4zm-1 13l-3.5-3.5 1.4-1.4L13 14.2l5.1-5.1 1.4 1.4L13 17z"
            fill="var(--primary)"
          />
        </svg>
        VEILiq
      </NavLink>

      {/* Nav Links */}
      {user && (
        <div className="navbar-nav">
          <NavLink
            to="/annotate"
            id="nav-annotate"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Corpus Ingestion
          </NavLink>
          <NavLink
            to="/"
            id="nav-home"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            end
          >
            Analyse
          </NavLink>
          <NavLink
            to="/history"
            id="nav-history"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Audit
          </NavLink>
        </div>
      )}

      {/* Right Controls */}
      <div className="navbar-right">
        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          id="theme-toggle-btn"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User Menu or Auth Buttons */}
        {user ? (
          <div style={{ position: 'relative' }} ref={dropRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setDropdownOpen((o) => !o)}
              id="user-menu-btn"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="avatar-circle" aria-hidden="true">{initials}</div>
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-faint)' }}>
                {dropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {dropdownOpen && (
              <div className="user-dropdown" role="menu">
                <div className="dropdown-header">
                  <div className="dh-name">{user.name}</div>
                  <div className="dh-email">{user.email}</div>
                  {user.isMinor && (
                    <div style={{
                      marginTop: 6, padding: '2px 8px', display: 'inline-block',
                      background: 'var(--amber-bg)', color: 'var(--amber)',
                      borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      Minor Account
                    </div>
                  )}
                </div>
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                  role="menuitem"
                  id="logout-btn"
                >
                  <span>→</span> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <NavLink to="/signin" className="btn btn-ghost btn-sm" id="nav-signin">Sign In</NavLink>
            <NavLink to="/signup" className="btn btn-primary btn-sm" id="nav-signup">Get Started</NavLink>
          </div>
        )}
      </div>
    </nav>
  );
}
