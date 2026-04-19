import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import '../styles/auth.css';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'traveler',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 8) errs.password = 'Minimum 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password))
      errs.password = 'Must include uppercase, lowercase, and number';
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const userData = await register(submitData);
      toast.success('Account created! Welcome aboard 🎉');
      if (userData.role === 'host' || userData.role === 'property_manager') {
        navigate('/manager/dashboard');
      } else if (userData.role === 'driver') {
        navigate('/driver/dashboard');
      } else if (userData.role === 'agent') {
        navigate('/agent/dashboard');
      } else if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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

  // Password strength indicator
  function getPasswordStrength() {
    const p = formData.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { label: 'Weak', color: '#ef4444' };
    if (score <= 3) return { label: 'Fair', color: '#f59e0b' };
    if (score <= 4) return { label: 'Good', color: '#3b82f6' };
    return { label: 'Strong', color: '#22c55e' };
  }

  const strength = getPasswordStrength();

  return (
    <div className="auth-page">
      <div className="auth-container auth-container--wide" role="main">
        <div className="auth-logo" aria-label="Travel Super App">
          <span className="logo-icon" aria-hidden="true">✈️</span>
          <span className="logo-text">TravelApp</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start exploring unique homestays</p>

        {errors.general && (
          <div className="error-banner" role="alert">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-label="Registration form">
          {/* Name row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First name</label>
              <input
                id="firstName" type="text" name="firstName"
                value={formData.firstName} onChange={handleChange}
                className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                placeholder="John" autoComplete="given-name"
                aria-required="true" aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <span className="field-error" role="alert">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last name</label>
              <input
                id="lastName" type="text" name="lastName"
                value={formData.lastName} onChange={handleChange}
                className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                placeholder="Doe" autoComplete="family-name"
                aria-required="true" aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <span className="field-error" role="alert">{errors.lastName}</span>}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address</label>
            <input
              id="reg-email" type="email" name="email"
              value={formData.email} onChange={handleChange}
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="you@example.com" autoComplete="email"
              aria-required="true" aria-invalid={!!errors.email}
            />
            {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone number <span className="optional">(optional)</span>
            </label>
            <input
              id="phone" type="tel" name="phone"
              value={formData.phone} onChange={handleChange}
              className="form-input"
              placeholder="+91 98765 43210" autoComplete="tel"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password} onChange={handleChange}
                className={`form-input ${errors.password ? 'input-error' : ''}`}
                placeholder="Min. 8 characters" autoComplete="new-password"
                aria-required="true" aria-invalid={!!errors.password}
                aria-describedby="password-strength"
              />
              <button
                type="button" className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {strength && (
              <div id="password-strength" className="password-strength" aria-live="polite">
                <div
                  className="strength-bar"
                  style={{ backgroundColor: strength.color, width: '100%' }}
                  role="progressbar"
                  aria-label={`Password strength: ${strength.label}`}
                />
                <span style={{ color: strength.color, fontSize: '12px' }}>{strength.label}</span>
              </div>
            )}
            {errors.password && <span className="field-error" role="alert">{errors.password}</span>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
            <input
              id="confirmPassword" type="password" name="confirmPassword"
              value={formData.confirmPassword} onChange={handleChange}
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Repeat your password" autoComplete="new-password"
              aria-required="true" aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && <span className="field-error" role="alert">{errors.confirmPassword}</span>}
          </div>

          {/* Role */}
          <div className="form-group">
            <label htmlFor="role" className="form-label">I want to</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange} className="form-input">
              <option value="traveler">🧳 Book stays & travel (Traveler)</option>
              <option value="property_manager">🏢 Manage properties (Property Manager)</option>
              <option value="agent">🎒 Create tour packages (Travel Agent)</option>
              <option value="driver">🚗 Offer transport services (Driver)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                Creating account...
              </span>
            ) : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
