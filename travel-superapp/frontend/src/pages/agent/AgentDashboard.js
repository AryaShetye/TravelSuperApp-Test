import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/agent-dashboard.css';

export default function AgentDashboard() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/packages/agent/my-packages')
      .then(res => setPackages(res.data.packages))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const totalBookings = packages.reduce((s, p) => s + (p.bookings?.length || 0), 0);
  const totalRevenue = packages.reduce((s, p) => {
    return s + (p.bookings || []).filter(b => b.status !== 'cancelled').reduce((a, b) => a + parseFloat(b.totalAmount || 0), 0);
  }, 0);

  return (
    <div className="agent-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Agent Dashboard</h1>
          <Link to="/agent/packages/new" className="btn btn-primary">+ Create Package</Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🧳</div>
            <div className="stat-value">{packages.length}</div>
            <div className="stat-label">Total Packages</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{totalBookings}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
          <div className="stat-card stat-card--highlight">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        <div className="packages-section">
          <h2>My Packages</h2>
          {packages.length === 0 ? (
            <div className="empty-state">
              <span>🧳</span>
              <p>No packages yet. Create your first tour package!</p>
              <Link to="/agent/packages/new" className="btn btn-primary">Create Package</Link>
            </div>
          ) : (
            <div className="packages-grid">
              {packages.map(pkg => (
                <div key={pkg.id} className="package-card">
                  {pkg.images?.[0] && (
                    <img src={pkg.images[0].url || pkg.images[0]} alt={pkg.title} className="package-img" />
                  )}
                  <div className="package-info">
                    <h3>{pkg.title}</h3>
                    <p className="package-dest">📍 {pkg.destination}</p>
                    <p className="package-duration">⏱ {pkg.durationDays} days</p>
                    <p className="package-price">₹{parseFloat(pkg.pricePerPerson).toLocaleString('en-IN')} / person</p>
                    <div className="package-tags">
                      {pkg.includesStay && <span className="tag">🏠 Stay</span>}
                      {pkg.includesTransport && <span className="tag">🚗 Transport</span>}
                      {pkg.includesActivities && <span className="tag">🎯 Activities</span>}
                    </div>
                    <div className="package-bookings-count">
                      {pkg.bookings?.length || 0} booking{pkg.bookings?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="package-actions">
                    <Link to={`/agent/packages/${pkg.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                    <Link to={`/packages/${pkg.id}`} className="btn btn-ghost btn-sm">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
