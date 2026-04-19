import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import '../styles/auth.css';

/**
 * Login page with two distinct entry points:
 *  - Traveler  → logs in and goes to home / intended page
 *  - Property Manager → logs in and goes to /manager/dashboard
 *
 * Both use the same backend endpoint — the role stored in the JWT
 * determines the redirect. The tab selection is purely a UX hint.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 'traveler' | 'host' | 'driver' | 'agent'
  const [loginType, setLoginType] = useState('traveler');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const CONFIG = {
    traveler: {
      icon: '🧳',
      title: 'Traveler Login',
      subtitle: 'Find and book unique homestays',
      placeholder: 'arya@travelsuperapp.com',
      btnLabel: 'Sign in as Traveler',
      registerHint: 'New traveler?',
    },
    property_manager: {
      icon: '🏢',
      title: 'Property Manager Login',
      subtitle: 'Manage properties and bookings',
      placeholder: 'siddhi@travelsuperapp.com',
      btnLabel: 'Sign in as Property Manager',
      registerHint: 'New property manager?',
    },
    agent: {
      icon: '🎒',
      title: 'Travel Agent Login',
      subtitle: 'Create and sell tour packages',
      placeholder: 'aarya@travelsuperapp.com',
      btnLabel: 'Sign in as Travel Agent',
      registerHint: 'New travel agent?',
    },
    driver: {
      icon: '🚗',
      title: 'Driver Login',
      subtitle: 'Accept rides and manage trips',
      placeholder: 'snehal@travelsuperapp.com',
      btnLabel: 'Sign in as Driver',
      registerHint: 'New driver?',
    },
    admin: {
      icon: '🛡️',
      title: 'Admin Login',
      subtitle: 'Manage the platform',
      placeholder: 'admin@travelsuperapp.com',
      btnLabel: 'Sign in as Admin',
      registerHint: '',
    },
  };

  const cfg = CONFIG[loginType];

  function validate() {
    const errs = {};
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.password) errs.password = 'Password is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const userData = await login(formData.email, formData.password);

      toast.success('Welcome back!');
      if (userData.role === 'host' || userData.role === 'property_manager') {
        navigate('/manager/dashboard', { replace: true });
      } else if (userData.role === 'driver') {
        navigate('/driver/dashboard', { replace: true });
      } else if (userData.role === 'agent') {
        navigate('/agent/dashboard', { replace: true });
      } else if (userData.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Login failed');
      setErrors({ general: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function switchType(type) {
    setLoginType(type);
    setErrors({});
    setFormData({ email: '', password: '' });
  }

  return (
    <div className="auth-page">
      <div className="auth-container" role="main">

        {/* Logo */}
        <div className="auth-logo" aria-label="Travel Super App">
          <span className="logo-icon" aria-hidden="true">✈️</span>
          <span className="logo-text">TravelApp</span>
        </div>

        {/* Role selector tabs */}
        <div className="login-type-tabs" role="tablist" aria-label="Select login type">
          {[
            { id: 'traveler', icon: '🧳', label: 'Traveler' },
            { id: 'property_manager', icon: '🏢', label: 'Manager' },
            { id: 'agent', icon: '🎒', label: 'Agent' },
            { id: 'driver', icon: '🚗', label: 'Driver' },
            { id: 'admin', icon: '🛡️', label: 'Admin' },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={loginType === tab.id}
              className={`login-type-tab ${loginType === tab.id ? 'active' : ''}`}
              onClick={() => switchType(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic header */}
        <div className="login-type-header">
          <span className="login-type-icon" aria-hidden="true">{cfg.icon}</span>
          <h1 className="auth-title">{cfg.title}</h1>
          <p className="auth-subtitle">{cfg.subtitle}</p>
        </div>

        {errors.general && (
          <div className="error-banner" role="alert" aria-live="polite">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label={`${cfg.title} form`}>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email" type="email" name="email"
              value={formData.email} onChange={handleChange}
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder={cfg.placeholder}
              autoComplete="email"
              aria-required="true"
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password} onChange={handleChange}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={!!errors.password}
              />
              <button
                type="button" className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <span className="field-error" role="alert">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className={`btn btn-full ${loginType === 'host' ? 'btn-manager' : 'btn-primary'}`}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                Signing in...
              </span>
            ) : cfg.btnLabel}
          </button>
        </form>

        {/* Test credentials hint */}
        <div className="login-test-hint" aria-label="Test credentials">
          <p className="hint-label">🧪 Test credentials (password: Test@1234)</p>
          {loginType === 'traveler' && <p className="hint-creds">arya@travelsuperapp.com</p>}
          {loginType === 'property_manager' && <p className="hint-creds">siddhi@travelsuperapp.com</p>}
          {loginType === 'agent' && <p className="hint-creds">aarya@travelsuperapp.com</p>}
          {loginType === 'driver' && <p className="hint-creds">snehal@travelsuperapp.com</p>}
          {loginType === 'admin' && <p className="hint-creds">admin@travelsuperapp.com</p>}
        </div>

        <p className="auth-switch">
          {cfg.registerHint}{' '}
          <Link to="/register" className="auth-link">Create account</Link>
        </p>
      </div>
    </div>
  );
}
