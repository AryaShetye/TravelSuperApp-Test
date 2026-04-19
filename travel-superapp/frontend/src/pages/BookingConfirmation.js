import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import '../styles/booking-confirmation.css';

export default function BookingConfirmation() {
  const { bookingId } = useParams();
  const location = useLocation();
  const { booking, payment } = location.state || {};

  if (!booking) {
    return (
      <div className="confirmation-page">
        <div className="container">
          <div className="confirmation-card">
            <div className="confirmation-icon" aria-hidden="true">✅</div>
            <h1>Booking Confirmed!</h1>
            <p>Your booking has been confirmed.</p>
            <Link to="/my-bookings" className="btn btn-primary">View my bookings</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <div className="container">
        <div className="confirmation-card" role="main" aria-labelledby="confirmation-heading">
          {/* Success animation */}
          <div className="confirmation-icon" aria-hidden="true">🎉</div>

          <h1 id="confirmation-heading" className="confirmation-title">
            Booking Confirmed!
          </h1>
          <p className="confirmation-subtitle">
            Your stay at <strong>{booking.propertyName}</strong> is all set.
          </p>

          {/* Booking reference */}
          <div className="booking-ref-box" aria-label="Booking reference number">
            <p className="ref-label">Booking Reference</p>
            <p className="ref-number">{bookingId.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Details */}
          <div className="confirmation-details">
            <div className="detail-row">
              <span className="detail-label">Check-in</span>
              <span className="detail-value">
                {format(new Date(booking.checkIn), 'EEEE, dd MMMM yyyy')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Check-out</span>
              <span className="detail-value">
                {format(new Date(booking.checkOut), 'EEEE, dd MMMM yyyy')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Guests</span>
              <span className="detail-value">{booking.guests}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total paid</span>
              <span className="detail-value detail-amount">
                ₹{parseFloat(booking.totalAmount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Notification note */}
          <div className="notification-note" role="status">
            📱 A confirmation has been sent to your email and phone.
          </div>

          {/* Actions */}
          <div className="confirmation-actions">
            <Link
              to={`/itinerary/${bookingId}`}
              className="btn btn-primary"
              aria-label="View full itinerary"
            >
              View itinerary
            </Link>
            <Link to="/properties" className="btn btn-outline">
              Explore more stays
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
