// src/pages/provider/ProviderDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';
import './ProviderDashboard.css';

/* ── Status metadata (labels/icons only — colors live in CSS) ── */
const STATUS_META = {
  pending:   { label: 'Pending',   icon: '⏳' },
  accepted:  { label: 'Accepted',  icon: '✅' },
  completed: { label: 'Completed', icon: '🏁' },
  rejected:  { label: 'Rejected',  icon: '❌' },
  cancelled: { label: 'Cancelled', icon: '🚫' },
};

const STATUS_MSGS = {
  pending:   '⏳ New request — accept or reject. Customer may have proposed a price.',
  accepted:  '✅ Booking accepted. Mark complete once the service is delivered.',
  completed: '🏁 Service delivered and completed.',
  rejected:  '❌ You rejected this request.',
  cancelled: '🚫 Customer cancelled this booking.',
};

const ProviderDashboard = () => {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [bookings,      setBookings]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [actionLoading, setActionLoading] = useState('');
  const [msg,           setMsg]           = useState({ text: '', type: '' });

  // Bill / Complete modal
  const [billModal,   setBillModal]   = useState(null);
  const [billAmount,  setBillAmount]  = useState('');
  const [billNotes,   setBillNotes]   = useState('');
  const [billLoading, setBillLoading] = useState(false);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4500);
  };

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/bookings/provider-bookings');
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('[ProviderDashboard]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  /* ── Accept ─────────────────────────────────────────────── */
  const handleAccept = async (id) => {
    setActionLoading(id + '_accept');
    try {
      await api.put(`/bookings/${id}/status`, { status: 'accepted' });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'accepted' } : b));
      showMsg('✅ Booking accepted! Customer has been notified.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to accept booking', 'error');
    } finally {
      setActionLoading('');
    }
  };

  /* ── Reject ──────────────────────────────────────────────── */
  const handleReject = async (id) => {
    if (!window.confirm('Reject this booking request?')) return;
    setActionLoading(id + '_reject');
    try {
      await api.put(`/bookings/${id}/status`, { status: 'rejected' });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'rejected' } : b));
      showMsg('Booking rejected.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to reject booking', 'error');
    } finally {
      setActionLoading('');
    }
  };

  /* ── Open bill modal ─────────────────────────────────────── */
  const openBillModal = (booking) => {
    const amount = booking.finalPrice || booking.totalAmount || booking.service?.price || '';
    setBillModal(booking);
    setBillAmount(amount.toString());
    setBillNotes('');
  };

  /* ── Mark Complete ───────────────────────────────────────── */
  const handleMarkComplete = async () => {
    const amt = Number(billAmount);
    if (!amt || isNaN(amt) || amt <= 0) return showMsg('Enter a valid billing amount', 'error');
    setBillLoading(true);
    try {
      await api.put(`/bookings/${billModal._id}/status`, {
        status:     'completed',
        billAmount: amt,
      });
      setBookings(prev => prev.map(b =>
        b._id === billModal._id ? { ...b, status: 'completed', totalAmount: amt } : b
      ));
      setBillModal(null);
      showMsg('🏁 Booking completed! Invoice sent to customer.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to complete booking', 'error');
    } finally {
      setBillLoading(false);
    }
  };

  /* ── Chat ─────────────────────────────────────────────────── */
  const handleChat = (booking) => {
    const customerUserId = booking.user?._id || booking.user;
    const customerName   = booking.user?.name || 'Customer';
    navigate(`/chat?with=${customerUserId}&booking=${booking._id}&name=${encodeURIComponent(customerName)}`);
  };

  /* ── Negotiate ───────────────────────────────────────────── */
  const handleNegotiate = (bookingId) => navigate(`/negotiate/${bookingId}`);

  /* ── Filtered list ───────────────────────────────────────── */
  const filteredBookings = filterStatus === 'all'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  const counts = {
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
          <div className="dh-avatar provider-clr">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>Provider Dashboard</h1>
            <p>Manage your incoming service requests</p>
          </div>
        </div>
        <button className="btn-chat-header" onClick={() => navigate('/chat')}>
          💬 My Chats
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-number">{bookings.length}</span>
          <span>Total</span>
        </div>
        <div className="stat-box pending-box">
          <span className="stat-number">{counts.pending}</span>
          <span>Pending</span>
        </div>
        <div className="stat-box accepted-box">
          <span className="stat-number">{counts.accepted}</span>
          <span>Active</span>
        </div>
        <div className="stat-box completed-box">
          <span className="stat-number">{counts.completed}</span>
          <span>Completed</span>
        </div>
      </div>

      {/* ── Alert ── */}
      {msg.text && (
        <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {msg.text}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        {['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled'].map(s => (
          <button
            key={s}
            className={`filter-pill ${filterStatus === s ? 'filter-pill-active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && counts.pending > 0 && (
              <span className="filter-badge">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Bookings List ── */}
      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>{filterStatus === 'all' ? 'No bookings yet' : `No ${filterStatus} bookings`}</h3>
          <p>When customers book your services, they'll appear here.</p>
        </div>
      ) : (
        <div className="bookings-section">
          {filteredBookings.map(booking => {
            const meta         = STATUS_META[booking.status] || STATUS_META.pending;
            const isPending    = booking.status === 'pending';
            const isAccepted   = booking.status === 'accepted';
            const price        = booking.totalAmount || booking.service?.price || 0;
            const hasNegotiated = booking.priceNegotiated && booking.finalPrice;

            return (
              <div key={booking._id} className="booking-card-pro">
                {/* Colored left strip — color set via data attribute + CSS */}
                <div className="booking-status-strip" data-status={booking.status} />

                <div className="booking-card-body">
                  {/* Top row */}
                  <div className="booking-top">
                    <div className="booking-service-info">
                      <h3>{booking.service?.name}</h3>
                      <span className="service-category-tag">{booking.service?.category}</span>
                    </div>
                    <span className="status-chip" data-status={booking.status}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>

                  {/* Customer info */}
                  <div className="booking-client">
                    <div className="client-avatar">
                      {booking.user?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="client-details">
                      <strong>Customer: {booking.user?.name}</strong>
                      <span>{booking.user?.email}</span>
                    </div>
                  </div>

                  {/* Booking detail grid */}
                  <div className="booking-info-grid">
                    <div className="binfo">
                      <span className="binfo-label">📅 Date</span>
                      <span className="binfo-value">
                        {new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric',
                          month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="binfo">
                      <span className="binfo-label">⏰ Time</span>
                      <span className="binfo-value">{booking.scheduledTime}</span>
                    </div>
                    <div className="binfo">
                      <span className="binfo-label">💰 Price</span>
                      <span className="binfo-value">
                        {hasNegotiated ? (
                          <>
                            <span className="price-original">₹{booking.service?.price || price}</span>
                            <span className="price-negotiated">₹{booking.finalPrice} 🤝</span>
                          </>
                        ) : (
                          `₹${price} / ${booking.service?.priceUnit || 'hr'}`
                        )}
                      </span>
                    </div>
                    <div className="binfo">
                      <span className="binfo-label">📍 Address</span>
                      <span className="binfo-value">
                        {booking.address?.street}, {booking.address?.city}
                      </span>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="booking-notes">
                      <span>📝 Notes:</span> {booking.notes}
                    </div>
                  )}

                  {/* Negotiated price banner */}
                  {hasNegotiated && (
                    <div className="booking-negotiated-banner">
                      🤝 Agreed negotiated price: <strong>₹{booking.finalPrice}</strong>
                      &nbsp;— this will appear on the invoice.
                    </div>
                  )}

                  {/* Status message */}
                  <div className="booking-status-msg" data-status={booking.status}>
                    {STATUS_MSGS[booking.status]}
                  </div>

                  {/* ── Action Buttons ── */}
                  <div className="booking-actions">
                    {isPending && (
                      <button
                        className="btn-accept"
                        onClick={() => handleAccept(booking._id)}
                        disabled={actionLoading === booking._id + '_accept'}
                      >
                        {actionLoading === booking._id + '_accept' ? '⏳…' : '✅ Accept Booking'}
                      </button>
                    )}

                    {(isPending || isAccepted) && (
                      <button className="btn-chat-header" onClick={() => handleChat(booking)}>
                        💬 Chat
                      </button>
                    )}

                    {(isPending || isAccepted) && (
                      <button className="btn-negotiate" onClick={() => handleNegotiate(booking._id)}>
                        💰 {isPending ? 'Check Offer' : 'Negotiation'}
                      </button>
                    )}

                    {isAccepted && (
                      <button className="btn-complete" onClick={() => openBillModal(booking)}>
                        🏁 Mark Complete
                      </button>
                    )}

                    {isPending && (
                      <button
                        className="btn-danger btn-sm"
                        disabled={actionLoading === booking._id + '_reject'}
                        onClick={() => handleReject(booking._id)}
                      >
                        {actionLoading === booking._id + '_reject' ? '⏳…' : '❌ Reject'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Bill / Complete Modal ══ */}
      {billModal && (
        <div className="modal-overlay" onClick={() => !billLoading && setBillModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🏁 Mark Service Complete</h3>
            <p className="modal-subtitle">
              Confirm the final billing amount for{' '}
              <strong>{billModal.service?.name}</strong>
            </p>

            {billModal.priceNegotiated && billModal.finalPrice && (
              <div className="modal-negotiated-hint">
                🤝 <strong>Negotiated price: ₹{billModal.finalPrice}</strong>
                &nbsp;— pre-filled below. Invoice will show this amount.
              </div>
            )}

            <div className="modal-field">
              <label className="modal-label">Billing Amount (₹) *</label>
              <input
                type="number"
                className="modal-amount-input"
                value={billAmount}
                onChange={e => setBillAmount(e.target.value)}
              />
              {billModal.finalPrice && Number(billAmount) === Number(billModal.finalPrice) && (
                <div className="modal-match-hint">✅ Matches negotiated price</div>
              )}
            </div>

            <div className="modal-field">
              <label className="modal-label">
                Completion Notes{' '}
                <span className="modal-label-optional">(optional)</span>
              </label>
              <textarea
                className="modal-notes-textarea"
                value={billNotes}
                onChange={e => setBillNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Work completed, area cleaned…"
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn-cancel"
                onClick={() => setBillModal(null)}
                disabled={billLoading}
              >
                Cancel
              </button>
              <button
                className="modal-btn-confirm"
                onClick={handleMarkComplete}
                disabled={billLoading || !billAmount}
              >
                {billLoading
                  ? '⏳ Processing…'
                  : `✅ Confirm ₹${Number(billAmount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;