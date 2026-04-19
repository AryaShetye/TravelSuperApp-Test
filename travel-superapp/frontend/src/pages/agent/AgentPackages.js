import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/agent-dashboard.css';

export default function AgentPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPackages(); }, []);

  async function fetchPackages() {
    try {
      const res = await api.get('/packages/agent/my-packages');
      setPackages(res.data.packages);
    } catch {
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  async function deletePackage(id) {
    if (!window.confirm('Remove this package?')) return;
    try {
      await api.delete(`/packages/${id}`);
      toast.success('Package removed');
      fetchPackages();
    } catch {
      toast.error('Failed to remove package');
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="agent-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>My Packages</h1>
          <Link to="/agent/packages/new" className="btn btn-primary">+ New Package</Link>
        </div>

        {packages.length === 0 ? (
          <div className="empty-state">
            <span>🧳</span>
            <p>No packages yet</p>
            <Link to="/agent/packages/new" className="btn btn-primary">Create your first package</Link>
          </div>
        ) : (
          <div className="packages-table-wrapper">
            <table className="packages-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Destination</th>
                  <th>Duration</th>
                  <th>Price/Person</th>
                  <th>Bookings</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => (
                  <tr key={pkg.id}>
                    <td>{pkg.title}</td>
                    <td>📍 {pkg.destination}</td>
                    <td>{pkg.durationDays}d</td>
                    <td>₹{parseFloat(pkg.pricePerPerson).toLocaleString('en-IN')}</td>
                    <td>{pkg.bookings?.length || 0}</td>
                    <td className="table-actions">
                      <Link to={`/agent/packages/${pkg.id}/edit`} className="btn btn-outline btn-sm">Edit</Link>
                      <Link to={`/packages/${pkg.id}`} className="btn btn-ghost btn-sm">View</Link>
                      <button onClick={() => deletePackage(pkg.id)} className="btn btn-danger btn-sm">Remove</button>
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
