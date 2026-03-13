// src/components/provider/PublicProviderPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './PublicProviderPage.css';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const PublicProviderPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const bookingRef   = useRef(null);

  // ── Provider data ──
  const [provider, setProvider] = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // ── Booking state ──
  const [selectedService, setSelectedService] = useState(null);
  const [scheduledDate,   setScheduledDate]   = useState('');
  const [scheduledTime,   setScheduledTime]   = useState('');
  const [street,          setStreet]          = useState('');
  const [city,            setCity]            = useState('');
  const [pincode,         setPincode]         = useState('');
  const [notes,           setNotes]           = useState('');
  const [bookingLoading,  setBookingLoading]  = useState(false);
  const [successMsg,      setSuccessMsg]      = useState('');
  const [errorMsg,        setErrorMsg]        = useState('');

  const today = new Date().toISOString().split('T')[0];

  // ── Fetch provider ──
  useEffect(() => {
    if (!id) { setError('No provider ID supplied.'); setLoading(false); return; }
    const fetch = async () => {
      try {
        const res = await api.get(`/providers/${id}`);
        setProvider(res.data.provider || res.data.data);
        setReviews(res.data.reviews   || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load provider profile.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // ── Select a service → scroll to booking form ──
  const handleSelectService = (svc) => {
    setSelectedService(svc);
    setSuccessMsg('');
    setErrorMsg('');
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Submit booking ──
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) return setErrorMsg('Please select a service first.');
    setBookingLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
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
      // Reset form
      setSelectedService(null);
      setScheduledDate(''); setScheduledTime('');
      setStreet(''); setCity(''); setPincode(''); setNotes('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Loading / error states ──
  if (loading) return (
    <div className="pbp-page">
      <div className="pbp-loading"><div className="pbp-spinner" />Loading provider…</div>
    </div>
  );
  if (error) return (
    <div className="pbp-page">
      <div className="pbp-error">
        <span className="pbp-error-icon">😕</span>
        <p>{error}</p>
        <button className="pbp-btn-back" onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );
  if (!provider) return null;

  const isAvailable  = provider.availability?.isAvailable ?? false;
  const workingDays  = provider.availability?.workingDays  || [];
  const startHour    = provider.availability?.workingHours?.start || '09:00';
  const endHour      = provider.availability?.workingHours?.end   || '18:00';
  const providerName = provider.user?.name || provider.name;

  return (
    <div className="pbp-page">
      <div className="pbp-inner">

        {/* ── Global alerts ── */}
        {successMsg && <div className="pbp-alert pbp-alert-success">{successMsg}</div>}
        {errorMsg   && <div className="pbp-alert pbp-alert-error">{errorMsg}</div>}

        {/* ════════════════ HERO ════════════════ */}
        <div className="pbp-hero">
          <div className="pbp-avatar-wrap">
            <img
              className="pbp-avatar"
              src={
                provider.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(providerName)}&background=6c63ff&color=fff&size=128`
              }
              alt={providerName}
            />
            <span className={`pbp-dot ${isAvailable ? 'online' : 'offline'}`} />
          </div>

          <div className="pbp-hero-info">
            <h1 className="pbp-name">{providerName}</h1>
            <p className="pbp-location">
              📍 {provider.location?.city || '—'}
              {provider.location?.state ? `, ${provider.location.state}` : ''}
            </p>
            <div className="pbp-rating-row">
              {'⭐'.repeat(Math.round(provider.rating || 0))}
              <span className="pbp-rating-text">
                {provider.rating ? provider.rating.toFixed(1) : '0.0'} · {provider.totalReviews || 0} reviews
              </span>
            </div>
            <div className="pbp-badges">
              <span className={`pbp-badge pbp-badge-${provider.verificationStatus}`}>
                {provider.verificationStatus === 'verified' ? '✓ Verified' : provider.verificationStatus}
              </span>
              {provider.subscription === 'premium' && (
                <span className="pbp-badge pbp-badge-premium">⭐ Premium</span>
              )}
              <span className={`pbp-badge ${isAvailable ? 'pbp-badge-available' : 'pbp-badge-busy'}`}>
                {isAvailable ? '🟢 Available' : '🔴 Busy'}
              </span>
            </div>
          </div>

          <button className="pbp-btn-contact" onClick={() => navigate('/chat')}>
            💬 Message Provider
          </button>
        </div>

        {/* ════════════════ STATS ════════════════ */}
        <div className="pbp-stats">
          {[
            { icon: '💼', value: `${provider.experience || 0} yrs`, label: 'Experience'  },
            { icon: '💰', value: `₹${provider.hourlyRate || 0}/hr`, label: 'Hourly Rate' },
            { icon: '🛠️', value: provider.services?.length || 0,    label: 'Services'    },
            { icon: '⭐', value: provider.rating?.toFixed(1) || '—', label: 'Avg. Rating' },
          ].map(s => (
            <div key={s.label} className="pbp-stat">
              <div className="pbp-stat-icon">{s.icon}</div>
              <div className="pbp-stat-value">{s.value}</div>
              <div className="pbp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ════════════════ MAIN GRID ════════════════ */}
        <div className="pbp-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="pbp-col-left">

            {/* About */}
            {(provider.bio || provider.description) && (
              <section className="pbp-card">
                <h2 className="pbp-card-title">About</h2>
                <p className="pbp-text">{provider.bio || provider.description}</p>
              </section>
            )}

            {/* ══ SERVICES — with Select button ══ */}
            <section className="pbp-card">
              <h2 className="pbp-card-title">🔧 Services Offered</h2>
              {!provider.services?.length ? (
                <p className="pbp-muted">No services listed yet.</p>
              ) : (
                <div className="pbp-services-list">
                  {provider.services.map((svc, i) => (
                    <div
                      key={i}
                      className={`pbp-service-item ${selectedService?.name === svc.name ? 'selected' : ''}`}
                    >
                      <div className="pbp-service-info">
                        <div className="pbp-service-name">{svc.name}</div>
                        <div className="pbp-service-cat">{svc.category}</div>
                        {svc.description && (
                          <div className="pbp-service-desc">{svc.description}</div>
                        )}
                      </div>
                      <div className="pbp-service-right">
                        <div className="pbp-service-price">
                          ₹{svc.price}<span>/{svc.priceUnit || 'hr'}</span>
                        </div>

                        {/* Only logged-in users can book */}
                        {user?.role === 'user' && isAvailable && (
                          <button
                            className={`pbp-btn-select ${selectedService?.name === svc.name ? 'active' : ''}`}
                            onClick={() => handleSelectService(svc)}
                          >
                            {selectedService?.name === svc.name ? '✓ Selected' : 'Book'}
                          </button>
                        )}
                        {user?.role === 'user' && !isAvailable && (
                          <span className="pbp-unavail-tag">Unavailable</span>
                        )}
                        {!user && (
                          <Link to="/login" className="pbp-btn-select">Login to Book</Link>
                        )}
                        {user?.role === 'provider' && (
                          <span className="pbp-unavail-tag">Providers can't book</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ══ BOOKING FORM ══ */}
            {user?.role === 'user' && (
              <section className="pbp-card pbp-booking-card" ref={bookingRef}>
                <h2 className="pbp-card-title">📅 Book a Service</h2>

                {!isAvailable && (
                  <div className="pbp-unavail-banner">
                    🔴 This provider is currently not accepting bookings.
                  </div>
                )}

                {isAvailable && !selectedService && (
                  <div className="pbp-select-prompt">
                    ☝️ Select a service above to start booking
                  </div>
                )}

                {isAvailable && selectedService && (
                  <>
                    {/* Selected service summary */}
                    <div className="pbp-selected-svc-banner">
                      <div>
                        <strong>{selectedService.name}</strong>
                        <span className="pbp-svc-cat-tag">{selectedService.category}</span>
                      </div>
                      <div className="pbp-selected-price">
                        ₹{selectedService.price}/{selectedService.priceUnit}
                      </div>
                    </div>

                    <form onSubmit={handleBookingSubmit} className="pbp-booking-form">

                      <div className="pbp-form-row">
                        <div className="pbp-form-group">
                          <label>📅 Preferred Date *</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            min={today}
                            onChange={e => setScheduledDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="pbp-form-group">
                          <label>⏰ Preferred Time *</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="pbp-form-group">
                        <label>🏠 Street Address *</label>
                        <input
                          type="text"
                          value={street}
                          onChange={e => setStreet(e.target.value)}
                          placeholder="e.g. 123 Main Street"
                          required
                        />
                      </div>

                      <div className="pbp-form-row">
                        <div className="pbp-form-group">
                          <label>City *</label>
                          <input
                            type="text"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            placeholder="Mumbai"
                            required
                          />
                        </div>
                        <div className="pbp-form-group">
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

                      <div className="pbp-form-group">
                        <label>📝 Additional Notes</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Special instructions, access codes, etc."
                        />
                      </div>

                      <div className="pbp-cost-summary">
                        💰 Estimated Cost: <strong>₹{selectedService.price} / {selectedService.priceUnit}</strong>
                      </div>

                      <div className="pbp-form-actions">
                        <button
                          type="button"
                          className="pbp-btn-cancel-booking"
                          onClick={() => setSelectedService(null)}
                        >
                          ✕ Cancel
                        </button>
                        <button
                          type="submit"
                          className="pbp-btn-confirm"
                          disabled={bookingLoading}
                        >
                          {bookingLoading ? '⏳ Sending…' : '✅ Confirm Booking'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            )}

            {/* Not logged in — prompt */}
            {!user && (
              <section className="pbp-card pbp-login-prompt">
                🔒 <strong>Want to book this provider?</strong>
                <div className="pbp-login-btns">
                  <Link to="/login"    className="pbp-btn-login">Login</Link>
                  <Link to="/register" className="pbp-btn-signup">Sign Up</Link>
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="pbp-col-right">

            {/* Contact */}
            <section className="pbp-card">
              <h2 className="pbp-card-title">Contact & Location</h2>
              <div className="pbp-detail-list">
                {provider.phone && (
                  <div className="pbp-detail-row">
                    <span className="pbp-detail-key">📱 Phone</span>
                    <span>{provider.phone}</span>
                  </div>
                )}
                {provider.email && (
                  <div className="pbp-detail-row">
                    <span className="pbp-detail-key">✉️ Email</span>
                    <span>{provider.email}</span>
                  </div>
                )}
                {provider.location?.city && (
                  <div className="pbp-detail-row">
                    <span className="pbp-detail-key">📍 City</span>
                    <span>{provider.location.city}</span>
                  </div>
                )}
                {provider.location?.state && (
                  <div className="pbp-detail-row">
                    <span className="pbp-detail-key">🗺️ State</span>
                    <span>{provider.location.state}</span>
                  </div>
                )}
                {provider.location?.address && (
                  <div className="pbp-detail-row">
                    <span className="pbp-detail-key">🏠 Address</span>
                    <span>{provider.location.address}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Availability */}
            <section className="pbp-card">
              <h2 className="pbp-card-title">Availability</h2>
              <div className="pbp-avail-status">
                <span className={`pbp-avail-dot ${isAvailable ? 'on' : 'off'}`} />
                <span>{isAvailable ? 'Currently accepting bookings' : 'Not accepting bookings'}</span>
              </div>
              {workingDays.length > 0 && (
                <div className="pbp-days">
                  {DAYS_SHORT.map((d, i) => (
                    <span
                      key={d}
                      className={`pbp-day-chip ${workingDays.includes(DAYS_FULL[i]) ? 'active' : ''}`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
              <p className="pbp-hours">🕐 {startHour} – {endHour}</p>
            </section>

            {/* Reviews */}
            <section className="pbp-card">
              <h2 className="pbp-card-title">⭐ Reviews ({reviews.length})</h2>
              {reviews.length === 0 ? (
                <p className="pbp-muted">No reviews yet. Be the first!</p>
              ) : (
                <div className="pbp-reviews-list">
                  {reviews.map(r => (
                    <div key={r._id} className="pbp-review-item">
                      <div className="pbp-review-header">
                        <div className="pbp-reviewer-avatar">
                          {r.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong>{r.user?.name || 'User'}</strong>
                          <div className="pbp-review-stars">{'⭐'.repeat(r.rating || 0)}</div>
                        </div>
                        <small className="pbp-review-date">
                          {new Date(r.createdAt).toLocaleDateString('en-IN')}
                        </small>
                      </div>
                      {r.comment && <p className="pbp-review-text">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProviderPage;