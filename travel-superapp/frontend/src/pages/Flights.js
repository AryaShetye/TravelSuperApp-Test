import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import '../styles/flights.css';

const POPULAR_ROUTES = [
  { from: 'BOM', to: 'DEL', label: 'Mumbai → Delhi' },
  { from: 'BOM', to: 'GOI', label: 'Mumbai → Goa' },
  { from: 'DEL', to: 'BLR', label: 'Delhi → Bangalore' },
  { from: 'BOM', to: 'CCU', label: 'Mumbai → Kolkata' },
  { from: 'DEL', to: 'HYD', label: 'Delhi → Hyderabad' },
  { from: 'BLR', to: 'MAA', label: 'Bangalore → Chennai' },
];

export default function Flights() {
  const [form, setForm] = useState({
    from: 'BOM',
    to: 'DEL',
    departDate: '',
    returnDate: '',
    tripType: 'one_way',
  });
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [dataSource, setDataSource] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!form.from || !form.to || !form.departDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.from === form.to) {
      toast.error('Origin and destination cannot be the same');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = {
        from: form.from,
        to: form.to,
        departDate: form.departDate,
      };
      if (form.tripType === 'round_trip' && form.returnDate) {
        params.returnDate = form.returnDate;
      }

      const res = await api.get('/flights', { params });
      setFlights(res.data.flights || []);
      setDataSource(res.data.source || '');

      if (res.data.source === 'fallback') {
        toast('Showing estimated fares. Add SERPAPI_KEY for live prices.', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Could not fetch flights. Please try again.');
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }

  function setRoute(from, to) {
    setForm(prev => ({ ...prev, from, to }));
  }

  return (
    <div className="flights-page">
      <div className="flights-hero">
        <div className="container">
          <h1>✈️ Search Flights</h1>
          <p>Find the best fares for your journey across India</p>
        </div>
      </div>

      <div className="container">
        {/* Search Form */}
        <div className="flights-search-card">
          {/* Trip type toggle */}
          <div className="trip-type-tabs">
            {[
              { id: 'one_way', label: 'One Way' },
              { id: 'round_trip', label: 'Round Trip' },
            ].map(t => (
              <button
                key={t.id}
                className={`trip-tab ${form.tripType === t.id ? 'active' : ''}`}
                onClick={() => setForm(prev => ({ ...prev, tripType: t.id }))}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flights-form">
            <div className="flights-form-row">
              <div className="form-group">
                <label className="form-label">From (IATA code)</label>
                <input
                  name="from"
                  value={form.from}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. BOM, DEL, BLR"
                  required
                />
              </div>

              <button
                type="button"
                className="swap-btn"
                onClick={() => setForm(prev => ({ ...prev, from: prev.to, to: prev.from }))}
                title="Swap origin and destination"
              >
                ⇄
              </button>

              <div className="form-group">
                <label className="form-label">To (IATA code)</label>
                <input
                  name="to"
                  value={form.to}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="e.g. GOI, HYD, MAA"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Departure Date</label>
                <input
                  name="departDate"
                  type="date"
                  value={form.departDate}
                  onChange={handleChange}
                  className="form-input"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {form.tripType === 'round_trip' && (
                <div className="form-group">
                  <label className="form-label">Return Date</label>
                  <input
                    name="returnDate"
                    type="date"
                    value={form.returnDate}
                    onChange={handleChange}
                    className="form-input"
                    min={form.departDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary flights-search-btn" disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search Flights'}
              </button>
            </div>
          </form>

          {/* Popular routes */}
          <div className="popular-routes">
            <span className="popular-label">Popular routes:</span>
            {POPULAR_ROUTES.map(r => (
              <button
                key={`${r.from}-${r.to}`}
                className="route-chip"
                onClick={() => setRoute(r.from, r.to)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="flights-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flight-skeleton" />
            ))}
          </div>
        )}

        {!loading && searched && (
          <div className="flights-results">
            <div className="flights-results-header">
              <h2>
                {flights.length > 0
                  ? `${flights.length} flight${flights.length !== 1 ? 's' : ''} found`
                  : 'No flights found'}
                {form.from && form.to && ` · ${form.from} → ${form.to}`}
              </h2>
              {dataSource && (
                <span className={`source-badge ${dataSource === 'serpapi' ? 'live' : 'fallback'}`}>
                  {dataSource === 'serpapi' ? '🔴 Live Prices' : '📊 Estimated Prices'}
                </span>
              )}
            </div>

            {flights.length === 0 ? (
              <div className="empty-state">
                <span>✈️</span>
                <p>No flights found for this route. Try different dates or airports.</p>
              </div>
            ) : (
              <div className="flights-list">
                {flights.map(flight => (
                  <div key={flight.id} className="flight-card">
                    <div className="flight-airline">
                      {flight.airlineLogo ? (
                        <img src={flight.airlineLogo} alt={flight.airline} className="airline-logo" />
                      ) : (
                        <span className="airline-icon">✈️</span>
                      )}
                      <div>
                        <p className="airline-name">{flight.airline}</p>
                        <p className="flight-number">{flight.flightNumber}</p>
                      </div>
                    </div>

                    <div className="flight-route">
                      <div className="flight-time">
                        <span className="time">{flight.departureTime}</span>
                        <span className="airport">{flight.fromCode || flight.from}</span>
                      </div>
                      <div className="flight-duration">
                        <span className="duration-line" />
                        <span className="duration-text">{flight.duration}</span>
                        <span className="stops-text">
                          {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="flight-time">
                        <span className="time">{flight.arrivalTime}</span>
                        <span className="airport">{flight.toCode || flight.to}</span>
                      </div>
                    </div>

                    <div className="flight-price">
                      {flight.price ? (
                        <>
                          <span className="price-amount">₹{Number(flight.price).toLocaleString('en-IN')}</span>
                          <span className="price-per">per person</span>
                        </>
                      ) : (
                        <span className="price-na">Price N/A</span>
                      )}
                      <span className="flight-class">{flight.class}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="flights-placeholder">
            <span>✈️</span>
            <p>Enter your route and dates to search for flights</p>
            <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.5rem' }}>
              Use IATA codes: BOM (Mumbai), DEL (Delhi), BLR (Bangalore), GOI (Goa), HYD (Hyderabad)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
