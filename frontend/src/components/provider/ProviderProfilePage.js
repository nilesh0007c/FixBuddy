// src/pages/provider/ProviderProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import StarRating from '../../components/ui/StarRating';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';
import './ProviderProfilePage.css';

const ProviderProfilePage = () => {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const bookingRef = useRef(null);

  const [provider,         setProvider]         = useState(null);
  const [reviews,          setReviews]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedService,  setSelectedService]  = useState(null);

  // Booking form
  const [scheduledDate,  setScheduledDate]  = useState('');
  const [scheduledTime,  setScheduledTime]  = useState('');
  const [street,         setStreet]         = useState('');
  const [city,           setCity]           = useState('');
  const [pincode,        setPincode]        = useState('');
  const [notes,          setNotes]          = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successMsg,     setSuccessMsg]     = useState('');
  const [errorMsg,       setErrorMsg]       = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const res = await api.get(`/providers/${id}`);
        setProvider(res.data.provider || res.data.data);
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    setSuccessMsg('');
    setErrorMsg('');
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) return setErrorMsg('Please select a service first');
    setBookingLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post('/bookings', {
        providerId: id,
        service: {
          name:      selectedService.name,
          category:  selectedService.category,
          price:     selectedService.price,
          priceUnit: selectedService.priceUnit,
        },
        scheduledDate,
        scheduledTime,
        address: { street, city, pincode },
        notes,
      });
      setSuccessMsg(`✅ Booking request sent for "${selectedService.name}"! The provider will respond soon.`);
      setSelectedService(null);
      setScheduledDate(''); setScheduledTime('');
      setStreet(''); setCity(''); setPincode(''); setNotes('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Loading provider profile...</p>
    </div>
  );

  if (!provider) return (
    <div className="not-found-page">
      <h2>Provider not found</h2>
      <Link to="/services" className="btn-primary">Back to Services</Link>
    </div>
  );

  const isAvailable  = provider.availability?.isAvailable;
  const providerName = provider.user?.name || provider.name;

  return (
    <div className="profile-page">

      {/* ── Header ── */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {providerName?.charAt(0).toUpperCase()}
        </div>

        <div className="profile-details">
          <div className="profile-name-row">
            <h1>{providerName}</h1>
            {provider.isVerified && <span className="verified-badge">✓ Verified</span>}
            <span className={`avail-pill ${isAvailable ? 'avail-yes' : 'avail-no'}`}>
              {isAvailable ? '🟢 Available' : '🔴 Unavailable'}
            </span>
          </div>

          <p className="profile-location">
            📍 {provider.location?.city || 'City not set'}
            {provider.location?.state ? `, ${provider.location.state}` : ''}
          </p>

          <div className="rating-row profile-rating-row">
            <StarRating rating={Math.round(provider.rating || 0)} />
            <span className="rating-text">
              {provider.rating ? provider.rating.toFixed(1) : '0.0'} &nbsp;·&nbsp;
              {provider.totalReviews || 0} review{provider.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="profile-stats">
            <div className="pstat">
              <strong>{provider.experience || 0}</strong>
              <span>Years Exp.</span>
            </div>
            <div className="pstat">
              <strong>{provider.services?.length || 0}</strong>
              <span>Services</span>
            </div>
            <div className="pstat">
              <strong>{provider.totalReviews || 0}</strong>
              <span>Reviews</span>
            </div>
          </div>

          {provider.bio && (
            <p className="profile-bio">"{provider.bio}"</p>
          )}
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg   && <div className="alert alert-error">{errorMsg}</div>}

      <div className="profile-layout">
        {/* ── LEFT COLUMN ── */}
        <div className="profile-main">

          {/* Services Offered */}
          <div className="section-card">
            <h2 className="section-card-title">🔧 Services Offered</h2>
            {(!provider.services || provider.services.length === 0) ? (
              <p className="muted">No services listed yet.</p>
            ) : (
              <div className="services-list">
                {provider.services.map((svc, i) => (
                  <div
                    key={i}
                    className={`service-item ${selectedService?.name === svc.name ? 'service-item-selected' : ''}`}
                  >
                    <div className="service-item-info">
                      <div className="service-item-top">
                        <h3>{svc.name}</h3>
                        <span className="service-category-tag">{svc.category}</span>
                      </div>
                      {svc.description && <p className="service-desc">{svc.description}</p>}
                    </div>

                    <div className="service-item-price">
                      <span className="price">
                        ₹{svc.price}<small>/{svc.priceUnit}</small>
                      </span>
                      {user?.role === 'user' && isAvailable && (
                        <button
                          className={`btn-sm ${selectedService?.name === svc.name ? 'btn-selected' : 'btn-primary'}`}
                          onClick={() => handleSelectService(svc)}
                        >
                          {selectedService?.name === svc.name ? '✓ Selected' : 'Select'}
                        </button>
                      )}
                      {user?.role === 'user' && !isAvailable && (
                        <span className="unavail-text">Not available</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="section-card">
            <h2 className="section-card-title">🕐 Working Hours</h2>
            <div className="working-hours-grid">
              <div className="wh-item">
                <span className="wh-label">Working Days</span>
                <span className="wh-value">
                  {provider.availability?.workingDays?.length
                    ? provider.availability.workingDays.map(d => d.slice(0, 3)).join(', ')
                    : 'Not specified'}
                </span>
              </div>
              <div className="wh-item">
                <span className="wh-label">Hours</span>
                <span className="wh-value">
                  {provider.availability?.workingHours?.start || '09:00'} –{' '}
                  {provider.availability?.workingHours?.end || '18:00'}
                </span>
              </div>
              <div className="wh-item">
                <span className="wh-label">Phone</span>
                <span className="wh-value">
                  {provider.user?.phone || provider.phone || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          {user?.role === 'user' && (
            <div className="section-card booking-form-card" ref={bookingRef}>
              <h2 className="section-card-title">📅 Book a Service</h2>

              {!isAvailable && (
                <div className="unavail-banner">
                  This provider is currently unavailable.
                </div>
              )}

              {isAvailable && !selectedService && (
                <div className="select-prompt">☝️ Select a service above to start booking</div>
              )}

              {isAvailable && selectedService && (
                <>
                  <div className="selected-service-banner">
                    <div>
                      <strong>{selectedService.name}</strong>
                      <span className="service-category-tag">{selectedService.category}</span>
                    </div>
                    <div className="selected-price">
                      ₹{selectedService.price}/{selectedService.priceUnit}
                    </div>
                  </div>

                  <form onSubmit={handleBookingSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>📅 Preferred Date *</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={e => setScheduledDate(e.target.value)}
                          min={today}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>⏰ Preferred Time *</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={e => setScheduledTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>🏠 Street Address *</label>
                      <input
                        type="text"
                        value={street}
                        onChange={e => setStreet(e.target.value)}
                        placeholder="e.g. 123 Main Street"
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          placeholder="Mumbai"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Pincode *</label>
                        <input
                          type="text"
                          value={pincode}
                          onChange={e => setPincode(e.target.value)}
                          placeholder="400001"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>📝 Additional Notes</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows="3"
                        placeholder="Special instructions..."
                      />
                    </div>

                    <div className="booking-summary">
                      💰 Estimated Cost:{' '}
                      <strong>₹{selectedService.price} / {selectedService.priceUnit}</strong>
                    </div>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setSelectedService(null)}
                      >
                        ✕ Cancel
                      </button>
                      <button type="submit" className="btn-primary" disabled={bookingLoading}>
                        {bookingLoading ? '⏳ Sending...' : '✅ Confirm Booking'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Login prompt for unauthenticated users */}
          {!user && (
            <div className="login-prompt">
              <span>🔒 Want to book this provider?</span>
              <Link to="/login" className="btn-primary btn-sm">Login</Link>
              <Link to="/register" className="btn-outline btn-sm">Sign Up</Link>
            </div>
          )}

          {/* Provider cannot book another provider */}
          {user?.role === 'provider' && (
            <div className="login-prompt">
              <span>Providers cannot book other providers.</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: Reviews Sidebar ── */}
        <aside className="reviews-sidebar">
          <h2 className="section-card-title">⭐ Reviews ({reviews.length})</h2>

          {reviews.length === 0 ? (
            <div className="no-reviews">
              <p>No reviews yet.</p>
              <small>Be the first to leave a review!</small>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review._id} className="review-card">
                  <div className="review-header">
                    <div className="reviewer-avatar">
                      {review.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="reviewer-info">
                      <strong>{review.user?.name}</strong>
                      <StarRating rating={review.rating} />
                    </div>
                    <small className="review-date">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <p className="review-comment">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ProviderProfilePage;