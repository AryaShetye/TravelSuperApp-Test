import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/manager-dashboard.css';

const STATUS_CLASS = {
  pending: 'booking-status--pending',
  confirmed: 'booking-status--confirmed',
  cancelled: 'booking-status--cancelled',
  completed: 'booking-status--completed',
  refunded: 'booking-status--refunded',
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ─── Real-time socket listeners ─────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onBookingNew(data) {
      setStats((prev) => prev
        ? { ...prev, activeBookings: prev.activeBookings + 1 }
        : prev
      );
      toast.success(`New booking received for ${data.propertyName}`);
    }

    function onBookingCancelled() {
      setStats((prev) => prev
        ? { ...prev, activeBookings: Math.max(0, prev.activeBookings - 1) }
        : prev
      );
    }

    socket.on('booking:new', onBookingNew);
    socket.on('booking:cancelled', onBookingCancelled);

    return () => {
      socket.off('booking:new', onBookingNew);
      socket.off('booking:cancelled', onBookingCancelled);
    };
  }, []);

  async function fetchDashboard() {
    try {
      const res = await api.get('/manager/dashboard');
      setStats(res.data.data);
    } catch {
      toast.error('Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const statCards = [
    { icon: '🏠', label: 'Total Properties', value: stats?.totalProperties ?? 0, currency: false },
    { icon: '📅', label: 'Active Bookings',  value: stats?.activeBookings ?? 0,  currency: false },
    { icon: '💰', label: 'Total Earnings',   value: stats?.totalEarnings ?? 0,   currency: true  },
    { icon: '📈', label: 'This Month',       value: stats?.monthlyEarnings ?? 0, currency: true  },
  ];

  return (
    <div className="manager-page">
      <div className="container">
        <h1 className="manager-page-title">Welcome back, {user?.firstName} 👋</h1>
        <p className="manager-page-subtitle">Here's what's happening with your properties.</p>

        {/* Stat cards */}
        <div className="stats-grid" aria-label="Dashboard statistics">
          {statCards.map((card) => (
            <div key={card.label} className="stat-card">
              <span className="stat-card__icon" aria-hidden="true">{card.icon}</span>
              <span className="stat-card__label">{card.label}</span>
              <span className={`stat-card__value ${card.currency ? 'stat-card__value--currency' : ''}`}>
                {card.currency
                  ? Number(card.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })
                  : card.value}
              </span>
            </div>
          ))}
        </div>

        {/* Recent bookings */}
        <div className="manager-table-wrapper">
          <div className="manager-table-header">
            <h2 className="manager-table-title">Recent Bookings</h2>
            <Link to="/manager/bookings" className="btn btn-outline btn-sm">View all →</Link>
          </div>

          {stats?.recentBookings?.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="manager-table" aria-label="Recent bookings">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Property</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td>{b.guestName}</td>
                      <td>{b.propertyName}</td>
                      <td>{format(new Date(b.checkIn), 'dd MMM yyyy')}</td>
                      <td>{format(new Date(b.checkOut), 'dd MMM yyyy')}</td>
                      <td>₹{Number(b.totalAmount).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`booking-status ${STATUS_CLASS[b.status] || ''}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="manager-empty" style={{ border: 'none' }}>
              <div className="manager-empty__icon" aria-hidden="true">📭</div>
              <p className="manager-empty__text">No bookings yet. List a property to get started.</p>
              <Link to="/manager/properties/new" className="btn btn-primary">Add your first property</Link>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          <Link to="/manager/properties/new" className="btn btn-primary">+ Add Property</Link>
          <Link to="/manager/properties" className="btn btn-outline">My Properties</Link>
          <Link to="/manager/bookings" className="btn btn-outline">Manage Bookings</Link>
          <Link to="/manager/availability" className="btn btn-outline">Availability</Link>
        </div>
      </div>
    </div>
  );
}
