import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/agent-dashboard.css';

export default function AgentPackageForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({
    title: '', description: '', destination: '',
    durationDays: 1, pricePerPerson: '', maxPersons: 10,
    includesStay: true, includesTransport: true, includesActivities: false,
    activities: '', itineraryDays: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/packages/${id}`)
        .then(res => {
          const p = res.data.package;
          setForm({
            title: p.title, description: p.description, destination: p.destination,
            durationDays: p.durationDays, pricePerPerson: p.pricePerPerson,
            maxPersons: p.maxPersons,
            includesStay: p.includesStay, includesTransport: p.includesTransport,
            includesActivities: p.includesActivities,
            activities: (p.activities || []).join('\n'),
            itineraryDays: JSON.stringify(p.itineraryDays || [], null, 2),
          });
        })
        .catch(() => toast.error('Failed to load package'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationDays: parseInt(form.durationDays),
        pricePerPerson: parseFloat(form.pricePerPerson),
        maxPersons: parseInt(form.maxPersons),
        activities: form.activities.split('\n').filter(a => a.trim()),
        itineraryDays: form.itineraryDays ? JSON.parse(form.itineraryDays) : [],
      };

      if (isEdit) {
        await api.put(`/packages/${id}`, payload);
        toast.success('Package updated');
      } else {
        await api.post('/packages', payload);
        toast.success('Package created!');
      }
      navigate('/agent/packages');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="agent-dashboard">
      <div className="container">
        <h1>{isEdit ? 'Edit Package' : 'Create Tour Package'}</h1>

        <form onSubmit={handleSubmit} className="package-form">
          <div className="form-group">
            <label className="form-label">Package Title *</label>
            <input name="title" value={form.title} onChange={handleChange}
              className="form-input" placeholder="e.g. Goa Beach Getaway 5D/4N" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="form-input" rows={4} placeholder="Describe the package..." required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Destination *</label>
              <input name="destination" value={form.destination} onChange={handleChange}
                className="form-input" placeholder="e.g. Goa, India" required />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (days) *</label>
              <input name="durationDays" type="number" min="1" value={form.durationDays}
                onChange={handleChange} className="form-input" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price per Person (₹) *</label>
              <input name="pricePerPerson" type="number" min="0" value={form.pricePerPerson}
                onChange={handleChange} className="form-input" placeholder="5000" required />
            </div>
            <div className="form-group">
              <label className="form-label">Max Persons</label>
              <input name="maxPersons" type="number" min="1" value={form.maxPersons}
                onChange={handleChange} className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Package Includes</label>
            <div className="checkbox-group">
              <label><input type="checkbox" name="includesStay" checked={form.includesStay} onChange={handleChange} /> 🏠 Stay</label>
              <label><input type="checkbox" name="includesTransport" checked={form.includesTransport} onChange={handleChange} /> 🚗 Transport</label>
              <label><input type="checkbox" name="includesActivities" checked={form.includesActivities} onChange={handleChange} /> 🎯 Activities</label>
            </div>
          </div>

          {form.includesActivities && (
            <div className="form-group">
              <label className="form-label">Activities (one per line)</label>
              <textarea name="activities" value={form.activities} onChange={handleChange}
                className="form-input" rows={4} placeholder="Scuba diving&#10;Beach bonfire&#10;Sunset cruise" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Day-wise Itinerary (JSON array, optional)</label>
            <textarea name="itineraryDays" value={form.itineraryDays} onChange={handleChange}
              className="form-input form-input--mono" rows={6}
              placeholder='[{"day":1,"title":"Arrival","description":"Check-in and relax"}]' />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/agent/packages')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
