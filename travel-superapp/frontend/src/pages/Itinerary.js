import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/itinerary.css';

const STATUS_CONFIG = {
  pending: { label: 'Pending Payment', color: '#f59e0b', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: '#22c55e', icon: '✅' },
  cancelled: { label: 'Cancelled', color: '#ef4444', icon: '❌' },
  completed: { label: 'Completed', color: '#6366f1', icon: '🏁' },
  refunded: { label: 'Refunded', color: '#64748b', icon: '↩️' },
};

export default function Itinerary() {
  const { bookingId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchItinerary();
  }, [bookingId]);

  async function fetchItinerary() {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      setData(res.data);
    } catch {
      toast.error('Could not load itinerary');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;

    setCancelling(true);
    try {
      await api.put(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by user' });
      toast.success('Booking cancelled');
      fetchItinerary();
    } catch (err) {
      toast.error(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return null;

  const { booking, property, payment, itinerary } = data;
  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  return (
    <div className="itinerary-page">
      <div className="container">
        {/* Header */}
        <div className="itinerary-header">
          <div>
            <h1 className="itinerary-title">Booking Itinerary</h1>
            <p className="booking-ref">
              Booking #{itinerary.bookingId}
            </p>
          </div>
          <div
            className="status-badge"
            style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
            role="status"
            aria-label={`Booking status: ${statusConfig.label}`}
          >
            <span aria-hidden="true">{statusConfig.icon}</span>
            {statusConfig.label}
          </div>
        </div>

        <div className="itinerary-layout">
          {/* Main content */}
          <div className="itinerary-main">
            {/* Property info */}
            <section className="itinerary-card" aria-labelledby="property-heading">
              <h2 id="property-heading" className="card-heading">Property</h2>
              {property && (
                <div className="property-summary">
                  <img
                    src={property.images?.[0]?.url}
                    alt={property.title}
                    className="property-summary-image"
                  />
                  <div className="property-summary-info">
                    <h3 className="property-summary-name">{property.title}</h3>
                    <p className="property-summary-location">
                      📍 {property.location?.formattedAddress || `${property.location?.city}, ${property.location?.state}`}
                    </p>
                    <p className="property-summary-type">{property.propertyType?.replace('_', ' ')}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Stay details */}
            <section className="itinerary-card" aria-labelledby="stay-heading">
              <h2 id="stay-heading" className="card-heading">Stay details</h2>
              <div className="stay-details-grid">
                <div className="stay-detail">
                  <p className="detail-label">Check-in</p>
                  <p className="detail-value">
                    {format(new Date(booking.checkIn), 'EEEE, dd MMM yyyy')}
                  </p>
                  <p className="detail-sub">After {itinerary.houseRules?.checkInTime || '14:00'}</p>
                </div>
                <div className="stay-detail">
                  <p className="detail-label">Check-out</p>
                  <p className="detail-value">
                    {format(new Date(booking.checkOut), 'EEEE, dd MMM yyyy')}
                  </p>
                  <p className="detail-sub">Before {itinerary.houseRules?.checkOutTime || '11:00'}</p>
                </div>
                <div className="stay-detail">
                  <p className="detail-label">Duration</p>
                  <p className="detail-value">{booking.nights} night{booking.nights !== 1 ? 's' : ''}</p>
                </div>
                <div className="stay-detail">
                  <p className="detail-label">Guests</p>
                  <p className="detail-value">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </section>

            {/* Host contact */}
            <section className="itinerary-card" aria-labelledby="host-heading">
              <h2 id="host-heading" className="card-heading">Host</h2>
              <p className="host-contact-name">{itinerary.hostContact}</p>
              <p className="host-contact-note">
                Your host will contact you with check-in instructions closer to your arrival date.
              </p>
            </section>

            {/* Transport details if linked */}
            {data.transport && (
              <section className="itinerary-card" aria-labelledby="transport-heading">
                <h2 id="transport-heading" className="card-heading">Transport</h2>
                <div className="transport-itinerary">
                  <div className="transport-route-item">
                    <span className="route-dot pickup-dot" />
                    <div>
                      <p className="detail-label">Pickup</p>
                      <p className="detail-value">{data.transport.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="transport-route-item">
                    <span className="route-dot dropoff-dot" />
                    <div>
                      <p className="detail-label">Drop-off</p>
                      <p className="detail-value">{data.transport.dropoffAddress}</p>
                    </div>
                  </div>
                  {data.transport.distanceKm && (
                    <p className="transport-meta-item">📏 {data.transport.distanceKm} km · ⏱ ~{data.transport.estimatedMinutes} min</p>
                  )}
                  {data.transport.fare && (
                    <p className="transport-meta-item">💵 Fare: ₹{data.transport.fare}</p>
                  )}
                  <span className={`status-badge status-${data.transport.status}`}>
                    {data.transport.status?.replace('_', ' ')}
                  </span>
                </div>
              </section>
            )}

            {/* House rules */}
            {itinerary.houseRules && Object.keys(itinerary.houseRules).length > 0 && (
              <section className="itinerary-card" aria-labelledby="rules-heading">
                <h2 id="rules-heading" className="card-heading">House rules</h2>
                <ul className="rules-list">
                  <li>🕐 Check-in after {itinerary.houseRules.checkInTime || '14:00'}</li>
                  <li>🕐 Check-out before {itinerary.houseRules.checkOutTime || '11:00'}</li>
                  <li>{itinerary.houseRules.smokingAllowed ? '✅' : '🚫'} Smoking {itinerary.houseRules.smokingAllowed ? 'allowed' : 'not allowed'}</li>
                  <li>{itinerary.houseRules.petsAllowed ? '✅' : '🚫'} Pets {itinerary.houseRules.petsAllowed ? 'allowed' : 'not allowed'}</li>
                  {itinerary.houseRules.additionalRules?.map((rule, i) => (
                    <li key={i}>• {rule}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar: Payment summary */}
          <aside className="itinerary-sidebar" aria-label="Payment summary">
            <div className="payment-summary-card">
              <h2 className="card-heading">Payment summary</h2>

              <div className="payment-rows">
                <div className="payment-row">
                  <span>Subtotal</span>
                  <span>₹{parseFloat(booking.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="payment-row">
                  <span>Taxes</span>
                  <span>₹{parseFloat(booking.taxes).toLocaleString('en-IN')}</span>
                </div>
                <div className="payment-divider" aria-hidden="true" />
                <div className="payment-row payment-total">
                  <strong>Total paid</strong>
                  <strong>₹{parseFloat(booking.totalAmount).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {payment && (
                <div className="payment-status">
                  <p className="payment-method">
                    Paid via {payment.method || 'online payment'}
                  </p>
                  {payment.paidAt && (
                    <p className="payment-date">
                      on {format(new Date(payment.paidAt), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="itinerary-actions">
              <button
                className="btn btn-outline btn-full"
                onClick={() => window.print()}
                aria-label="Print itinerary"
              >
                🖨️ Print itinerary
              </button>

              {['pending', 'confirmed'].includes(booking.status) && (
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleCancel}
                  disabled={cancelling}
                  aria-busy={cancelling}
                >
                  {cancelling ? 'Cancelling...' : '❌ Cancel booking'}
                </button>
              )}

              <Link to="/my-bookings" className="btn btn-ghost btn-full">
                ← Back to my bookings
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
