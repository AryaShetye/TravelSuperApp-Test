import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/driver-dashboard.css';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const STATUS_COLORS = {
  pending: '#f59e0b', accepted: '#3b82f6', in_progress: '#8b5cf6',
  completed: '#22c55e', cancelled: '#ef4444',
};

function TripMap({ trip }) {
  if (!trip.pickupLat || !trip.dropoffLat) {
    return (
      <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
        📍 Map unavailable — coordinates not provided
      </div>
    );
  }

  const center = [
    (trip.pickupLat + trip.dropoffLat) / 2,
    (trip.pickupLng + trip.dropoffLng) / 2,
  ];

  const routeLine = [
    [trip.pickupLat, trip.pickupLng],
    [trip.dropoffLat, trip.dropoffLng],
  ];

  return (
    <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', marginTop: '0.75rem' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Marker position={[trip.pickupLat, trip.pickupLng]} icon={pickupIcon}>
          <Popup>📍 Pickup: {trip.pickupAddress}</Popup>
        </Marker>
        <Marker position={[trip.dropoffLat, trip.dropoffLng]} icon={dropoffIcon}>
          <Popup>🏁 Drop-off: {trip.dropoffAddress}</Popup>
        </Marker>
        <Polyline positions={routeLine} color="#6366f1" weight={3} dashArray="8 4" />
      </MapContainer>
    </div>
  );
}

export default function DriverTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState(null);
  const [expandedMap, setExpandedMap] = useState(null);

  useEffect(() => { fetchTrips(); }, [filter]);

  async function fetchTrips() {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const res = await api.get('/driver/trips', { params });
      setTrips(res.data.trips);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(tripId, status) {
    setUpdating(tripId);
    try {
      await api.patch(`/transport/${tripId}/status`, { status });
      toast.success('Status updated');
      fetchTrips();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="driver-dashboard">
      <div className="container">
        <h1>My Trips</h1>

        <div className="filter-tabs">
          {['', 'accepted', 'in_progress', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              className={`filter-tab ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>

        {trips.length === 0 ? (
          <div className="empty-state">
            <span>🚗</span>
            <p>No trips found</p>
          </div>
        ) : (
          <div className="trips-list">
            {trips.map(trip => (
              <div key={trip.id} className="trip-card trip-card--full">
                {/* Route */}
                <div className="trip-route">
                  <div className="route-point">
                    <span className="route-dot pickup-dot" />
                    <span>{trip.pickupAddress}</span>
                  </div>
                  <div className="route-line" />
                  <div className="route-point">
                    <span className="route-dot dropoff-dot" />
                    <span>{trip.dropoffAddress}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="trip-details">
                  <span>👤 {trip.traveler ? `${trip.traveler.firstName} ${trip.traveler.lastName}` : 'Passenger'}</span>
                  {trip.traveler?.phone && <span>📞 {trip.traveler.phone}</span>}
                  {trip.distanceKm && <span>📏 {trip.distanceKm} km</span>}
                  {trip.estimatedMinutes && <span>⏱ ~{trip.estimatedMinutes} min</span>}
                  {trip.fare && <span style={{ fontWeight: 700, color: '#22c55e' }}>💵 ₹{trip.fare}</span>}
                  <span
                    className="status-badge"
                    style={{ background: `${STATUS_COLORS[trip.status]}20`, color: STATUS_COLORS[trip.status] }}
                  >
                    {trip.status.replace('_', ' ')}
                  </span>
                </div>

                {trip.notes && <p className="trip-notes">📝 {trip.notes}</p>}

                {/* Map toggle */}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setExpandedMap(expandedMap === trip.id ? null : trip.id)}
                >
                  {expandedMap === trip.id ? '🗺️ Hide Map' : '🗺️ Show Route Map'}
                </button>

                {expandedMap === trip.id && <TripMap trip={trip} />}

                {/* Actions */}
                <div className="trip-actions" style={{ marginTop: '0.75rem' }}>
                  {trip.status === 'accepted' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => updateStatus(trip.id, 'in_progress')}
                      disabled={updating === trip.id}
                    >
                      🚀 Start Trip
                    </button>
                  )}
                  {trip.status === 'in_progress' && (
                    <button
                      className="btn btn-sm"
                      style={{ background: '#22c55e', color: '#fff', border: 'none' }}
                      onClick={() => updateStatus(trip.id, 'completed')}
                      disabled={updating === trip.id}
                    >
                      ✅ Complete Trip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
