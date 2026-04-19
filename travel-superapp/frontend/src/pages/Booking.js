import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import '../styles/booking.css';

// Razorpay is loaded via CDN script tag
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Booking() {
  const { propertyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [pricing, setPricing] = useState(location.state?.pricing || null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(!booking);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (!booking) {
      navigate(`/properties/${propertyId}`);
      return;
    }
    fetchProperty();
  }, []);

  async function fetchProperty() {
    try {
      const res = await api.get(`/properties/${propertyId}`);
      setProperty(res.data.property);
    } catch {
      toast.error('Could not load property details');
    } finally {
      setLoading(false);
    }
  }

  async function handlePayment() {
    const razorpayLoaded = await loadRazorpay();
    if (!razorpayLoaded) {
      toast.error('Payment gateway failed to load. Please check your internet connection.');
      return;
    }

    setPaymentLoading(true);
    try {
      // Step 1: Create Razorpay order
      const orderRes = await api.post('/payments/create-order', {
        bookingId: booking.id,
      });

      const { orderId, amount, currency, keyId, prefill } = orderRes.data;

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Travel Super App',
        description: `Booking: ${booking.propertyName}`,
        order_id: orderId,
        prefill,
        theme: { color: '#FF385C' },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
            toast('Payment cancelled', { icon: 'ℹ️' });
          },
        },
        handler: async (response) => {
          // Step 3: Verify payment on backend
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
            });

            toast.success('Payment successful! Booking confirmed 🎉');
            navigate(`/booking/confirmation/${booking.id}`, {
              state: { booking: verifyRes.data.booking, payment: verifyRes.data.payment },
            });
          } catch (verifyErr) {
            toast.error('Payment verification failed. Contact support.');
            setPaymentLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setPaymentLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Could not initiate payment');
      setPaymentLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!booking) return null;

  return (
    <div className="booking-page">
      <div className="container">
        <h1 className="page-title">Confirm your booking</h1>

        <div className="booking-layout">
          {/* Left: Booking summary */}
          <div className="booking-summary">
            <section aria-labelledby="trip-heading">
              <h2 id="trip-heading" className="summary-heading">Your trip</h2>

              <div className="summary-row">
                <div>
                  <p className="summary-label">Dates</p>
                  <p className="summary-value">
                    {booking.checkIn} → {booking.checkOut}
                    <span className="summary-sub"> ({booking.nights} night{booking.nights !== 1 ? 's' : ''})</span>
                  </p>
                </div>
              </div>

              <div className="summary-row">
                <div>
                  <p className="summary-label">Guests</p>
                  <p className="summary-value">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </section>

            {/* Guest info */}
            <section aria-labelledby="guest-heading">
              <h2 id="guest-heading" className="summary-heading">Guest details</h2>
              <div className="guest-info">
                <p><strong>{user?.firstName} {user?.lastName}</strong></p>
                <p>{user?.email}</p>
                {user?.phone && <p>{user?.phone}</p>}
              </div>
            </section>

            {/* Cancellation policy */}
            <section aria-labelledby="policy-heading">
              <h2 id="policy-heading" className="summary-heading">Cancellation policy</h2>
              <p className="policy-text">
                Free cancellation up to 24 hours before check-in. After that, the booking is non-refundable.
              </p>
            </section>
          </div>

          {/* Right: Price & payment */}
          <aside className="payment-panel" aria-label="Payment details">
            {/* Property card */}
            {property && (
              <div className="property-mini-card">
                <img
                  src={property.images?.[0]?.url}
                  alt={property.title}
                  className="property-mini-image"
                />
                <div className="property-mini-info">
                  <p className="property-mini-name">{property.title}</p>
                  <p className="property-mini-location">
                    📍 {property.location.city}, {property.location.state}
                  </p>
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <div className="price-breakdown-card" aria-label="Price breakdown">
              <h2 className="summary-heading">Price details</h2>

              <div className="price-row">
                <span>₹{booking.pricePerNight?.toLocaleString('en-IN')} × {booking.nights} night{booking.nights !== 1 ? 's' : ''}</span>
                <span>₹{booking.subtotal?.toLocaleString('en-IN')}</span>
              </div>

              <div className="price-row">
                <span>Taxes (12% GST)</span>
                <span>₹{booking.taxes?.toLocaleString('en-IN')}</span>
              </div>

              <div className="price-divider" aria-hidden="true" />

              <div className="price-row price-total">
                <strong>Total (INR)</strong>
                <strong>₹{booking.totalAmount?.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            {/* Pay button */}
            <button
              className="btn btn-primary btn-full btn-pay"
              onClick={handlePayment}
              disabled={paymentLoading}
              aria-busy={paymentLoading}
            >
              {paymentLoading ? (
                <span className="btn-loading">
                  <span className="spinner" aria-hidden="true" />
                  Processing...
                </span>
              ) : (
                `Pay ₹${booking.totalAmount?.toLocaleString('en-IN')}`
              )}
            </button>

            <p className="secure-payment-note">
              🔒 Secured by Razorpay. Your payment info is encrypted.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
