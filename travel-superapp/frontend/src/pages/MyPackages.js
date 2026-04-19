import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/packages.css';

const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#22c55e', cancelled: '#ef4444', completed: '#6366f1',
};

export default function MyPackages() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/packages/my/bookings')
      .then(res => setBookings(res.data.bookings))
      .catch(() => toast.error('Failed to load package bookings'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="my-packages-page">
      <div className="container">
        <div className="page-header">
          <h1>My Package Bookings</h1>
          <Link to="/packages" className="btn btn-primary">Browse Packages</Link>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <span>🧳</span>
            <p>No package bookings yet</p>
            <Link to="/packages" className="btn btn-primary">Explore packages</Link>
          </div>
        ) : (
          <div className="my-packages-list">
            {bookings.map(b => (
              <div key={b.id} className="my-package-card">
                {b.package?.images?.[0] && (
                  <img
                    src={b.package.images[0].url || b.package.images[0]}
                    alt={b.package?.title}
                    className="my-package-img"
                  />
                )}
                <div className="my-package-info">
                  <h3>{b.package?.title}</h3>
                  <p>📍 {b.package?.destination}</p>
                  <p>⏱ {b.package?.durationDays} days</p>
                  <p>👥 {b.persons} person{b.persons !== 1 ? 's' : ''}</p>
                  <p>📅 Travel: {b.travelDate ? format(new Date(b.travelDate), 'dd MMM yyyy') : 'N/A'}</p>
                  <p>💰 Total: ₹{parseFloat(b.totalAmount).toLocaleString('en-IN')}</p>
                  <span
                    className="status-badge"
                    style={{ background: `${STATUS_COLORS[b.status]}20`, color: STATUS_COLORS[b.status] }}
                  >
                    {b.status}
                  </span>
                </div>
                <Link to={`/packages/${b.packageId}`} className="btn btn-outline btn-sm">View Package</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
