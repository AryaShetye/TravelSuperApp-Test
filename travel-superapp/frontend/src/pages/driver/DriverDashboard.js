import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/driver-dashboard.css';

export default function DriverDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/driver/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const stats = data || {};

  return (
    <div className="driver-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Driver Dashboard</h1>
          <Link to="/driver/requests" className="btn btn-primary">View Requests</Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🚗</div>
            <div className="stat-value">{stats.totalTrips || 0}</div>
            <div className="stat-label">Total Trips</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.completedTrips || 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-value">{stats.activeTrips || 0}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card stat-card--highlight">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₹{(stats.totalEarnings || 0).toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Earnings</div>
          </div>
        </div>

        {stats.pendingRequests > 0 && (
          <div className="alert-banner">
            <span>🔔 {stats.pendingRequests} new trip request{stats.pendingRequests !== 1 ? 's' : ''} available</span>
            <Link to="/driver/requests" className="btn btn-sm btn-primary">Accept trips</Link>
          </div>
        )}

        <div className="recent-section">
          <h2>Recent Trips</h2>
          {stats.recentTrips?.length > 0 ? (
            <div className="trips-list">
              {stats.recentTrips.map(trip => (
                <div key={trip.id} className="trip-card">
                  <div className="trip-route">
                    <span className="pickup">📍 {trip.pickupAddress}</span>
                    <span className="arrow">→</span>
                    <span className="dropoff">🏁 {trip.dropoffAddress}</span>
                  </div>
                  <div className="trip-meta">
                    <span className="trip-passenger">
                      👤 {trip.traveler ? `${trip.traveler.firstName} ${trip.traveler.lastName}` : 'Passenger'}
                    </span>
                    {trip.distanceKm && <span>📏 {trip.distanceKm} km</span>}
                    {trip.fare && <span>💵 ₹{trip.fare}</span>}
                    <span className={`status-badge status-${trip.status}`}>{trip.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No trips yet. Accept your first request!</p>
          )}
        </div>
      </div>
    </div>
  );
}
