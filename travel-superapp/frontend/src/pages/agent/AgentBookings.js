import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/agent-dashboard.css';

const STATUS_COLORS = {
  pending: '#f59e0b', confirmed: '#22c55e', cancelled: '#ef4444', completed: '#6366f1',
};

export default function AgentBookings() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => { fetchPackages(); }, []);

  async function fetchPackages() {
    try {
      const res = await api.get('/packages/agent/my-packages');
      setPackages(res.data.packages);
    } catch {
      toast.error('Failed to load package bookings');
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(bookingId, status) {
    setUpdating(bookingId);
    try {
      await api.patch(`/packages/bookings/${bookingId}/status`, { status });
      toast.success(`Booking ${status}`);
      fetchPackages();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const allBookings = packages.flatMap(pkg =>
    (pkg.bookings || []).map(b => ({ ...b, packageTitle: pkg.title, packageDest: pkg.destination }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="agent-dashboard">
      <div className="container">
        <h1>Package Bookings</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Manage bookings from travelers for your tour packages.
        </p>

        {allBookings.length === 0 ? (
          <div className="empty-state">
            <span>📋</span>
            <p>No bookings yet. Share your packages to get bookings!</p>
          </div>
        ) : (
          <div className="packages-table-wrapper">
            <table className="packages-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Destination</th>
                  <th>Persons</th>
                  <th>Travel Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allBookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.packageTitle}</td>
                    <td>📍 {b.packageDest}</td>
                    <td>{b.persons}</td>
                    <td>{b.travelDate ? format(new Date(b.travelDate), 'dd MMM yyyy') : '—'}</td>
                    <td>₹{parseFloat(b.totalAmount).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        background: `${STATUS_COLORS[b.status]}20`,
                        color: STATUS_COLORS[b.status],
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td className="table-actions">
                      {b.status === 'pending' && (
                        <>
                          <button
                            className="btn-accept"
                            onClick={() => updateBookingStatus(b.id, 'confirmed')}
                            disabled={updating === b.id}
                          >
                            ✓ Confirm
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => updateBookingStatus(b.id, 'cancelled')}
                            disabled={updating === b.id}
                          >
                            ✕ Cancel
                          </button>
                        </>
                      )}
                      {b.status === 'confirmed' && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => updateBookingStatus(b.id, 'completed')}
                          disabled={updating === b.id}
                        >
                          ✅ Mark Complete
                        </button>
                      )}
                      {['cancelled', 'completed'].includes(b.status) && (
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
