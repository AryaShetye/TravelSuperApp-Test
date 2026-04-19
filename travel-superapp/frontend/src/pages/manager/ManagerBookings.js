import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import '../../styles/manager-dashboard.css';

const STATUS_CLASS = {
  pending: 'booking-status--pending',
  confirmed: 'booking-status--confirmed',
  cancelled: 'booking-status--cancelled',
  completed: 'booking-status--completed',
  refunded: 'booking-status--refunded',
};

export default function ManagerBookings() {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/manager/bookings', { params });
      setBookings(res.data.data.bookings);
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Could not load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  async function handleStatusUpdate(bookingId, status) {
    let cancellationReason = '';
    if (status === 'cancelled') {
      cancellationReason = window.prompt('Reason for cancellation (required):');
      if (!cancellationReason) return; // user cancelled the prompt
    }

    setActionLoading(bookingId);
    try {
      await api.patch(`/manager/bookings/${bookingId}/status`, {
        status,
        ...(cancellationReason && { cancellationReason }),
      });
      toast.success(status === 'confirmed' ? '✅ Booking confirmed' : '❌ Booking rejected');
      fetchBookings();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="manager-page">
      <div className="container">
        <h1 className="manager-page-title">Booking Management</h1>
        <p className="manager-page-subtitle">Review and manage reservations for your properties.</p>

        {/* Filters */}
        <div className="manager-filters">
          <label htmlFor="status-filter" className="form-label" style={{ marginBottom: 0 }}>
            Filter by status:
          </label>
          <select
            id="status-filter"
            className="manager-filter-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Filter bookings by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {pagination.total} booking{pagination.total !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : bookings.length === 0 ? (
          <div className="manager-empty">
            <div className="manager-empty__icon" aria-hidden="true">📭</div>
            <h2 className="manager-empty__title">No bookings found</h2>
            <p className="manager-empty__text">
              {statusFilter ? `No ${statusFilter} bookings.` : 'No bookings yet for your properties.'}
            </p>
          </div>
        ) : (
          <>
            <div className="manager-table-wrapper">
              <div style={{ overflowX: 'auto' }}>
                <table className="manager-table" aria-label="Bookings table">
                  <thead>
                    <tr>
                      <th>Guest</th>
                      <th>Property</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Guests</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.guestName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{b.guestEmail}</div>
                        </td>
                        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.propertyName}
                        </td>
                        <td>{format(new Date(b.checkIn), 'dd MMM yyyy')}</td>
                        <td>{format(new Date(b.checkOut), 'dd MMM yyyy')}</td>
                        <td>{b.guests}</td>
                        <td>₹{Number(b.totalAmount).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`booking-status ${STATUS_CLASS[b.status] || ''}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === 'pending' ? (
                            <div className="table-actions">
                              <button
                                className="btn-accept"
                                onClick={() => handleStatusUpdate(b.id, 'confirmed')}
                                disabled={actionLoading === b.id}
                                aria-label={`Accept booking from ${b.guestName}`}
                              >
                                ✓ Accept
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                                disabled={actionLoading === b.id}
                                aria-label={`Reject booking from ${b.guestName}`}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>
    </div>
  );
}
