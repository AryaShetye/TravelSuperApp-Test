import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/transport.css';

const STATUS_COLORS = {
  pending: '#f59e0b', accepted: '#3b82f6', in_progress: '#8b5cf6',
  completed: '#22c55e', cancelled: '#ef4444',
};

export default function MyTransport() {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/transport')
      .then(res => setTransports(res.data.transports))
      .catch(() => toast.error('Failed to load transport bookings'))
      .finally(() => setLoading(false));
  }, []);

  async function cancelTransport(id) {
    if (!window.confirm('Cancel this transport booking?')) return;
    try {
      await api.delete(`/transport/${id}`);
      toast.success('Transport booking cancelled');
      setTransports(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="my-transport-page">
      <div className="container">
        <div className="page-header">
          <h1>My Transport Bookings</h1>
          <Link to="/transport" className="btn btn-primary">+ Book Transport</Link>
        </div>

        {transports.length === 0 ? (
          <div className="empty-state">
            <span>🚗</span>
            <p>No transport bookings yet</p>
            <Link to="/transport" className="btn btn-primary">Book a ride</Link>
          </div>
        ) : (
          <div className="transport-list">
            {transports.map(t => (
              <div key={t.id} className="transport-card">
                <div className="transport-route">
                  <div className="route-point">
                    <span className="route-dot pickup-dot" />
                    <span>{t.pickupAddress}</span>
                  </div>
                  <div className="route-line" />
                  <div className="route-point">
                    <span className="route-dot dropoff-dot" />
                    <span>{t.dropoffAddress}</span>
                  </div>
                </div>

                <div className="transport-meta">
                  <span>🚗 {t.vehicleType?.toUpperCase()}</span>
                  {t.distanceKm && <span>📏 {t.distanceKm} km</span>}
                  {t.estimatedMinutes && <span>⏱ ~{t.estimatedMinutes} min</span>}
                  {t.fare && <span>💵 ₹{t.fare}</span>}
                  <span
                    className="status-badge"
                    style={{ background: `${STATUS_COLORS[t.status]}20`, color: STATUS_COLORS[t.status] }}
                  >
                    {t.status?.replace('_', ' ')}
                  </span>
                </div>

                {t.driver && (
                  <div className="driver-info">
                    <span>👤 Driver: {t.driver.firstName} {t.driver.lastName}</span>
                    {t.driver.phone && <span>📞 {t.driver.phone}</span>}
                  </div>
                )}

                {['pending', 'accepted'].includes(t.status) && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => cancelTransport(t.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
