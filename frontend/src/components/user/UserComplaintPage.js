// src/pages/complaints/UserComplaintPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import '../../App.css';
import './Complaints.css';

/* ── Constants ─────────────────────────────────────────────── */
const CATEGORIES = [
  'Poor Service Quality',
  'Overcharging / Billing Issue',
  'Misbehavior / Unprofessional Conduct',
  'Late Arrival / No Show',
  'Work Not Completed',
  'Damage to Property',
  'Safety Concern',
  'Fraud / Scam',
  'Other',
];

const STATUS_CLASS = {
  Pending:        'badge-pending',
  'Under Review': 'badge-review',
  Resolved:       'badge-resolved',
  Rejected:       'badge-rejected',
};

/* ── Countdown Timer ─────────────────────────────────────────*/
const ComplaintTimer = ({ allowedUntil }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [expired,  setExpired]  = useState(false);

  useEffect(() => {
    if (!allowedUntil) return;
    const calc = () => {
      const diff = new Date(allowedUntil) - new Date();
      if (diff <= 0) { setExpired(true); setTimeLeft(''); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setIsUrgent(diff < 10 * 60 * 1000);
      setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [allowedUntil]);

  if (expired) return (
    <div className="ucp-timer-closed">
      🔒 Complaint window closed — the 1-hour window has expired.
    </div>
  );

  return (
    <div className={`ucp-timer ${isUrgent ? 'urgent' : ''}`}>
      <span className="ucp-timer-icon">{isUrgent ? '🔴' : '⚠️'}</span>
      <div className="ucp-timer-info">
        <div className="ucp-timer-label">Complaint window closes in</div>
        <div className="ucp-timer-value">{timeLeft || '—'}</div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
const UserComplaintPage = () => {
  const [searchParams]   = useSearchParams();
  const prefilledBookingId = searchParams.get('booking');

  // Form state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [category,        setCategory]        = useState('');
  const [text,            setText]            = useState('');
  const [images,          setImages]          = useState([]);
  const [previews,        setPreviews]        = useState([]);
  const [dragging,        setDragging]        = useState(false);
  const [submitting,      setSubmitting]      = useState(false);

  // Window / booking data
  const [bookings,          setBookings]          = useState([]);
  const [windowInfo,        setWindowInfo]        = useState(null);
  const [loadingWindow,     setLoadingWindow]     = useState(false);

  // Past complaints
  const [complaints,        setComplaints]        = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);

  const [msg, setMsg] = useState({ text: '', type: '' });
  const fileRef = useRef(null);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  /* ── Load eligible bookings ─────────────────────────────── */
  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/my-bookings');
      const eligible = (res.data.bookings || []).filter(
        b => ['accepted', 'completed'].includes(b.status)
      );
      setBookings(eligible);

      if (prefilledBookingId) {
        const found = eligible.find(b => b._id === prefilledBookingId);
        if (found) selectBooking(found);
      }
    } catch (e) {
      console.error(e);
    }
  }, [prefilledBookingId]);

  const fetchComplaints = useCallback(async () => {
    try {
      const res = await api.get('/complaints/user');
      setComplaints(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchComplaints();
  }, [fetchBookings, fetchComplaints]);

  const selectBooking = async (booking) => {
    setSelectedBooking(booking);
    setLoadingWindow(true);
    try {
      const res = await api.get(`/complaints/window/${booking._id}`);
      setWindowInfo(res.data);
    } catch (e) {
      setWindowInfo(null);
    } finally {
      setLoadingWindow(false);
    }
  };

  /* ── Image handling ─────────────────────────────────────── */
  const addImages = (files) => {
    const valid = Array.from(files).filter(
      f => f.type.startsWith('image/') && f.size < 5 * 1024 * 1024
    );
    if (images.length + valid.length > 5) {
      showMsg('Maximum 5 images allowed.', 'error');
      return;
    }
    setImages(prev => [...prev, ...valid]);
    valid.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target.result]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (idx) => {
    setImages(prev  => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addImages(e.dataTransfer.files);
  };

  /* ── Submit ─────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBooking)          return showMsg('Please select a booking.', 'error');
    if (!category)                 return showMsg('Please choose a category.', 'error');
    if (text.trim().length < 20)   return showMsg('Complaint must be at least 20 characters.', 'error');
    if (!windowInfo?.available)    return showMsg('Complaint window is closed or already filed.', 'error');

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('serviceRequestId',  selectedBooking._id);
      fd.append('complaintCategory', category);
      fd.append('complaintText',     text.trim());
      images.forEach(img => fd.append('evidence', img));

      await api.post('/complaints/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showMsg('Your complaint has been submitted successfully! 🎉');
      setCategory(''); setText(''); setImages([]); setPreviews([]);
      setSelectedBooking(null); setWindowInfo(null);
      fetchComplaints();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = windowInfo?.available && !windowInfo?.alreadyFiled;

  return (
    <div className="ucp-page">
      <div className="ucp-inner">

        {/* ── Breadcrumb + Header ── */}
        <div className="ucp-page-header">
          <div className="ucp-breadcrumb">
            <Link to="/dashboard/user">Dashboard</Link>
            <span>›</span>
            <span>File a Complaint</span>
          </div>
          <h1>📣 File a Complaint</h1>
          <p>Report an issue with a provider within 1 hour of service acceptance.</p>
        </div>

        {/* ── Alert ── */}
        {msg.text && (
          <div className={`ucp-alert ${msg.type}`}>
            {msg.type === 'error' ? '❌' : '✅'} {msg.text}
          </div>
        )}

        {/* ── Main Form Card ── */}
        <div className="ucp-card">
          <div className="ucp-card-title">📋 Complaint Details</div>

          <form className="ucp-form" onSubmit={handleSubmit}>

            {/* Booking selector */}
            <div className="ucp-field">
              <label className="ucp-label">
                Select Booking <span className="ucp-required">*</span>
              </label>
              {bookings.length === 0 ? (
                <p className="ucp-booking-empty">
                  No eligible bookings found (accepted or completed only).
                </p>
              ) : (
                <div className="ucp-booking-list">
                  {bookings.map(b => (
                    <div
                      key={b._id}
                      className={`ucp-booking-option ${selectedBooking?._id === b._id ? 'selected' : ''}`}
                      onClick={() => selectBooking(b)}
                    >
                      <div>
                        <div className="ucp-booking-option-name">
                          {b.service?.name || 'Service'}
                        </div>
                        <div className="ucp-booking-option-meta">
                          {b.provider?.user?.name} ·{' '}
                          {new Date(b.scheduledDate).toLocaleDateString('en-IN')} ·{' '}
                          {b.status}
                        </div>
                      </div>
                      <div className="ucp-booking-option-check">
                        {selectedBooking?._id === b._id && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timer / window status */}
            {loadingWindow && (
              <p className="ucp-loading-text">Checking complaint window…</p>
            )}
            {!loadingWindow && windowInfo && windowInfo.allowedUntil && (
              <>
                {windowInfo.alreadyFiled ? (
                  <div className="ucp-filed-banner">
                    ✅ You have already filed a complaint for this booking.
                  </div>
                ) : (
                  <ComplaintTimer allowedUntil={windowInfo.allowedUntil} />
                )}
              </>
            )}
            {!loadingWindow && windowInfo && !windowInfo.available && !windowInfo.alreadyFiled && (
              <div className="ucp-timer-closed">
                🔒 {windowInfo.reason || 'Complaint window is not available for this booking.'}
              </div>
            )}

            {/* Category */}
            <div className="ucp-field">
              <label className="ucp-label">
                Category <span className="ucp-required">*</span>
              </label>
              <select
                className="ucp-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={!canSubmit}
                required
              >
                <option value="">— Select a category —</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="ucp-field">
              <label className="ucp-label">
                Description <span className="ucp-required">*</span>
              </label>
              <textarea
                className="ucp-textarea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Describe the issue in detail (minimum 20 characters)…"
                rows={5}
                maxLength={2000}
                disabled={!canSubmit}
                required
              />
              <div className="ucp-char-hint">{text.length} / 2000 characters</div>
            </div>

            {/* Evidence upload */}
            <div className="ucp-field">
              <label className="ucp-label">Evidence Images (optional — max 5)</label>
              <div
                className={`ucp-upload-area ${dragging ? 'dragging' : ''}`}
                onClick={() => canSubmit && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <span className="ucp-upload-icon">🖼️</span>
                <p className="ucp-upload-text">
                  <strong>Click to upload</strong> or drag &amp; drop images
                </p>
                <p className="ucp-upload-sub">JPG, PNG, WEBP — max 5 MB each</p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => addImages(e.target.files)}
              />

              {previews.length > 0 && (
                <div className="ucp-preview-grid">
                  {previews.map((src, i) => (
                    <div key={i} className="ucp-preview-item">
                      <img src={src} alt={`evidence-${i}`} />
                      <button
                        type="button"
                        className="ucp-preview-rm"
                        onClick={() => removeImage(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="ucp-actions">
              <button
                type="button"
                className="ucp-btn-secondary"
                onClick={() => window.history.back()}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ucp-btn-submit"
                disabled={submitting || !canSubmit}
              >
                {submitting ? '⏳ Submitting…' : '📣 Submit Complaint'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Past Complaints ── */}
        <div className="ucp-history">
          <div className="ucp-history-title">📁 My Complaint History</div>

          {loadingComplaints ? (
            <p className="ucp-loading-text">Loading…</p>
          ) : complaints.length === 0 ? (
            <p className="ucp-history-empty">No complaints filed yet.</p>
          ) : (
            complaints.map(c => (
              <div key={c._id} className="ucp-complaint-card">
                <div className="ucp-complaint-top">
                  <span className="ucp-complaint-id">ID: {c._id.slice(-8).toUpperCase()}</span>
                  <span className={`ucp-status-badge ${STATUS_CLASS[c.status] || 'badge-pending'}`}>
                    {c.status}
                  </span>
                </div>

                <div className="ucp-complaint-cat">{c.complaintCategory}</div>
                <div className="ucp-complaint-text">{c.complaintText}</div>

                {c.evidenceImages?.length > 0 && (
                  <div className="ucp-evidence-imgs">
                    {c.evidenceImages.map((img, i) => (
                      <img
                        key={i}
                        src={img.url}
                        alt="evidence"
                        className="ucp-evidence-img"
                        onClick={() => window.open(img.url, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {c.adminReply?.message && (
                  <div className="ucp-admin-reply">
                    <strong>Admin Response:</strong> {c.adminReply.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserComplaintPage;