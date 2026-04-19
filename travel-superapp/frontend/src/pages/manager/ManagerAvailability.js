import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth,
         eachDayOfInterval, isSameMonth, isToday, isPast, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/manager-dashboard.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ManagerAvailability() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [blockForm, setBlockForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [blocking, setBlocking] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchPropertyDetail();
      fetchBookings();
    }
  }, [selectedPropertyId]);

  async function fetchProperties() {
    try {
      const res = await api.get('/manager/properties');
      const props = res.data.data.properties;
      setProperties(props);
      if (props.length > 0) setSelectedPropertyId(props[0]._id);
    } catch {
      toast.error('Could not load properties');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPropertyDetail() {
    try {
      const res = await api.get(`/properties/${selectedPropertyId}`);
      setSelectedProperty(res.data.property);
    } catch {
      // non-critical
    }
  }

  async function fetchBookings() {
    try {
      const res = await api.get('/manager/bookings', {
        params: { limit: 100 },
      });
      const all = res.data.data.bookings;
      setBookings(all.filter((b) => b.propertyId === selectedPropertyId));
    } catch {
      // non-critical
    }
  }

  // ─── Determine day state ──────────────────────────────────────────────────
  function getDayState(date) {
    const d = date.getTime();
    const isBooked = bookings.some((b) => {
      const ci = new Date(b.checkIn).getTime();
      const co = new Date(b.checkOut).getTime();
      return d >= ci && d < co && ['pending', 'confirmed'].includes(b.status);
    });
    if (isBooked) return 'booked';

    const isBlocked = selectedProperty?.blockedDates?.some((block) => {
      const s = new Date(block.startDate).getTime();
      const e = new Date(block.endDate).getTime();
      return d >= s && d < e;
    });
    if (isBlocked) return 'blocked';

    return 'available';
  }

  // ─── Block dates ──────────────────────────────────────────────────────────
  async function handleBlockDates(e) {
    e.preventDefault();
    if (!blockForm.startDate || !blockForm.endDate) {
      toast.error('Please select start and end dates');
      return;
    }
    if (new Date(blockForm.startDate) >= new Date(blockForm.endDate)) {
      toast.error('Start date must be before end date');
      return;
    }

    setBlocking(true);
    try {
      await api.post(`/manager/properties/${selectedPropertyId}/block-dates`, blockForm);
      toast.success('Dates blocked successfully');
      setBlockForm({ startDate: '', endDate: '', reason: '' });
      fetchPropertyDetail();
    } catch (err) {
      toast.error(err.message || 'Could not block dates');
    } finally {
      setBlocking(false);
    }
  }

  // ─── Unblock dates ────────────────────────────────────────────────────────
  async function handleUnblock(blockId) {
    if (!window.confirm('Remove this date block?')) return;
    setRemovingId(blockId);
    try {
      await api.delete(`/manager/properties/${selectedPropertyId}/block-dates/${blockId}`);
      toast.success('Date block removed');
      fetchPropertyDetail();
    } catch {
      toast.error('Could not remove block');
    } finally {
      setRemovingId(null);
    }
  }

  // ─── Calendar days ────────────────────────────────────────────────────────
  function buildCalendarDays() {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start with empty cells
    const startPad = start.getDay(); // 0=Sun
    return { days, startPad };
  }

  if (loading) return <LoadingSpinner fullPage />;

  const { days, startPad } = buildCalendarDays();

  return (
    <div className="manager-page">
      <div className="container">
        <h1 className="manager-page-title">Availability Management</h1>
        <p className="manager-page-subtitle">Block dates to prevent bookings during unavailable periods.</p>

        {properties.length === 0 ? (
          <div className="manager-empty">
            <div className="manager-empty__icon" aria-hidden="true">🏠</div>
            <h2 className="manager-empty__title">No properties yet</h2>
            <p className="manager-empty__text">Add a property first to manage its availability.</p>
          </div>
        ) : (
          <>
            {/* Property selector */}
            <div className="form-group" style={{ maxWidth: '400px', marginBottom: '24px' }}>
              <label htmlFor="property-select" className="form-label">Select property</label>
              <select
                id="property-select"
                className="form-input"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                aria-label="Select property to manage availability"
              >
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div className="availability-layout">
              {/* Calendar */}
              <div className="calendar-grid" aria-label="Availability calendar">
                <div className="calendar-month-header">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                    aria-label="Previous month"
                  >←</button>
                  <h2 className="calendar-month-title">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                    aria-label="Next month"
                  >→</button>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[
                    { cls: 'calendar-day--booked', label: 'Booked' },
                    { cls: 'calendar-day--blocked', label: 'Blocked' },
                  ].map((l) => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <div className={`calendar-day ${l.cls}`} style={{ width: '20px', height: '20px', borderRadius: '4px' }} aria-hidden="true" />
                      {l.label}
                    </div>
                  ))}
                </div>

                <div className="calendar-days-grid" role="grid" aria-label={format(currentMonth, 'MMMM yyyy')}>
                  {/* Day labels */}
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="calendar-day-label" role="columnheader">{d}</div>
                  ))}

                  {/* Empty padding cells */}
                  {Array.from({ length: startPad }).map((_, i) => (
                    <div key={`pad-${i}`} role="gridcell" aria-hidden="true" />
                  ))}

                  {/* Day cells */}
                  {days.map((day) => {
                    const state = getDayState(day);
                    const past = isPast(day) && !isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        role="gridcell"
                        aria-label={`${format(day, 'dd MMM yyyy')} — ${state}`}
                        className={[
                          'calendar-day',
                          state === 'booked' ? 'calendar-day--booked' : '',
                          state === 'blocked' ? 'calendar-day--blocked' : '',
                          isToday(day) ? 'calendar-day--today' : '',
                          past ? 'calendar-day--past' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {format(day, 'd')}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Block date form + existing blocks */}
              <div>
                <form onSubmit={handleBlockDates} className="block-date-form" aria-label="Block dates form">
                  <h2 className="block-date-form-title">Block Dates</h2>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="block-start" className="form-label">Start date *</label>
                    <input
                      id="block-start" type="date"
                      value={blockForm.startDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setBlockForm((p) => ({ ...p, startDate: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="block-end" className="form-label">End date *</label>
                    <input
                      id="block-end" type="date"
                      value={blockForm.endDate}
                      min={blockForm.startDate || format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setBlockForm((p) => ({ ...p, endDate: e.target.value }))}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="block-reason" className="form-label">
                      Reason <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="block-reason" type="text"
                      value={blockForm.reason}
                      onChange={(e) => setBlockForm((p) => ({ ...p, reason: e.target.value }))}
                      className="form-input"
                      placeholder="e.g. Personal use, Maintenance"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-full" disabled={blocking} aria-busy={blocking}>
                    {blocking ? 'Blocking...' : '🚫 Block these dates'}
                  </button>
                </form>

                {/* Existing blocked ranges */}
                {selectedProperty?.blockedDates?.length > 0 && (
                  <div className="blocked-ranges-list">
                    <h3 className="blocked-ranges-title">Blocked Periods</h3>
                    {selectedProperty.blockedDates.map((block) => (
                      <div key={block._id} className="blocked-range">
                        <div>
                          <div className="blocked-range__dates">
                            {format(new Date(block.startDate), 'dd MMM')} → {format(new Date(block.endDate), 'dd MMM yyyy')}
                          </div>
                          {block.reason && (
                            <div className="blocked-range__reason">{block.reason}</div>
                          )}
                        </div>
                        <button
                          className="blocked-range__remove"
                          onClick={() => handleUnblock(block._id)}
                          disabled={removingId === block._id}
                          aria-label="Remove this date block"
                        >
                          {removingId === block._id ? '⏳' : '✕'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
