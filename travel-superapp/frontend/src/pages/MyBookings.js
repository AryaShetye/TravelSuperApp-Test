import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/my-bookings.css';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#22c55e',
  cancelled: '#ef4444',
  completed: '#6366f1',
  refunded: '#64748b',
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  async function fetchBookings() {
    setLoading(true);
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await api.get('/bookings', { params });
      setBookings(res.data.bookings);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-bookings-page">
      <div className="container">
        <h1 className="page-title">My Bookings</h1>

        {/* Tabs */}
        <div className="bookings-tabs" role="tablist" aria-label="Filter bookings by status">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : bookings.length === 0 ? (
          <div className="empty-state" role="status">
            <span className="empty-icon" aria-hidden="true">🏠</span>
            <h2>No bookings yet</h2>
            <p>Start exploring and book your first homestay!</p>
            <Link to="/properties" className="btn btn-primary">Explore stays</Link>
          </div>
        ) : (
          <div className="bookings-list" role="list">
            {bookings.map((booking) => (
              <article key={booking.id} className="booking-card" role="listitem">
                {/* Property image */}
                <div className="booking-card-image">
                  {booking.propertyImage ? (
                    <img
                      src={booking.propertyImage}
                      alt={booking.propertyName}
                      loading="lazy"
                    />
                  ) : (
                    <div className="image-placeholder" aria-hidden="true">🏠</div>
                  )}
                </div>

                {/* Booking info */}
                <div className="booking-card-info">
                  <div className="booking-card-header">
                    <h2 className="booking-property-name">{booking.propertyName}</h2>
                    <span
                      className="booking-status"
                      style={{
                        color: STATUS_COLORS[booking.status],
                        backgroundColor: `${STATUS_COLORS[booking.status]}15`,
                      }}
                      aria-label={`Status: ${booking.status}`}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>

                  <p className="booking-location">📍 {booking.propertyLocation}</p>

                  <div className="booking-dates">
                    <span>
                      {format(new Date(booking.checkIn), 'dd MMM yyyy')}
                      {' → '}
                      {format(new Date(booking.checkOut), 'dd MMM yyyy')}
                    </span>
                    <span className="booking-nights">
                      {booking.nights} night{booking.nights !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="booking-card-footer">
                    <span className="booking-amount">
                      ₹{parseFloat(booking.totalAmount).toLocaleString('en-IN')}
                    </span>
                    <Link
                      to={`/itinerary/${booking.id}`}
                      className="btn btn-outline btn-sm"
                      aria-label={`View itinerary for ${booking.propertyName}`}
                    >
                      View itinerary
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
