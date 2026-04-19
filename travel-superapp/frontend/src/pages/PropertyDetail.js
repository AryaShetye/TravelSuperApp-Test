import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addDays, differenceInDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StarRating from '../components/ui/StarRating';
import PropertyMap from '../components/map/PropertyMap';
import AttractionsSection from '../components/attractions/AttractionsSection';
import '../styles/property-detail.css';
import '../styles/map.css';

// Roles that can book properties
const BOOKING_ROLES = ['traveler'];

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Booking state
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Can this user book?
  const canBook = !user || BOOKING_ROLES.includes(user.role);

  useEffect(() => {
    fetchProperty();
    fetchReviews();
  }, [id]);

  async function fetchProperty() {
    try {
      const res = await api.get(`/properties/${id}`);
      setProperty(res.data.property);
    } catch {
      toast.error('Property not found');
      navigate('/properties');
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews() {
    try {
      const res = await api.get(`/reviews/property/${id}`);
      setReviews(res.data.reviews);
    } catch {
      // non-critical
    }
  }

  // Calculate pricing
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;
  const subtotal = nights * (property?.pricePerNight || 0);
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes + (property?.cleaningFee || 0);

  async function handleBooking() {
    if (!user) {
      toast.error('Please log in to book');
      navigate('/login', { state: { from: { pathname: `/properties/${id}` } } });
      return;
    }

    if (!BOOKING_ROLES.includes(user.role)) {
      toast.error('Only travelers can book properties.');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.post('/bookings', {
        propertyId: id,
        checkIn: format(checkIn, 'yyyy-MM-dd'),
        checkOut: format(checkOut, 'yyyy-MM-dd'),
        guests,
      });
      navigate(`/book/${id}`, {
        state: { booking: res.data.booking, pricing: res.data.pricing },
      });
    } catch (err) {
      toast.error(err.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;
  if (!property) return null;

  return (
    <div className="property-detail-page">
      <div className="container">
        {/* Title */}
        <div className="property-header">
          <h1 className="property-title">{property.title}</h1>
          <div className="property-meta">
            <StarRating rating={property.rating?.average} count={property.rating?.count} />
            <span className="property-location">
              📍 {property.location.city}, {property.location.state}
            </span>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="image-gallery" aria-label="Property photos">
          <div className="gallery-main">
            <img
              src={property.images[activeImage]?.url}
              alt={`${property.title} — photo ${activeImage + 1}`}
              className="gallery-main-image"
              loading="eager"
            />
          </div>
          <div className="gallery-thumbs" role="list">
            {property.images.slice(0, 5).map((img, i) => (
              <button
                key={i}
                role="listitem"
                className={`gallery-thumb ${activeImage === i ? 'active' : ''}`}
                onClick={() => setActiveImage(i)}
                aria-label={`View photo ${i + 1}`}
                aria-pressed={activeImage === i}
              >
                <img src={img.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="property-content">
          {/* Left: Details */}
          <div className="property-details">
            {/* Host info */}
            <div className="host-info">
              <div className="host-avatar">
                {property.hostAvatar ? (
                  <img src={property.hostAvatar} alt={`Host ${property.hostName}`} />
                ) : (
                  <span aria-hidden="true">👤</span>
                )}
              </div>
              <div>
                <p className="host-label">Hosted by</p>
                <p className="host-name">{property.hostName}</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="property-stats" aria-label="Property details">
              {[
                { label: 'Guests', value: property.maxGuests, icon: '👥' },
                { label: 'Bedrooms', value: property.bedrooms, icon: '🛏️' },
                { label: 'Beds', value: property.beds, icon: '🛌' },
                { label: 'Bathrooms', value: property.bathrooms, icon: '🚿' },
              ].map((stat) => (
                <div key={stat.label} className="stat-item">
                  <span aria-hidden="true">{stat.icon}</span>
                  <span>{stat.value} {stat.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <section aria-labelledby="description-heading">
              <h2 id="description-heading" className="section-heading">About this place</h2>
              <p className="property-description">{property.description}</p>
            </section>

            {/* Amenities */}
            {property.amenities?.length > 0 && (
              <section aria-labelledby="amenities-heading">
                <h2 id="amenities-heading" className="section-heading">Amenities</h2>
                <ul className="amenities-grid" aria-label="Available amenities">
                  {property.amenities.map((amenity, i) => (
                    <li key={i} className="amenity-item">
                      <span aria-hidden="true">{amenity.icon || '✓'}</span>
                      {amenity.name}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* House Rules */}
            {property.houseRules && (
              <section aria-labelledby="rules-heading">
                <h2 id="rules-heading" className="section-heading">House rules</h2>
                <div className="house-rules">
                  <div className="rule-item">
                    <span>Check-in after</span>
                    <strong>{property.houseRules.checkInTime || '14:00'}</strong>
                  </div>
                  <div className="rule-item">
                    <span>Check-out before</span>
                    <strong>{property.houseRules.checkOutTime || '11:00'}</strong>
                  </div>
                  <div className="rule-item">
                    <span>Smoking</span>
                    <strong>{property.houseRules.smokingAllowed ? 'Allowed' : 'Not allowed'}</strong>
                  </div>
                  <div className="rule-item">
                    <span>Pets</span>
                    <strong>{property.houseRules.petsAllowed ? 'Allowed' : 'Not allowed'}</strong>
                  </div>
                </div>
              </section>
            )}

            {/* Location map */}
            {(property.location?.lat || property.location?.coordinates?.coordinates) && (
              <section aria-labelledby="map-heading">
                <h2 id="map-heading" className="section-heading">Location</h2>
                <p className="map-location-label">
                  📍 {property.location.formattedAddress || `${property.location.city}, ${property.location.state}`}
                </p>
                <PropertyMap
                  lat={property.location.lat || property.location.coordinates?.coordinates?.[1]}
                  lng={property.location.lng || property.location.coordinates?.coordinates?.[0]}
                  title={property.title}
                  zoom={14}
                  height="380px"
                />
                <p className="map-disclaimer">
                  Exact address provided after booking confirmation.
                </p>
              </section>
            )}

            {/* Nearby Attractions — TripAdvisor via SerpAPI with OSM fallback */}
            {property.location && (
              <AttractionsSection
                location={property.location.city}
                lat={property.location.lat || property.location.coordinates?.coordinates?.[1]}
                lng={property.location.lng || property.location.coordinates?.coordinates?.[0]}
                title="Top Attractions Nearby"
              />
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className="section-heading">
                  Reviews
                  <StarRating rating={property.rating?.average} count={property.rating?.count} />
                </h2>
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <article key={review.id || review._id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-avatar">
                          {review.userAvatar
                            ? <img src={review.userAvatar} alt={review.userName} />
                            : <span aria-hidden="true">👤</span>}
                        </div>
                        <div>
                          <p className="reviewer-name">{review.userName}</p>
                          <time className="review-date" dateTime={review.createdAt}>
                            {format(new Date(review.createdAt), 'MMMM yyyy')}
                          </time>
                        </div>
                        <StarRating rating={review.ratings?.overall} />
                      </div>
                      <p className="review-comment">{review.comment}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: Booking Widget — only for travelers */}
          <aside className="booking-widget" aria-label="Book this property">
            {canBook ? (
              <div className="booking-card">
                <div className="booking-price">
                  <span className="price-amount">
                    ₹{property.pricePerNight.toLocaleString('en-IN')}
                  </span>
                  <span className="price-unit"> / night</span>
                </div>

                <StarRating rating={property.rating?.average} count={property.rating?.count} />

                {/* Date pickers */}
                <div className="date-pickers">
                  <div className="date-picker-group">
                    <label htmlFor="checkin-date" className="date-label">CHECK-IN</label>
                    <DatePicker
                      id="checkin-date"
                      selected={checkIn}
                      onChange={(date) => {
                        setCheckIn(date);
                        if (checkOut && date >= checkOut) setCheckOut(addDays(date, 1));
                      }}
                      minDate={new Date()}
                      placeholderText="Add date"
                      className="date-input"
                      dateFormat="dd/MM/yyyy"
                      aria-label="Check-in date"
                    />
                  </div>
                  <div className="date-picker-group">
                    <label htmlFor="checkout-date" className="date-label">CHECK-OUT</label>
                    <DatePicker
                      id="checkout-date"
                      selected={checkOut}
                      onChange={setCheckOut}
                      minDate={checkIn ? addDays(checkIn, property.minimumStay || 1) : addDays(new Date(), 1)}
                      placeholderText="Add date"
                      className="date-input"
                      dateFormat="dd/MM/yyyy"
                      aria-label="Check-out date"
                    />
                  </div>
                </div>

                {/* Guests */}
                <div className="guests-selector">
                  <label htmlFor="guests-count" className="date-label">GUESTS</label>
                  <div className="guests-control">
                    <button
                      type="button"
                      className="guests-btn"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      aria-label="Decrease guests"
                      disabled={guests <= 1}
                    >−</button>
                    <span id="guests-count" aria-live="polite">{guests} guest{guests !== 1 ? 's' : ''}</span>
                    <button
                      type="button"
                      className="guests-btn"
                      onClick={() => setGuests((g) => Math.min(property.maxGuests, g + 1))}
                      aria-label="Increase guests"
                      disabled={guests >= property.maxGuests}
                    >+</button>
                  </div>
                </div>

                {/* Price breakdown */}
                {nights > 0 && (
                  <div className="price-breakdown" aria-label="Price breakdown">
                    <div className="price-row">
                      <span>₹{property.pricePerNight.toLocaleString('en-IN')} × {nights} night{nights !== 1 ? 's' : ''}</span>
                      <span>₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {property.cleaningFee > 0 && (
                      <div className="price-row">
                        <span>Cleaning fee</span>
                        <span>₹{property.cleaningFee.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="price-row">
                      <span>Taxes (12% GST)</span>
                      <span>₹{taxes.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="price-row price-total">
                      <strong>Total</strong>
                      <strong>₹{total.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-full btn-book"
                  onClick={handleBooking}
                  disabled={bookingLoading || !property.isAvailable}
                  aria-busy={bookingLoading}
                >
                  {!property.isAvailable
                    ? 'Not available'
                    : bookingLoading
                    ? 'Processing...'
                    : nights > 0
                    ? `Reserve — ₹${total.toLocaleString('en-IN')}`
                    : 'Check availability'}
                </button>

                <p className="booking-note">You won't be charged yet</p>
              </div>
            ) : (
              /* Non-traveler: show info card instead of booking widget */
              <div className="booking-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏠</div>
                <div className="booking-price">
                  <span className="price-amount">₹{property.pricePerNight.toLocaleString('en-IN')}</span>
                  <span className="price-unit"> / night</span>
                </div>
                <StarRating rating={property.rating?.average} count={property.rating?.count} />
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.85rem', color: '#0369a1' }}>
                  {user?.role === 'property_manager' || user?.role === 'host'
                    ? '🏢 You are viewing as a Property Manager. Switch to a traveler account to book.'
                    : user?.role === 'agent'
                    ? '🎒 You are viewing as a Travel Agent. Book packages for your clients instead.'
                    : user?.role === 'driver'
                    ? '🚗 You are viewing as a Driver. Accept transport requests from your dashboard.'
                    : '🔒 Sign in as a Traveler to book this property.'}
                </div>
                {!user && (
                  <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}>
                    Sign in to book
                  </Link>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
