// src/components/provider/PublicProviderPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import './PublicProviderPage.css';

const PublicProviderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!id) { setError('No provider ID supplied.'); setLoading(false); return; }

    const fetchProvider = async () => {
      setLoading(true);
      setError('');
      try {
        // GET /api/providers/:id  (public — no auth header needed)
        const res = await api.get(`/providers/${id}`);
        setProvider(res.data.provider || res.data.data);
        setReviews(res.data.reviews   || []);
      } catch (e) {
        setError(e.response?.data?.message || 'Could not load provider profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  /* ── States ── */
  if (loading) return (
    <div className="pbp-page">
      <div className="pbp-loading"><div className="pbp-spinner" />Loading provider…</div>
    </div>
  );

  if (error) return (
    <div className="pbp-page">
      <div className="pbp-error">
        <span>😕</span>
        <p>{error}</p>
        <button className="pbp-btn-back" onClick={() => navigate(-1)}>← Go back</button>
      </div>
    </div>
  );

  if (!provider) return null;

  const isAvailable = provider.availability?.isAvailable ?? false;
  const workingDays = provider.availability?.workingDays  || [];
  const startHour   = provider.availability?.workingHours?.start || '09:00';
  const endHour     = provider.availability?.workingHours?.end   || '18:00';

  return (
    <div className="pbp-page">
      <div className="pbp-inner">

        {/* ── Hero ── */}
        <div className="pbp-hero">
          <div className="pbp-avatar-wrap">
            <img
              className="pbp-avatar"
              src={
                provider.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=6c63ff&color=fff&size=128`
              }
              alt={provider.name}
            />
            <span className={`pbp-dot ${isAvailable ? 'online' : 'offline'}`} />
          </div>

          <div className="pbp-hero-info">
            <h1 className="pbp-name">{provider.name}</h1>
            <p className="pbp-location">
              📍 {provider.location?.city || '—'}
              {provider.location?.state ? `, ${provider.location.state}` : ''}
            </p>

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

          <button className="pbp-btn-book" onClick={() => navigate(`/chat`)}>
            💬 Contact Provider
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="pbp-stats">
          {[
            { icon: '💼', value: `${provider.experience || 0} yrs`,         label: 'Experience'  },
            { icon: '💰', value: `₹${provider.hourlyRate || 0}/hr`,          label: 'Hourly Rate' },
            { icon: '🛠️', value: provider.services?.length || 0,             label: 'Services'    },
            { icon: '⭐', value: provider.rating?.toFixed(1) || '—',          label: `${provider.totalReviews || 0} Reviews` },
          ].map(s => (
            <div key={s.label} className="pbp-stat">
              <div className="pbp-stat-icon">{s.icon}</div>
              <div className="pbp-stat-value">{s.value}</div>
              <div className="pbp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="pbp-grid">

          {/* ── Left ── */}
          <div className="pbp-col">

            {/* About */}
            {(provider.bio || provider.description) && (
              <section className="pbp-card">
                <h2 className="pbp-card-title">About</h2>
                <p className="pbp-text">{provider.bio || provider.description}</p>
              </section>
            )}

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

          </div>

          {/* ── Right ── */}
          <div className="pbp-col">

            {/* Services */}
            {provider.services?.length > 0 && (
              <section className="pbp-card">
                <h2 className="pbp-card-title">Services Offered</h2>
                <div className="pbp-services-list">
                  {provider.services.map((s, i) => (
                    <div key={i} className="pbp-service-item">
                      <div className="pbp-service-info">
                        <div className="pbp-service-name">{s.name}</div>
                        <div className="pbp-service-cat">{s.category}</div>
                        {s.description && (
                          <div className="pbp-service-desc">{s.description}</div>
                        )}
                      </div>
                      <div className="pbp-service-price">
                        ₹{s.price}<span>/{s.priceUnit || 'hr'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Availability */}
            <section className="pbp-card">
              <h2 className="pbp-card-title">Availability</h2>
              <div className="pbp-avail-status">
                <span className={`pbp-avail-dot ${isAvailable ? 'on' : 'off'}`} />
                <span>{isAvailable ? 'Currently accepting bookings' : 'Not accepting bookings'}</span>
              </div>

              {workingDays.length > 0 && (
                <div className="pbp-days">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
                    const full = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i];
                    return (
                      <span key={d} className={`pbp-day-chip ${workingDays.includes(full) ? 'active' : ''}`}>
                        {d}
                      </span>
                    );
                  })}
                </div>
              )}

              {(startHour || endHour) && (
                <p className="pbp-hours">🕐 {startHour} – {endHour}</p>
              )}
            </section>

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="pbp-card">
                <h2 className="pbp-card-title">Reviews</h2>
                <div className="pbp-reviews-list">
                  {reviews.map(r => (
                    <div key={r._id} className="pbp-review-item">
                      <div className="pbp-review-header">
                        <strong>{r.user?.name || 'User'}</strong>
                        <span className="pbp-review-stars">{'⭐'.repeat(r.rating || 0)}</span>
                      </div>
                      {r.comment && <p className="pbp-review-text">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProviderPage;