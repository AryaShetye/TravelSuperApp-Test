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

function RouteMap({ req }) {
  if (!req.pickupLat || !req.dropoffLat) return null;

  const center = [(req.pickupLat + req.dropoffLat) / 2, (req.pickupLng + req.dropoffLng) / 2];
  const routeLine = [[req.pickupLat, req.pickupLng], [req.dropoffLat, req.dropoffLng]];

  return (
    <div style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', marginTop: '0.75rem' }}>
      <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[req.pickupLat, req.pickupLng]} icon={pickupIcon}>
          <Popup>📍 Pickup: {req.pickupAddress}</Popup>
        </Marker>
        <Marker position={[req.dropoffLat, req.dropoffLng]} icon={dropoffIcon}>
          <Popup>🏁 Drop-off: {req.dropoffAddress}</Popup>
        </Marker>
        <Polyline positions={routeLine} color="#f59e0b" weight={3} dashArray="8 4" />
      </MapContainer>
    </div>
  );
}

export default function DriverRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [expandedMap, setExpandedMap] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await api.get('/transport/driver/requests', { params: { status: 'pending' } });
      setRequests(res.data.transports);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }

  async function acceptTrip(id) {
    setAccepting(id);
    try {
      await api.patch(`/transport/${id}/accept`);
      toast.success('Trip accepted! Check My Trips to manage it.');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to accept trip');
    } finally {
      setAccepting(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="driver-dashboard">
      <div className="container">
        <h1>Available Trip Requests</h1>
        <p className="subtitle">Accept trips to start earning. Each trip shows distance and fare.</p>

        {requests.length === 0 ? (
          <div className="empty-state">
            <span>🔍</span>
            <p>No pending requests right now. Check back soon!</p>
          </div>
        ) : (
          <div className="trips-list">
            {requests.map(req => (
              <div key={req.id} className="trip-card trip-card--request">
                {/* Route */}
                <div className="trip-route">
                  <div className="route-point">
                    <span className="route-dot pickup-dot" />
                    <span><strong>From:</strong> {req.pickupAddress}</span>
                  </div>
                  <div className="route-line" />
                  <div className="route-point">
                    <span className="route-dot dropoff-dot" />
                    <span><strong>To:</strong> {req.dropoffAddress}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="trip-details">
                  <span>🚗 {req.vehicleType?.toUpperCase()}</span>
                  {req.distanceKm && (
                    <span style={{ fontWeight: 600 }}>📏 {req.distanceKm} km away</span>
                  )}
                  {req.estimatedMinutes && <span>⏱ ~{req.estimatedMinutes} min</span>}
                  {req.fare && (
                    <span className="fare-highlight" style={{ fontWeight: 700, color: '#22c55e', fontSize: '1rem' }}>
                      💵 ₹{req.fare}
                    </span>
                  )}
                  {req.pickupTime && (
                    <span>🕐 {new Date(req.pickupTime).toLocaleString('en-IN')}</span>
                  )}
                </div>

                {req.notes && <p className="trip-notes">📝 {req.notes}</p>}

                {/* Map toggle */}
                {(req.pickupLat && req.dropoffLat) && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                    onClick={() => setExpandedMap(expandedMap === req.id ? null : req.id)}
                  >
                    {expandedMap === req.id ? '🗺️ Hide Map' : '🗺️ View Route on Map'}
                  </button>
                )}

                {expandedMap === req.id && <RouteMap req={req} />}

                {/* Accept button */}
                <div className="trip-actions" style={{ marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => acceptTrip(req.id)}
                    disabled={accepting === req.id}
                  >
                    {accepting === req.id ? 'Accepting...' : '✅ Accept Trip'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
