// src/pages/provider/ProviderProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api/axiosInstance';
import './ProviderProfilePage.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ProviderProfilePage = () => {
  const [provider, setProvider]   = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(false);
  const [toast,    setToast]      = useState(null);
  const [editMode, setEditMode]   = useState(false);
  const [form,     setForm]       = useState({});
  const fileRef = useRef();

  /* ── fetch ── */
const fetchProfile = useCallback(async () => {
  setLoading(true);
  try {
    const res = await api.get('/providers/profile');
    const p = res.data.provider || res.data.data;
    setProvider(p);

    setForm({
      name: p.name || '',
      phone: p.phone || '',
      bio: p.bio || '',
      description: p.description || '',
      hourlyRate: p.hourlyRate || 0,
      experience: p.experience || 0,
      city: p.location?.city || '',
      state: p.location?.state || '',
      address: p.location?.address || '',
      isAvailable: p.availability?.isAvailable ?? true,
      workingDays: p.availability?.workingDays || [],
      startHour: p.availability?.workingHours?.start || '09:00',
      endHour: p.availability?.workingHours?.end || '18:00',
    });

  } catch (e) {
    showToast('Failed to load profile', 'error');
  } finally {
    setLoading(false);
  }
}, []);

 useEffect(() => {
  fetchProfile();
}, [fetchProfile]);

  /* ── helpers ── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleDay = (day) =>
    setForm(f => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter(d => d !== day)
        : [...f.workingDays, day],
    }));

  /* ── availability quick-toggle (no full edit needed) ── */
  const quickToggleAvailability = async () => {
    const next = !provider.availability?.isAvailable;
    setSaving(true);
    try {
      await api.put('/providers/profile', {
        availability: {
          isAvailable:  next,
          workingDays:  provider.availability?.workingDays  || [],
          workingHours: provider.availability?.workingHours || { start: '09:00', end: '18:00' },
        },
      });
      setProvider(p => ({
        ...p,
        availability: { ...p.availability, isAvailable: next },
      }));
      setForm(f => ({ ...f, isAvailable: next }));
      showToast(next ? 'You are now available ✓' : 'You are now unavailable');
    } catch {
      showToast('Could not update availability', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── save full profile ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('name',        form.name);
      payload.append('phone',       form.phone);
      payload.append('bio',         form.bio);
      payload.append('description', form.description);
      payload.append('hourlyRate',  form.hourlyRate);
      payload.append('experience',  form.experience);
      payload.append('location',    JSON.stringify({
        city: form.city, state: form.state, address: form.address,
      }));
      payload.append('availability', JSON.stringify({
        isAvailable:  form.isAvailable,
        workingDays:  form.workingDays,
        workingHours: { start: form.startHour, end: form.endHour },
      }));
      if (fileRef.current?.files[0]) {
        payload.append('profileImage', fileRef.current.files[0]);
      }

      const res = await api.put('/providers/profile', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data.provider || res.data.data;
      setProvider(updated);
      setEditMode(false);
      showToast('Profile updated successfully ✓');
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── render ── */
  if (loading) return (
    <div className="ppp-page">
      <div className="ppp-loading">
        <div className="ppp-spinner" />
        Loading your profile…
      </div>
    </div>
  );

  if (!provider) return (
    <div className="ppp-page">
      <div className="ppp-empty-state">
        <span className="ppp-empty-icon">😕</span>
        <p>Provider profile not found. Please register first.</p>
      </div>
    </div>
  );

  const isAvailable = provider.availability?.isAvailable ?? true;
  const workingDays = provider.availability?.workingDays || [];
  const startHour   = provider.availability?.workingHours?.start || '09:00';
  const endHour     = provider.availability?.workingHours?.end   || '18:00';

  return (
    <div className="ppp-page">
      {/* Toast */}
      {toast && (
        <div className={`ppp-toast ppp-toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="ppp-inner">

        {/* ── Hero banner ── */}
        <div className="ppp-hero">
          <div className="ppp-hero-bg" />
          <div className="ppp-hero-content">
            <div className="ppp-avatar-wrap">
              <img
                className="ppp-avatar"
                src={provider.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name)}&background=6c63ff&color=fff&size=128`}
                alt={provider.name}
              />
              {editMode && (
                <>
                  <label className="ppp-avatar-edit" htmlFor="profileImgInput">✏️</label>
                  <input id="profileImgInput" type="file" accept="image/*" ref={fileRef} hidden />
                </>
              )}
              <span className={`ppp-online-dot ${isAvailable ? 'online' : 'offline'}`} />
            </div>

            <div className="ppp-hero-info">
              <h1 className="ppp-name">{provider.name}</h1>
              <p className="ppp-email">{provider.email}</p>
              <div className="ppp-badges">
                <span className={`ppp-badge ppp-badge-${provider.verificationStatus}`}>
                  {provider.verificationStatus === 'verified' ? '✓ Verified' : provider.verificationStatus}
                </span>
                <span className={`ppp-badge ppp-badge-sub-${provider.subscription}`}>
                  {provider.subscription === 'premium' ? '⭐ Premium' : 'Basic'}
                </span>
                {provider.rating > 0 && (
                  <span className="ppp-badge ppp-badge-rating">
                    ★ {provider.rating.toFixed(1)} ({provider.totalReviews} reviews)
                  </span>
                )}
              </div>
            </div>

            <div className="ppp-hero-actions">
              {/* Availability quick-toggle */}
              <div className="ppp-avail-toggle-wrap">
                <span className="ppp-avail-label">
                  {isAvailable ? '🟢 Available' : '🔴 Unavailable'}
                </span>
                <button
                  className={`ppp-toggle ${isAvailable ? 'on' : 'off'}`}
                  onClick={quickToggleAvailability}
                  disabled={saving || editMode}
                  aria-label="Toggle availability"
                >
                  <span className="ppp-toggle-thumb" />
                </button>
              </div>

              {!editMode
                ? <button className="ppp-btn ppp-btn-edit" onClick={() => setEditMode(true)}>Edit Profile</button>
                : (
                  <div className="ppp-edit-btns">
                    <button className="ppp-btn ppp-btn-save" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button className="ppp-btn ppp-btn-cancel" onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                )
              }
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="ppp-stats">
          {[
            { icon: '💼', num: provider.experience + ' yrs', label: 'Experience' },
            { icon: '💰', num: '₹' + provider.hourlyRate + '/hr', label: 'Hourly Rate' },
            { icon: '🛠️', num: provider.services?.length || 0, label: 'Services' },
            { icon: '⭐', num: provider.rating?.toFixed(1) || '—', label: 'Rating' },
          ].map(s => (
            <div key={s.label} className="ppp-stat">
              <div className="ppp-stat-icon">{s.icon}</div>
              <div className="ppp-stat-num">{s.num}</div>
              <div className="ppp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ppp-grid">

          {/* ── Left column ── */}
          <div className="ppp-col">

            {/* About */}
            <section className="ppp-card">
              <h2 className="ppp-card-title">About</h2>
              {editMode ? (
                <>
                  <textarea
                    className="ppp-input ppp-textarea"
                    placeholder="Short bio…"
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  />
                  <textarea
                    className="ppp-input ppp-textarea"
                    placeholder="Full description…"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ marginTop: 10 }}
                  />
                </>
              ) : (
                <p className="ppp-text">{provider.bio || provider.description || 'No description yet.'}</p>
              )}
            </section>

            {/* Personal details */}
            <section className="ppp-card">
              <h2 className="ppp-card-title">Personal Details</h2>
              {editMode ? (
                <div className="ppp-form-grid">
                  <label className="ppp-label">Full Name
                    <input className="ppp-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </label>
                  <label className="ppp-label">Phone
                    <input className="ppp-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </label>
                  <label className="ppp-label">Hourly Rate (₹)
                    <input className="ppp-input" type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
                  </label>
                  <label className="ppp-label">Experience (years)
                    <input className="ppp-input" type="number" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
                  </label>
                </div>
              ) : (
                <div className="ppp-detail-list">
                  <div className="ppp-detail-row"><span className="ppp-detail-key">📱 Phone</span><span>{provider.phone || '—'}</span></div>
                  <div className="ppp-detail-row"><span className="ppp-detail-key">📧 Email</span><span>{provider.email || '—'}</span></div>
                  <div className="ppp-detail-row"><span className="ppp-detail-key">📍 City</span><span>{provider.location?.city || '—'}</span></div>
                  <div className="ppp-detail-row"><span className="ppp-detail-key">🗺️ State</span><span>{provider.location?.state || '—'}</span></div>
                  <div className="ppp-detail-row"><span className="ppp-detail-key">🏠 Address</span><span>{provider.location?.address || '—'}</span></div>
                </div>
              )}
              {editMode && (
                <div className="ppp-form-grid" style={{ marginTop: 12 }}>
                  <label className="ppp-label">City
                    <input className="ppp-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </label>
                  <label className="ppp-label">State
                    <input className="ppp-input" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  </label>
                  <label className="ppp-label" style={{ gridColumn: '1 / -1' }}>Address
                    <input className="ppp-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </label>
                </div>
              )}
            </section>

          </div>

          {/* ── Right column ── */}
          <div className="ppp-col">

            {/* Availability */}
            <section className="ppp-card">
              <h2 className="ppp-card-title">Availability</h2>

              <div className="ppp-avail-status-row">
                <span className={`ppp-avail-status-dot ${isAvailable ? 'on' : 'off'}`} />
                <span className="ppp-avail-status-text">
                  {isAvailable ? 'Currently accepting bookings' : 'Not accepting bookings'}
                </span>
                {!editMode && (
                  <button
                    className={`ppp-toggle ppp-toggle-sm ${isAvailable ? 'on' : 'off'}`}
                    onClick={quickToggleAvailability}
                    disabled={saving}
                  >
                    <span className="ppp-toggle-thumb" />
                  </button>
                )}
              </div>

              {editMode && (
                <>
                  <div className="ppp-avail-toggle-row">
                    <span>Accept Bookings</span>
                    <button
                      className={`ppp-toggle ${form.isAvailable ? 'on' : 'off'}`}
                      onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}
                    >
                      <span className="ppp-toggle-thumb" />
                    </button>
                  </div>

                  <div className="ppp-days-grid">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        className={`ppp-day-pill ${form.workingDays.includes(day) ? 'active' : ''}`}
                        onClick={() => toggleDay(day)}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  <div className="ppp-hours-row">
                    <label className="ppp-label">Start
                      <input type="time" className="ppp-input" value={form.startHour}
                        onChange={e => setForm(f => ({ ...f, startHour: e.target.value }))} />
                    </label>
                    <span className="ppp-hours-sep">→</span>
                    <label className="ppp-label">End
                      <input type="time" className="ppp-input" value={form.endHour}
                        onChange={e => setForm(f => ({ ...f, endHour: e.target.value }))} />
                    </label>
                  </div>
                </>
              )}

              {!editMode && workingDays.length > 0 && (
                <>
                  <div className="ppp-days-display">
                    {DAYS.map(day => (
                      <span key={day} className={`ppp-day-chip ${workingDays.includes(day) ? 'active' : ''}`}>
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                  <div className="ppp-hours-display">
                    🕐 {startHour} – {endHour}
                  </div>
                </>
              )}
            </section>

            {/* Services */}
            <section className="ppp-card">
              <h2 className="ppp-card-title">Services Offered</h2>
              {provider.services?.length > 0 ? (
                <div className="ppp-services-list">
                  {provider.services.map((s, i) => (
                    <div key={i} className="ppp-service-item">
                      <div className="ppp-service-info">
                        <div className="ppp-service-name">{s.name}</div>
                        <div className="ppp-service-cat">{s.category}</div>
                        {s.description && <div className="ppp-service-desc">{s.description}</div>}
                      </div>
                      <div className="ppp-service-price">
                        ₹{s.price}<span>/{s.priceUnit || 'hr'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ppp-empty-sub">No services listed yet.</p>
              )}
            </section>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderProfilePage;