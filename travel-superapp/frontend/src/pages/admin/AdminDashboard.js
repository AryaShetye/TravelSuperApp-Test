import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import '../../styles/manager-dashboard.css';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/users'),
    ])
      .then(([dashRes, usersRes]) => {
        setData(dashRes.data.data);
        setUsers(usersRes.data.users);
      })
      .catch(() => toast.error('Could not load admin data'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleUser(userId, isActive) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive: !isActive });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Action failed');
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  const ROLE_COLORS = {
    traveler: '#3b82f6', property_manager: '#8b5cf6',
    agent: '#f59e0b', driver: '#22c55e', admin: '#ef4444',
  };

  return (
    <div className="manager-page">
      <div className="container">
        <h1 className="manager-page-title">🛡️ Admin Dashboard</h1>
        <p className="manager-page-subtitle">System-level overview and management.</p>

        {/* Stat cards */}
        <div className="stats-grid">
          {[
            { icon: '👥', label: 'Total Users',      value: data?.totalUsers ?? 0 },
            { icon: '🏠', label: 'Properties',        value: data?.totalProperties ?? 0 },
            { icon: '📅', label: 'Total Bookings',    value: data?.totalBookings ?? 0 },
            { icon: '🧳', label: 'Tour Packages',     value: data?.totalPackages ?? 0 },
            { icon: '🚗', label: 'Transport Trips',   value: data?.totalTransport ?? 0 },
            { icon: '💰', label: 'Platform Revenue',  value: `₹${(data?.totalRevenue || 0).toLocaleString('en-IN')}` },
          ].map(card => (
            <div key={card.label} className="stat-card">
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Role breakdown */}
        {data?.roleBreakdown && (
          <div className="manager-table-wrapper" style={{ marginBottom: '24px' }}>
            <h2 className="manager-table-title">Users by Role</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px' }}>
              {Object.entries(data.roleBreakdown).map(([role, count]) => (
                <div key={role} style={{
                  background: `${ROLE_COLORS[role] || '#6366f1'}15`,
                  border: `1px solid ${ROLE_COLORS[role] || '#6366f1'}40`,
                  borderRadius: '8px', padding: '12px 20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ROLE_COLORS[role] || '#6366f1' }}>{count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>{role.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking status breakdown */}
        {data?.bookingsByStatus && (
          <div className="manager-table-wrapper" style={{ marginBottom: '24px' }}>
            <h2 className="manager-table-title">Bookings by Status</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '16px' }}>
              {Object.entries(data.bookingsByStatus).map(([status, count]) => (
                <div key={status} style={{
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: '8px', padding: '12px 20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>{status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="manager-table-wrapper">
          <div className="manager-table-header">
            <h2 className="manager-table-title">All Users</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.firstName} {u.lastName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                    <td>
                      <span style={{
                        background: `${ROLE_COLORS[u.role] || '#6366f1'}15`,
                        color: ROLE_COLORS[u.role] || '#6366f1',
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: u.isActive ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                        {u.isActive ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#666' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className={u.isActive ? 'btn-reject' : 'btn-accept'}
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => toggleUser(u.id, u.isActive)}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
