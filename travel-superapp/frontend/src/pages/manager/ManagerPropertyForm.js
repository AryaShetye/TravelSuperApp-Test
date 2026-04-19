import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import '../../styles/manager-dashboard.css';

const PROPERTY_TYPES = [
  { value: 'entire_home', label: 'Entire Home' },
  { value: 'private_room', label: 'Private Room' },
  { value: 'shared_room', label: 'Shared Room' },
  { value: 'villa', label: 'Villa' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'farmhouse', label: 'Farmhouse' },
];

const AMENITY_OPTIONS = [
  { name: 'WiFi', icon: '📶' },
  { name: 'Air Conditioning', icon: '❄️' },
  { name: 'Kitchen', icon: '🍳' },
  { name: 'Parking', icon: '🚗' },
  { name: 'Pool', icon: '🏊' },
  { name: 'Beach Access', icon: '🏖️' },
  { name: 'Mountain View', icon: '⛰️' },
  { name: 'Fireplace', icon: '🔥' },
  { name: 'Washer', icon: '🫧' },
  { name: 'TV', icon: '📺' },
  { name: 'Gym', icon: '🏋️' },
  { name: 'Balcony', icon: '🌅' },
];

const EMPTY_FORM = {
  title: '', description: '', propertyType: 'entire_home',
  pricePerNight: '', maxGuests: '', bedrooms: '', beds: '', bathrooms: '',
  cleaningFee: '0', securityDeposit: '0', weeklyDiscount: '0', monthlyDiscount: '0',
  minimumStay: '1', maximumStay: '365', instantBook: false,
  address: '', city: '', state: '', country: 'India', zipCode: '',
  amenities: [],
  checkInTime: '14:00', checkOutTime: '11:00',
  smokingAllowed: false, petsAllowed: false, partiesAllowed: false,
};

export default function ManagerPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) fetchProperty();
  }, [id]);

  async function fetchProperty() {
    try {
      const res = await api.get(`/properties/${id}`);
      const p = res.data.property;
      setForm({
        title: p.title || '',
        description: p.description || '',
        propertyType: p.propertyType || 'entire_home',
        pricePerNight: p.pricePerNight || '',
        maxGuests: p.maxGuests || '',
        bedrooms: p.bedrooms || '',
        beds: p.beds || '',
        bathrooms: p.bathrooms || '',
        cleaningFee: p.cleaningFee ?? '0',
        securityDeposit: p.securityDeposit ?? '0',
        weeklyDiscount: p.weeklyDiscount ?? '0',
        monthlyDiscount: p.monthlyDiscount ?? '0',
        minimumStay: p.minimumStay || '1',
        maximumStay: p.maximumStay || '365',
        instantBook: p.instantBook || false,
        address: p.location?.address || '',
        city: p.location?.city || '',
        state: p.location?.state || '',
        country: p.location?.country || 'India',
        zipCode: p.location?.zipCode || '',
        amenities: p.amenities?.map((a) => a.name) || [],
        checkInTime: p.houseRules?.checkInTime || '14:00',
        checkOutTime: p.houseRules?.checkOutTime || '11:00',
        smokingAllowed: p.houseRules?.smokingAllowed || false,
        petsAllowed: p.houseRules?.petsAllowed || false,
        partiesAllowed: p.houseRules?.partiesAllowed || false,
      });
      setExistingImages(p.images || []);
    } catch {
      toast.error('Could not load property');
      navigate('/manager/properties');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function toggleAmenity(name) {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(name)
        ? prev.amenities.filter((a) => a !== name)
        : [...prev.amenities, name],
    }));
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    const total = imageFiles.length + existingImages.length + files.length;
    if (total > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  }

  function removeNewImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  function validate() {
    const errs = {};
    if (!form.title.trim() || form.title.length < 10) errs.title = 'Title must be at least 10 characters';
    if (!form.description.trim() || form.description.length < 50) errs.description = 'Description must be at least 50 characters';
    if (!form.pricePerNight || Number(form.pricePerNight) < 100) errs.pricePerNight = 'Minimum price is ₹100';
    if (!form.maxGuests || Number(form.maxGuests) < 1) errs.maxGuests = 'At least 1 guest required';
    if (!form.bedrooms && form.bedrooms !== 0) errs.bedrooms = 'Required';
    if (!form.beds || Number(form.beds) < 1) errs.beds = 'At least 1 bed required';
    if (!form.bathrooms || Number(form.bathrooms) < 0.5) errs.bathrooms = 'Required';
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.state.trim()) errs.state = 'State is required';
    if (!isEdit && imageFiles.length === 0) errs.images = 'At least one image is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the errors below');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // Append all text fields
      const textFields = [
        'title', 'description', 'propertyType', 'pricePerNight', 'maxGuests',
        'bedrooms', 'beds', 'bathrooms', 'cleaningFee', 'securityDeposit',
        'weeklyDiscount', 'monthlyDiscount', 'minimumStay', 'maximumStay',
        'instantBook', 'address', 'city', 'state', 'country', 'zipCode',
      ];
      textFields.forEach((field) => formData.append(field, form[field]));

      // Amenities as JSON
      const amenitiesPayload = form.amenities.map((name) => {
        const found = AMENITY_OPTIONS.find((a) => a.name === name);
        return { name, icon: found?.icon || '✓' };
      });
      formData.append('amenities', JSON.stringify(amenitiesPayload));

      // House rules as JSON
      formData.append('houseRules', JSON.stringify({
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        smokingAllowed: form.smokingAllowed,
        petsAllowed: form.petsAllowed,
        partiesAllowed: form.partiesAllowed,
      }));

      // Image files
      imageFiles.forEach((file) => formData.append('images', file));

      if (isEdit) {
        await api.put(`/properties/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Property updated successfully');
      } else {
        await api.post('/properties', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Property listed successfully 🎉');
      }

      navigate('/manager/properties');
    } catch (err) {
      toast.error(err.message || 'Failed to save property');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="manager-page">
      <div className="container">
        <h1 className="manager-page-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
        <p className="manager-page-subtitle">
          {isEdit ? 'Update your listing details.' : 'Fill in the details to list your property.'}
        </p>

        <form onSubmit={handleSubmit} noValidate aria-label="Property form">
          <div className="manager-form">

            {/* ─── Basic Info ─────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Basic Information</h2>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="title" className="form-label">Property title *</label>
                <input id="title" name="title" type="text" value={form.title}
                  onChange={handleChange} className={`form-input ${errors.title ? 'input-error' : ''}`}
                  placeholder="e.g. Cozy Beachside Cottage in Goa" maxLength={100} />
                {errors.title && <span className="field-error" role="alert">{errors.title}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="description" className="form-label">Description *</label>
                <textarea id="description" name="description" value={form.description}
                  onChange={handleChange} rows={5}
                  className={`form-input ${errors.description ? 'input-error' : ''}`}
                  placeholder="Describe your property in detail (min. 50 characters)" maxLength={2000}
                  style={{ resize: 'vertical' }} />
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {form.description.length}/2000
                </span>
                {errors.description && <span className="field-error" role="alert">{errors.description}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="propertyType" className="form-label">Property type *</label>
                <select id="propertyType" name="propertyType" value={form.propertyType}
                  onChange={handleChange} className="form-input">
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ─── Capacity ────────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Capacity & Rooms</h2>
              <div className="form-grid-3">
                {[
                  { id: 'maxGuests', label: 'Max guests *', min: 1, max: 50 },
                  { id: 'bedrooms', label: 'Bedrooms *', min: 0 },
                  { id: 'beds', label: 'Beds *', min: 1 },
                  { id: 'bathrooms', label: 'Bathrooms *', min: 0.5, step: 0.5 },
                ].map((f) => (
                  <div key={f.id} className="form-group">
                    <label htmlFor={f.id} className="form-label">{f.label}</label>
                    <input id={f.id} name={f.id} type="number" value={form[f.id]}
                      onChange={handleChange} min={f.min} max={f.max} step={f.step || 1}
                      className={`form-input ${errors[f.id] ? 'input-error' : ''}`} />
                    {errors[f.id] && <span className="field-error" role="alert">{errors[f.id]}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Pricing ─────────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Pricing (₹)</h2>
              <div className="form-grid-2">
                {[
                  { id: 'pricePerNight', label: 'Price per night *', min: 100 },
                  { id: 'cleaningFee', label: 'Cleaning fee', min: 0 },
                  { id: 'securityDeposit', label: 'Security deposit', min: 0 },
                  { id: 'weeklyDiscount', label: 'Weekly discount (%)', min: 0, max: 50 },
                  { id: 'monthlyDiscount', label: 'Monthly discount (%)', min: 0, max: 50 },
                ].map((f) => (
                  <div key={f.id} className="form-group">
                    <label htmlFor={f.id} className="form-label">{f.label}</label>
                    <input id={f.id} name={f.id} type="number" value={form[f.id]}
                      onChange={handleChange} min={f.min} max={f.max}
                      className={`form-input ${errors[f.id] ? 'input-error' : ''}`} />
                    {errors[f.id] && <span className="field-error" role="alert">{errors[f.id]}</span>}
                  </div>
                ))}
                <div className="form-group">
                  <label htmlFor="minimumStay" className="form-label">Minimum stay (nights)</label>
                  <input id="minimumStay" name="minimumStay" type="number" value={form.minimumStay}
                    onChange={handleChange} min={1} className="form-input" />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="amenity-checkbox-label" style={{ width: 'fit-content' }}>
                  <input type="checkbox" name="instantBook" checked={form.instantBook} onChange={handleChange} />
                  <span>⚡ Instant Book (guests can book without approval)</span>
                </label>
              </div>
            </div>

            {/* ─── Location ────────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Location</h2>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="address" className="form-label">Street address *</label>
                <input id="address" name="address" type="text" value={form.address}
                  onChange={handleChange} className={`form-input ${errors.address ? 'input-error' : ''}`}
                  placeholder="e.g. 12 Beach Road, Calangute" />
                {errors.address && <span className="field-error" role="alert">{errors.address}</span>}
              </div>
              <div className="form-grid-2">
                {[
                  { id: 'city', label: 'City *' },
                  { id: 'state', label: 'State *' },
                  { id: 'country', label: 'Country' },
                  { id: 'zipCode', label: 'ZIP / Postal code' },
                ].map((f) => (
                  <div key={f.id} className="form-group">
                    <label htmlFor={f.id} className="form-label">{f.label}</label>
                    <input id={f.id} name={f.id} type="text" value={form[f.id]}
                      onChange={handleChange} className={`form-input ${errors[f.id] ? 'input-error' : ''}`} />
                    {errors[f.id] && <span className="field-error" role="alert">{errors[f.id]}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Amenities ───────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Amenities</h2>
              <div className="amenities-checkbox-grid" role="group" aria-label="Select amenities">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity.name} className="amenity-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.amenities.includes(amenity.name)}
                      onChange={() => toggleAmenity(amenity.name)}
                      aria-label={amenity.name}
                    />
                    <span>{amenity.icon} {amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ─── House Rules ─────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">House Rules</h2>
              <div className="form-grid-2">
                <div className="form-group">
                  <label htmlFor="checkInTime" className="form-label">Check-in time</label>
                  <input id="checkInTime" name="checkInTime" type="time" value={form.checkInTime}
                    onChange={handleChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label htmlFor="checkOutTime" className="form-label">Check-out time</label>
                  <input id="checkOutTime" name="checkOutTime" type="time" value={form.checkOutTime}
                    onChange={handleChange} className="form-input" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                {[
                  { name: 'smokingAllowed', label: '🚬 Smoking allowed' },
                  { name: 'petsAllowed', label: '🐾 Pets allowed' },
                  { name: 'partiesAllowed', label: '🎉 Parties allowed' },
                ].map((rule) => (
                  <label key={rule.name} className="amenity-checkbox-label">
                    <input type="checkbox" name={rule.name} checked={form[rule.name]} onChange={handleChange} />
                    <span>{rule.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ─── Images ──────────────────────────────────────────────── */}
            <div className="manager-form-section">
              <h2 className="manager-form-section-title">Photos</h2>

              {/* Existing images (edit mode) */}
              {existingImages.length > 0 && (
                <div className="image-previews" style={{ marginBottom: '16px' }}>
                  {existingImages.map((img, i) => (
                    <div key={i} className="image-preview-item">
                      <img src={img.url} alt={`Existing photo ${i + 1}`} />
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <div
                className="image-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload property photos"
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files).filter(f =>
                    ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)
                  );
                  if (files.length) {
                    const syntheticEvent = { target: { files } };
                    handleImageChange(syntheticEvent);
                  }
                }}
              >
                {/* Hidden — triggered programmatically via ref */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageChange}
                  aria-label="Select images"
                  style={{ display: 'none' }}
                />
                <div className="image-upload-icon" aria-hidden="true">📷</div>
                <p className="image-upload-text">
                  Click to upload photos
                  {imageFiles.length > 0 && (
                    <span style={{ color: '#22c55e', marginLeft: '8px' }}>
                      ✓ {imageFiles.length} file{imageFiles.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </p>
                <p className="image-upload-hint">JPEG, PNG, WebP · Max 5 MB each · Up to 10 images · Drag & drop supported</p>
              </div>

              {errors.images && <span className="field-error" role="alert">{errors.images}</span>}

              {/* New image previews */}
              {imagePreviews.length > 0 && (
                <div className="image-previews">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="image-preview-item">
                      <img src={src} alt={`Preview ${i + 1}`} />
                      <button
                        type="button"
                        className="image-preview-remove"
                        onClick={() => removeNewImage(i)}
                        aria-label={`Remove photo ${i + 1}`}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Submit ───────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
                {submitting ? 'Saving...' : isEdit ? 'Update Property' : 'List Property'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/manager/properties')}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
