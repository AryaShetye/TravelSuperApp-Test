import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/profile.css';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    preferredLanguage: user?.preferredLanguage || 'en',
    preferredCurrency: user?.preferredCurrency || 'INR',
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', formData);
      updateUser(res.data.user);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append('avatar', file);

    setAvatarLoading(true);
    try {
      const res = await api.put('/users/avatar', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ ...user, avatar: res.data.avatarUrl });
      toast.success('Avatar updated');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setAvatarLoading(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">My Profile</h1>

        <div className="profile-layout">
          {/* Avatar section */}
          <aside className="profile-avatar-section" aria-label="Profile photo">
            <div className="avatar-wrapper">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName}'s profile photo`}
                  className="profile-avatar"
                />
              ) : (
                <div className="avatar-placeholder" aria-hidden="true">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}

              <label
                htmlFor="avatar-upload"
                className="avatar-upload-btn"
                aria-label="Change profile photo"
              >
                {avatarLoading ? '⏳' : '📷'}
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  aria-label="Upload profile photo"
                />
              </label>
            </div>

            <p className="profile-name">{user?.firstName} {user?.lastName}</p>
            <p className="profile-role">{user?.role}</p>
            <p className="profile-email">{user?.email}</p>

            <button
              className="btn btn-danger btn-sm"
              onClick={logout}
              aria-label="Sign out of your account"
            >
              Sign out
            </button>
          </aside>

          {/* Profile form */}
          <main className="profile-form-section">
            <div className="profile-card">
              <div className="profile-card-header">
                <h2>Personal information</h2>
                {!editing && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEditing(true)}
                    aria-label="Edit profile information"
                  >
                    Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} aria-label="Profile form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">First name</label>
                    <input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                      className="form-input"
                      disabled={!editing}
                      aria-readonly={!editing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">Last name</label>
                    <input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                      className="form-input"
                      disabled={!editing}
                      aria-readonly={!editing}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">Phone number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    className="form-input"
                    disabled={!editing}
                    aria-readonly={!editing}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="language" className="form-label">Language</label>
                    <select
                      id="language"
                      value={formData.preferredLanguage}
                      onChange={(e) => setFormData((p) => ({ ...p, preferredLanguage: e.target.value }))}
                      className="form-input"
                      disabled={!editing}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                      <option value="mr">Marathi</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="currency" className="form-label">Currency</label>
                    <select
                      id="currency"
                      value={formData.preferredCurrency}
                      onChange={(e) => setFormData((p) => ({ ...p, preferredCurrency: e.target.value }))}
                      className="form-input"
                      disabled={!editing}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                {editing && (
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
                      {loading ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
