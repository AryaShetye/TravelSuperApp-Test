import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/my-bookings.css';

const STATUS_COLORS = {
  created: '#f59e0b', paid: '#22c55e', failed: '#ef4444', refunded: '#6366f1',
};

export default function PaymentHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings')
      .then(res => setBookings(res.data.bookings))
      .catch(() => toast.error('Could not load payment history'))
      .finally(() => setLoading(false));
  }, []);

  const paidBookings = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
  const totalSpent = paidBookings.reduce((s, b) => s + parseFloat(b.totalAmount || 0), 0);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="my-bookings-page">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Payment History</h1>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Total spent: <strong style={{ color: '#22c55e' }}>₹{totalSpent.toLocaleString('en-IN')}</strong>
            </p>
          </div>
          <Link to="/my-bookings" className="btn btn-outline btn-sm">← My Bookings</Link>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💳</span>
            <h2>No payments yet</h2>
            <p>Your payment history will appear here after you make a booking.</p>
            <Link to="/properties" className="btn btn-primary">Explore stays</Link>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map(b => (
              <article key={b.id} className="booking-card">
                <div className="booking-card-image">
                  {b.propertyImage ? (
                    <img src={b.propertyImage} alt={b.propertyName} loading="lazy" />
                  ) : (
                    <div className="image-placeholder">🏠</div>
                  )}
                </div>
                <div className="booking-card-info">
                  <div className="booking-card-header">
                    <h2 className="booking-property-name">{b.propertyName}</h2>
                    <span
                      className="booking-status"
                      style={{
                        color: b.status === 'confirmed' || b.status === 'completed' ? '#22c55e' : '#f59e0b',
                        backgroundColor: b.status === 'confirmed' || b.status === 'completed' ? '#22c55e15' : '#f59e0b15',
                      }}
                    >
                      {b.status === 'confirmed' || b.status === 'completed' ? '✅ Paid' : '⏳ Pending'}
                    </span>
                  </div>

                  <p className="booking-location">📍 {b.propertyLocation}</p>

                  <div className="booking-dates">
                    <span>
                      {b.checkIn && format(new Date(b.checkIn), 'dd MMM yyyy')}
                      {' → '}
                      {b.checkOut && format(new Date(b.checkOut), 'dd MMM yyyy')}
                    </span>
                    <span className="booking-nights">{b.nights} night{b.nights !== 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#555', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span>Subtotal: ₹{parseFloat(b.subtotal || 0).toLocaleString('en-IN')}</span>
                    <span>Taxes: ₹{parseFloat(b.taxes || 0).toLocaleString('en-IN')}</span>
                    {b.cleaningFee > 0 && <span>Cleaning: ₹{parseFloat(b.cleaningFee).toLocaleString('en-IN')}</span>}
                  </div>

                  <div className="booking-card-footer">
                    <span className="booking-amount" style={{ color: '#22c55e' }}>
                      ₹{parseFloat(b.totalAmount).toLocaleString('en-IN')}
                    </span>
                    <Link to={`/itinerary/${b.id}`} className="btn btn-outline btn-sm">
                      View receipt
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
