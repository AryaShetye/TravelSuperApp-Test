import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AttractionsSection from '../components/attractions/AttractionsSection';
import '../styles/packages.css';

export default function PackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({ persons: 1, travelDate: '', specialRequests: '' });
  const [booking_loading, setBookingLoading] = useState(false);

  useEffect(() => {
    api.get(`/packages/${id}`)
      .then(res => setPkg(res.data.package))
      .catch(() => toast.error('Package not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBook(e) {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setBookingLoading(true);
    try {
      await api.post(`/packages/${id}/book`, booking);
      toast.success('Package booked successfully!');
      navigate('/my-packages');
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!pkg) return <div className="container"><p>Package not found.</p></div>;

  const total = parseFloat(pkg.pricePerPerson) * parseInt(booking.persons || 1);

  return (
    <div className="package-detail-page">
      <div className="container">
        <div className="package-detail-layout">
          <div className="package-detail-main">
            {pkg.images?.[0] && (
              <img
                src={pkg.images[0].url || pkg.images[0]}
                alt={pkg.title}
                className="package-detail-hero"
              />
            )}

            <h1>{pkg.title}</h1>
            <p className="package-detail-dest">📍 {pkg.destination} · {pkg.durationDays} Days</p>

            <div className="package-includes">
              {pkg.includesStay && <span className="include-badge">🏠 Stay Included</span>}
              {pkg.includesTransport && <span className="include-badge">🚗 Transport Included</span>}
              {pkg.includesActivities && <span className="include-badge">🎯 Activities Included</span>}
            </div>

            <div className="package-section">
              <h2>About this package</h2>
              <p>{pkg.description}</p>
            </div>

            {pkg.activities?.length > 0 && (
              <div className="package-section">
                <h2>Activities</h2>
                <ul className="activities-list">
                  {pkg.activities.map((a, i) => <li key={i}>✓ {a}</li>)}
                </ul>
              </div>
            )}

            {pkg.itineraryDays?.length > 0 && (
              <div className="package-section">
                <h2>Day-wise Itinerary</h2>
                <div className="itinerary-timeline">
                  {pkg.itineraryDays.map((day, i) => (
                    <div key={i} className="itinerary-day">
                      <div className="day-number">Day {day.day || i + 1}</div>
                      <div className="day-content">
                        <h3>{day.title}</h3>
                        <p>{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pkg.agent && (
              <div className="package-section">
                <h2>About the Agent</h2>
                <div className="agent-info">
                  {pkg.agent.avatar && <img src={pkg.agent.avatar} alt="" className="agent-avatar" />}
                  <div>
                    <p className="agent-name">{pkg.agent.firstName} {pkg.agent.lastName}</p>
                    <p className="agent-email">{pkg.agent.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Real attractions from TripAdvisor via SerpAPI */}
            {pkg.destination && (
              <AttractionsSection
                location={pkg.destination}
                title={`🎯 Attractions in ${pkg.destination}`}
              />
            )}
          </div>

          <aside className="package-detail-sidebar">
            <div className="booking-card">
              <div className="booking-card-price">
                <span className="price-big">₹{parseFloat(pkg.pricePerPerson).toLocaleString('en-IN')}</span>
                <span className="price-per"> / person</span>
              </div>

              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label className="form-label">Travel Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={booking.travelDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setBooking(b => ({ ...b, travelDate: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Number of Persons</label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max={pkg.maxPersons}
                    value={booking.persons}
                    onChange={e => setBooking(b => ({ ...b, persons: e.target.value }))}
                  />
                  <span className="form-hint">Max {pkg.maxPersons} persons</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Special Requests</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={booking.specialRequests}
                    onChange={e => setBooking(b => ({ ...b, specialRequests: e.target.value }))}
                    placeholder="Any special requirements..."
                  />
                </div>

                <div className="price-breakdown">
                  <div className="price-row">
                    <span>₹{parseFloat(pkg.pricePerPerson).toLocaleString('en-IN')} × {booking.persons} person{booking.persons > 1 ? 's' : ''}</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="price-row price-total">
                    <strong>Total</strong>
                    <strong>₹{total.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" disabled={booking_loading}>
                  {booking_loading ? 'Booking...' : user ? 'Book Package' : 'Sign in to Book'}
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
