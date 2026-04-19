import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import '../styles/transport.css';

const VEHICLE_TYPES = [
  { id: 'bike', label: 'Bike', icon: '🏍️', desc: '1 person' },
  { id: 'auto', label: 'Auto', icon: '🛺', desc: '1-3 persons' },
  { id: 'car', label: 'Car', icon: '🚗', desc: '1-4 persons' },
  { id: 'suv', label: 'SUV', icon: '🚙', desc: '1-6 persons' },
  { id: 'van', label: 'Van', icon: '🚐', desc: '1-8 persons' },
  { id: 'bus', label: 'Bus', icon: '🚌', desc: '9+ persons' },
];

export default function Transport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    pickupAddress: '',
    dropoffAddress: '',
    vehicleType: 'car',
    pickupTime: '',
    notes: '',
    bookingId: searchParams.get('bookingId') || '',
  });
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleEstimate(e) {
    e.preventDefault();
    if (!form.pickupAddress || !form.dropoffAddress) {
      toast.error('Enter pickup and dropoff addresses');
      return;
    }
    setEstimating(true);
    try {
      // Call real backend estimate API — uses OSM geocoding + OSRM routing
      const res = await api.get('/transport/estimate', {
        params: {
          pickupAddress: form.pickupAddress,
          dropoffAddress: form.dropoffAddress,
        },
      });
      setEstimate(res.data);
      if (res.data.distanceKm) {
        toast.success(`Route: ${res.data.distanceKm} km · ~${res.data.estimatedMinutes} min`, { icon: '📍' });
      }
    } catch (err) {
      toast.error(err.message || 'Could not calculate estimate. Check your addresses.');
    } finally {
      setEstimating(false);
    }
  }

  async function handleBook() {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      const res = await api.post('/transport', form);
      toast.success('Transport booked!');
      navigate('/my-transport');
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="transport-page">
      <div className="container">
        <div className="transport-header">
          <h1>Book Transport</h1>
          <p>Get a ride from anywhere to anywhere</p>
        </div>

        <div className="transport-layout">
          <div className="transport-form-section">
            <form onSubmit={handleEstimate} className="transport-form">
              <div className="form-group">
                <label className="form-label">📍 Pickup Location</label>
                <input
                  name="pickupAddress"
                  value={form.pickupAddress}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter pickup address"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">🏁 Drop-off Location</label>
                <input
                  name="dropoffAddress"
                  value={form.dropoffAddress}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter destination address"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">🚗 Vehicle Type</label>
                <div className="vehicle-grid">
                  {VEHICLE_TYPES.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      className={`vehicle-btn ${form.vehicleType === v.id ? 'active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, vehicleType: v.id }))}
                    >
                      <span className="vehicle-icon">{v.icon}</span>
                      <span className="vehicle-label">{v.label}</span>
                      <span className="vehicle-desc">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">🕐 Pickup Time (optional)</label>
                <input
                  name="pickupTime"
                  type="datetime-local"
                  value={form.pickupTime}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">📝 Notes (optional)</label>
                <input
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Any special instructions..."
                />
              </div>

              <button type="submit" className="btn btn-outline btn-full" disabled={estimating}>
                {estimating ? 'Calculating...' : '📊 Get Estimate'}
              </button>
            </form>
          </div>

          <div className="transport-estimate-section">
            {estimate ? (
              <div className="estimate-card">
                <h2>Fare Estimate</h2>
                <div className="estimate-meta">
                  <span>📏 {estimate.distanceKm} km</span>
                  <span>⏱ ~{estimate.estimatedMinutes} min</span>
                </div>

                <div className="estimate-options">
                  {estimate.estimates.map(e => {
                    const v = VEHICLE_TYPES.find(vt => vt.id === e.vehicleType);
                    return (
                      <div
                        key={e.vehicleType}
                        className={`estimate-option ${form.vehicleType === e.vehicleType ? 'selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, vehicleType: e.vehicleType }))}
                      >
                        <span className="estimate-icon">{v?.icon}</span>
                        <span className="estimate-type">{v?.label}</span>
                        <span className="estimate-fare">₹{e.fare}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={handleBook}
                  disabled={loading}
                >
                  {loading ? 'Booking...' : user ? '✅ Book Now' : 'Sign in to Book'}
                </button>
              </div>
            ) : (
              <div className="estimate-placeholder">
                <span>🚗</span>
                <p>Enter your route and get an instant fare estimate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
