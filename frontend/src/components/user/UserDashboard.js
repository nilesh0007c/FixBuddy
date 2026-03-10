// src/pages/user/UserDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/ui/StarRating';
import '../../App.css';

/* ── Status configuration ─────────────────────────────────── */
const STATUS_META = {
  pending:   { label: 'Pending',   icon: '⏳' },
  accepted:  { label: 'Accepted',  icon: '✅' },
  completed: { label: 'Completed', icon: '🏁' },
  rejected:  { label: 'Rejected',  icon: '❌' },
  cancelled: { label: 'Cancelled', icon: '🚫' },
};

const STATUS_MSGS = {
  pending:   '⏳ Waiting for provider to accept. You can propose a price now!',
  accepted:  '✅ Provider accepted! You may chat, negotiate, or file a complaint if needed.',
  completed: '🏁 Service completed. Leave a review or file a complaint within the window.',
  rejected:  '❌ Provider could not accept this request at this time.',
  cancelled: '🚫 This booking was cancelled.',
};

const FILTER_OPTIONS = ['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'];
const RATING_LABELS  = ['', '⭐ Poor', '⭐⭐ Fair', '⭐⭐⭐ Good', '⭐⭐⭐⭐ Very Good', '⭐⭐⭐⭐⭐ Excellent!'];

/* ════════════════════════════════════
   COMPLAINT TIMER BADGE
════════════════════════════════════ */
const ComplaintWindowBadge = ({ allowedUntil, alreadyFiled }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired,  setExpired]  = useState(false);

  useEffect(() => {
    if (!allowedUntil) return;
    const tick = () => {
      const diff = new Date(allowedUntil) - new Date();
      if (diff <= 0) { setExpired(true); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [allowedUntil]);

  if (alreadyFiled) return (
    <span className="complaint-badge filed">✅ Complaint Already Filed</span>
  );
  if (expired || !allowedUntil) return (
    <span className="complaint-badge closed">🔒 Complaint Window Closed</span>
  );

  const isUrgent = (new Date(allowedUntil) - new Date()) < 10 * 60 * 1000;
  return (
    <span className={`complaint-badge open ${isUrgent ? 'urgent' : ''}`}>
      {isUrgent ? '🔴' : '⚠️'} Complaint window: {timeLeft}
    </span>
  );
};

/* ════════════════════════════════════
   BOOKING CARD
════════════════════════════════════ */
const BookingCard = React.memo(({
  booking, onChat, onNegotiate, onCancel, onReview, cancelLoading, complaintWindow,
}) => {
  const meta = STATUS_META[booking.status] || STATUS_META.pending;

  const canChat      = ['pending', 'accepted', 'completed'].includes(booking.status);
  const canNegotiate = ['pending', 'accepted'].includes(booking.status);
  const canCancel    = ['pending', 'accepted'].includes(booking.status);
  const canReview    = booking.status === 'completed' && !booking.isReviewed;

  const showComplaintSection = ['accepted', 'completed'].includes(booking.status);
  const canComplain = showComplaintSection
    && complaintWindow?.available
    && !complaintWindow?.alreadyFiled;

  const providerName  = booking.provider?.user?.name || 'Provider';
  const providerEmail = booking.provider?.user?.email || '';
  const avatarChar    = providerName.charAt(0).toUpperCase();

  return (
    <div className="booking-card-pro">
      {/* Status-colored left strip */}
      <div className="booking-status-strip" data-status={booking.status} />

      <div className="booking-card-body">
        {/* Top row */}
        <div className="booking-top">
          <div className="booking-service-info">
            <h3>{booking.service?.name || 'Service'}</h3>
            {booking.service?.category && (
              <span className="service-category-tag">{booking.service.category}</span>
            )}
          </div>
          <span className="status-chip" data-status={booking.status}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {/* Provider info */}
        <div className="booking-client">
          <div className="client-avatar provider-clr">{avatarChar}</div>
          <div className="client-details">
            <strong>Provider: {providerName}</strong>
            {providerEmail && <span>{providerEmail}</span>}
          </div>
        </div>

        {/* Info grid */}
        <div className="booking-info-grid">
          <div className="binfo">
            <span className="binfo-label">📅 Date</span>
            <span className="binfo-value">
              {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
          <div className="binfo">
            <span className="binfo-label">⏰ Time</span>
            <span className="binfo-value">{booking.scheduledTime || '—'}</span>
          </div>
          <div className="binfo">
            <span className="binfo-label">💰 Amount</span>
            <span className="binfo-value">
              ₹{booking.totalAmount || booking.service?.price}
              {booking.service?.priceUnit ? ` / ${booking.service.priceUnit}` : ''}
            </span>
          </div>
          <div className="binfo">
            <span className="binfo-label">📍 Address</span>
            <span className="binfo-value">
              {[booking.address?.street, booking.address?.city].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
        </div>

        {booking.notes && (
          <div className="booking-notes">
            <span>📝 Notes:</span> {booking.notes}
          </div>
        )}

        {/* Status message */}
        <div className="booking-status-msg" data-status={booking.status}>
          {STATUS_MSGS[booking.status]}
        </div>

        {/* Complaint window indicator */}
        {showComplaintSection && complaintWindow && (
          <div className="complaint-window-row">
            <ComplaintWindowBadge
              allowedUntil={complaintWindow.allowedUntil}
              alreadyFiled={complaintWindow.alreadyFiled}
            />
          </div>
        )}

        {/* ── Actions ── */}
        <div className="booking-actions">
          {canChat && (
            <button className="btn-chat-header" onClick={() => onChat(booking)}>
              💬 Chat with Provider
            </button>
          )}

          {canNegotiate && (
            <button className="btn-negotiate" onClick={() => onNegotiate(booking._id)}>
              💰 {booking.status === 'pending' ? 'Propose a Price' : 'Negotiate Price'}
            </button>
          )}

          {canComplain && (
            <Link to={`/complaints?booking=${booking._id}`} className="btn-complaint">
              📣 File a Complaint
            </Link>
          )}

          {canCancel && (
            <button
              className="btn-danger btn-sm"
              disabled={cancelLoading === booking._id}
              onClick={() => onCancel(booking._id)}
            >
              {cancelLoading === booking._id ? '⏳ Cancelling…' : '🚫 Cancel'}
            </button>
          )}

          {canReview && (
            <button className="btn-outline btn-sm" onClick={() => onReview(booking)}>
              ⭐ Leave Review
            </button>
          )}

          <Link to={`/providers/${booking.provider?._id}`} className="btn-outline btn-sm">
            👤 View Provider
          </Link>
        </div>
      </div>
    </div>
  );
});

/* ════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════ */
const UserDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [bookings,         setBookings]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState('bookings');
  const [filterStatus,     setFilterStatus]     = useState('all');
  const [cancelLoading,    setCancelLoading]    = useState('');
  const [msg,              setMsg]              = useState({ text: '', type: '' });
  const [complaintWindows, setComplaintWindows] = useState({});

  // Review state
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const fetchBookings = useCallback(async () => {
    try {
      const res  = await api.get('/bookings/my-bookings');
      const list = res.data.bookings || [];
      setBookings(list);

      const eligible      = list.filter(b => ['accepted', 'completed'].includes(b.status));
      const windowResults = await Promise.allSettled(
        eligible.map(b => api.get(`/complaints/window/${b._id}`).then(r => ({ id: b._id, data: r.data })))
      );
      const windows = {};
      windowResults.forEach(r => {
        if (r.status === 'fulfilled') windows[r.value.id] = r.value.data;
      });
      setComplaintWindows(windows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleChat = (booking) => {
    const pid  = booking.provider?.user?._id || booking.provider?.user;
    const name = booking.provider?.user?.name || booking.provider?.name || 'Provider';
    navigate(`/chat?with=${pid}&booking=${booking._id}&name=${encodeURIComponent(name)}`);
  };

  const handleNegotiate = (bookingId) => navigate(`/negotiate/${bookingId}`);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelLoading(id);
    try {
      await api.put(`/bookings/${id}/cancel`);
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      showMsg('Booking cancelled successfully.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to cancel booking.', 'error');
    } finally {
      setCancelLoading('');
    }
  };

  const openReview = (booking) => {
    setReviewBooking(booking);
    setReviewRating(0);
    setReviewComment('');
    setActiveTab('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating)         return showMsg('Please select a star rating.', 'error');
    if (!reviewComment.trim()) return showMsg('Please write a comment.', 'error');
    setReviewLoading(true);
    try {
      await api.post('/reviews', {
        providerId: reviewBooking.provider?._id,
        bookingId:  reviewBooking._id,
        rating:     reviewRating,
        comment:    reviewComment,
      });
      showMsg('Review submitted — thank you! 🎉');
      setReviewBooking(null);
      setActiveTab('bookings');
      fetchBookings();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to submit review.', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredBookings = filterStatus === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  const counts = {
    total:     bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    accepted:  bookings.filter(b => b.status === 'accepted').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>Loading your bookings…</p>
    </div>
  );

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dh-left">
          <div className="dh-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <h1>Hello, {user?.name}! 👋</h1>
            <p>Manage your service bookings</p>
          </div>
        </div>
        <div className="dh-actions">
          <button className="btn-chat-header" onClick={() => navigate('/chat')}>
            💬 My Chats
          </button>
          <Link to="/complaints" className="btn-complaint-header">
            📣 My Complaints
          </Link>
          <Link to="/services" className="btn-primary">+ Book a Service</Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-number">{counts.total}</span>
          <span>Total Bookings</span>
        </div>
        <div className="stat-box pending-box">
          <span className="stat-number">{counts.pending}</span>
          <span>Pending</span>
        </div>
        <div className="stat-box accepted-box">
          <span className="stat-number">{counts.accepted}</span>
          <span>Accepted</span>
        </div>
        <div className="stat-box completed-box">
          <span className="stat-number">{counts.completed}</span>
          <span>Completed</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="dashboard-tabs">
        <button
          className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📋 My Bookings
        </button>
        <button
          className={`tab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          ⭐ Leave a Review
        </button>
      </div>

      {/* ── Alert ── */}
      {msg.text && (
        <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {msg.type === 'error' ? '❌' : '✅'} {msg.text}
        </div>
      )}

      {/* ════ Bookings Tab ════ */}
      {activeTab === 'bookings' && (
        <div>
          <div className="filter-bar">
            {FILTER_OPTIONS.map(s => (
              <button
                key={s}
                className={`filter-pill ${filterStatus === s ? 'filter-pill-active' : ''}`}
                onClick={() => setFilterStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🗂️</span>
              <h3>{filterStatus === 'all' ? 'No bookings yet' : `No ${filterStatus} bookings`}</h3>
              <p>Browse providers and book your first service!</p>
              <Link to="/services" className="btn-primary">
                Find Services →
              </Link>
            </div>
          ) : (
            <div className="bookings-section">
              {filteredBookings.map(booking => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onChat={handleChat}
                  onNegotiate={handleNegotiate}
                  onCancel={handleCancel}
                  onReview={openReview}
                  cancelLoading={cancelLoading}
                  complaintWindow={complaintWindows[booking._id] || null}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ Review Tab ════ */}
      {activeTab === 'review' && (
        <div className="review-form-section">
          {!reviewBooking ? (
            <div className="empty-state">
              <span className="empty-icon">⭐</span>
              <h3>Leave a Review</h3>
              <p>Go to a <strong>Completed</strong> booking and click "Leave Review".</p>
              <button className="btn-outline" onClick={() => setActiveTab('bookings')}>
                ← View My Bookings
              </button>
            </div>
          ) : (
            <>
              <div className="review-for-banner">
                <span>Reviewing:</span>
                <strong>{reviewBooking.service?.name}</strong>
                <span>by</span>
                <strong>{reviewBooking.provider?.user?.name}</strong>
              </div>
              <form onSubmit={submitReview} className="review-form">
                <div className="form-group">
                  <label>Your Rating *</label>
                  <div className="star-select">
                    <StarRating
                      rating={reviewRating}
                      interactive
                      onRate={r => setReviewRating(r)}
                      size="lg"
                    />
                    <span className="rating-hint">
                      {RATING_LABELS[reviewRating] || 'Click a star to rate'}
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Your Comment *</label>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    rows={4}
                    placeholder="Share your honest experience with this provider…"
                    required
                  />
                  <small className="char-count">{reviewComment.length} / 1000 characters</small>
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => { setReviewBooking(null); setActiveTab('bookings'); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={reviewLoading}>
                    {reviewLoading ? '⏳ Submitting…' : '⭐ Submit Review'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;