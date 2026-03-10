// src/components/bargaining/NegotiatePage.jsx
//
// ═══════════════════════════════════════════════════════════════════════
// BUGS FIXED (all original fixes retained)
// ✅ FIX #1 — STALE REDUX STATE cleared before every load
// ✅ FIX #2 — CONDITION ORDER — unified `pageLoading` flag
// ✅ FIX #3 — fetchByBooking failure treated as "no negotiation yet"
// ✅ FIX #4 — Validate negotiation.booking matches bookingId
// ✅ FIX #5 — clearNegotiation on unmount
// ✅ FIX #6 — Re-fetch full populated object after initNegotiation
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate }   from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchByBooking,
  fetchNegotiation,
  initNegotiation,
  clearNegotiation,
} from '../../redux/slices/bargainSlice';
import api            from '../../api/axiosInstance';
import NegotiationPanel from './NegotiationPanel';
import './Negotiation.css';

const MAX_DISCOUNT_PCT = 40;

/* ── Spinner ── */
const Spinner = ({ label = 'Loading…' }) => (
  <div className="negotiate-spinner-wrap">
    <div className="spinner" />
    <span>{label}</span>
  </div>
);

export default function NegotiatePage() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const dispatch      = useDispatch();

  const currentUser  = useSelector((s) => s.auth.user);
  const { current: negotiation } = useSelector((s) => s.bargain);

  const [booking,        setBooking]       = useState(null);
  const [userIsCustomer, setUserIsCustomer] = useState(true);
  const [pageLoading,    setPageLoading]    = useState(true);
  const [pageError,      setPageError]      = useState('');

  const [offer,      setOffer]      = useState('');
  const [offerMsg,   setOfferMsg]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');

  /* ── Load booking + any existing negotiation ── */
  const load = useCallback(async () => {
    dispatch(clearNegotiation());
    setPageLoading(true);
    setPageError('');

    try {
      let found = null;
      let foundAsCustomer = false;

      try {
        const r = await api.get('/bookings/my-bookings');
        const match = (r.data.bookings || []).find((b) => b._id === bookingId);
        if (match) { found = match; foundAsCustomer = true; }
      } catch (_) { /* not a customer — try provider */ }

      if (!found) {
        try {
          const r = await api.get('/bookings/provider-bookings');
          const match = (r.data.bookings || []).find((b) => b._id === bookingId);
          if (match) { found = match; foundAsCustomer = false; }
        } catch (_) { /* ignore */ }
      }

      if (!found) {
        setPageError('Booking not found, or you do not have access to it.');
        return;
      }

      setBooking(found);
      setUserIsCustomer(foundAsCustomer);

      const listedPrice = found.service?.price || found.totalAmount || 0;
      if (listedPrice > 0) setOffer(String(Math.round(listedPrice * 0.85)));

      try {
        const action = await dispatch(fetchByBooking(bookingId));
        const loaded = action.payload;
        if (loaded && loaded.booking) {
          const loadedBookingId =
            typeof loaded.booking === 'object'
              ? loaded.booking._id?.toString()
              : loaded.booking?.toString();
          if (loadedBookingId && loadedBookingId !== bookingId) {
            dispatch(clearNegotiation());
          }
        }
      } catch (_) {
        dispatch(clearNegotiation());
      }

    } catch (err) {
      setPageError('Failed to load page. Please go back and try again.');
    } finally {
      setPageLoading(false);
    }
  }, [bookingId, dispatch]);

  useEffect(() => {
    load();
    return () => { dispatch(clearNegotiation()); };
  }, [load, dispatch]);

  /* ── Start negotiation ── */
  const handleStart = async () => {
    const amt  = Number(offer);
    const orig = booking?.service?.price || booking?.totalAmount || 0;

    if (!amt || isNaN(amt) || amt <= 0)
      return setFormError('Please enter a valid offer amount.');
    if (orig > 0 && amt >= orig)
      return setFormError('Your offer must be less than the listed price.');
    if (orig > 0) {
      const minAllowed = orig * (1 - MAX_DISCOUNT_PCT / 100);
      if (amt < minAllowed)
        return setFormError(
          `Minimum offer is ₹${Math.ceil(minAllowed).toLocaleString()} (max ${MAX_DISCOUNT_PCT}% off).`
        );
    }

    setFormError('');
    setSubmitting(true);
    try {
      const action = await dispatch(initNegotiation({
        bookingId,
        initialOffer: amt,
        message:      offerMsg.trim(),
      })).unwrap();

      if (action?._id) {
        await dispatch(fetchNegotiation(action._id));
      }
    } catch (e) {
      setFormError(typeof e === 'string' ? e : e?.message || 'Failed to start negotiation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDealClosed = useCallback(() => {
    const dest = currentUser?.role === 'provider' ? '/dashboard/provider' : '/dashboard/user';
    setTimeout(() => navigate(dest), 2800);
  }, [currentUser, navigate]);

  /* ── Derived values ── */
  const origPrice    = booking?.service?.price || booking?.totalAmount || 0;
  const minOffer     = origPrice > 0 ? Math.ceil(origPrice * (1 - MAX_DISCOUNT_PCT / 100)) : 0;
  const offerNum     = Number(offer || 0);
  const savings      = origPrice > 0 && offerNum > 0 && offerNum < origPrice ? origPrice - offerNum : 0;
  const savingsPct   = origPrice > 0 && savings > 0 ? ((savings / origPrice) * 100).toFixed(1) : '0';
  const discountBarW = origPrice > 0 && offerNum > 0
    ? Math.max(0, Math.min(100, ((origPrice - offerNum) / origPrice) * 100))
    : 0;

  const isCustomer = userIsCustomer;
  const submitDisabled = submitting || !offer || Number(offer) <= 0;

  /* ── Renders ── */
  if (pageLoading) return <Spinner label="Loading booking details…" />;

  if (pageError) return (
    <div className="negotiate-error-wrap">
      <div className="negotiate-error-box">
        <div className="negotiate-error-icon">⚠️</div>
        <p>{pageError}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="negotiate-page">

      {/* Back */}
      <button className="negotiate-back-btn" onClick={() => navigate(-1)}>
        ← Back to bookings
      </button>

      {/* Booking summary */}
      {booking && (
        <div className="booking-summary">
          <div className="booking-summary-left">
            <div className="booking-summary-name">
              {booking.service?.name || 'Service'}
            </div>
            <div className="booking-summary-meta">
              <span>
                {isCustomer
                  ? `Provider: ${booking.provider?.user?.name || booking.provider?.name || 'Provider'}`
                  : `Customer: ${booking.user?.name || 'Customer'}`}
              </span>
              <span className={`booking-status-badge ${booking.status === 'pending' ? 'pending' : 'default'}`}>
                {booking.status?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="booking-summary-right">
            <div className="booking-listed-label">Listed Price</div>
            <div className="booking-listed-price">₹{origPrice.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* ── Case A: Negotiation exists ── */}
      {negotiation ? (
        <NegotiationPanel
          negotiationId={negotiation._id}
          userRole={isCustomer ? 'customer' : 'provider'}
          onDealClosed={handleDealClosed}
        />

      ) : isCustomer ? (
        /* ── Case B: Customer — start form ── */
        <div className="offer-form-card">
          <div className="offer-form-header">
            <div className="offer-form-header-title">💰 Propose Your Price</div>
            <div className="offer-form-header-subtitle">
              Send your best offer to the provider. Up to {MAX_DISCOUNT_PCT}% discount · 5 rounds of negotiation.
            </div>
          </div>

          <div className="offer-form-body">

            {/* Price guide */}
            <div className="price-guide">
              <div className="price-guide-item">
                <div className="price-guide-label">Min Offer</div>
                <div className="price-guide-value red">₹{minOffer.toLocaleString()}</div>
              </div>
              <div className="price-guide-item center">
                <div className="price-guide-label">Suggested (15% off)</div>
                <div className="price-guide-value orange">₹{Math.round(origPrice * 0.85).toLocaleString()}</div>
              </div>
              <div className="price-guide-item right">
                <div className="price-guide-label">Listed</div>
                <div className="price-guide-value strikethrough">₹{origPrice.toLocaleString()}</div>
              </div>
            </div>

            {/* Discount visualizer */}
            {origPrice > 0 && (
              <div className="discount-bar-wrap">
                <div className="discount-bar-labels">
                  <span>0% off</span>
                  <span>Max {MAX_DISCOUNT_PCT}% off</span>
                </div>
                <div className="discount-bar-track">
                  <div
                    className={`discount-bar-fill ${discountBarW > 30 ? 'warning' : 'safe'}`}
                    style={{ width: `${discountBarW}%` }}
                  />
                </div>
                {savings > 0 && (
                  <div className="discount-bar-savings">
                    💰 You save ₹{savings.toLocaleString()} ({savingsPct}% off)
                  </div>
                )}
              </div>
            )}

            {/* Form error */}
            {formError && <div className="offer-form-error">⚠️ {formError}</div>}

            {/* Offer input */}
            <div className="offer-input-group">
              <label>Your Offer (₹) *</label>
              <div className="offer-input-wrap">
                <span className="offer-input-currency">₹</span>
                <input
                  type="number"
                  className="offer-input"
                  value={offer}
                  onChange={(e) => { setOffer(e.target.value); setFormError(''); }}
                  min={minOffer}
                  max={origPrice > 0 ? origPrice - 1 : undefined}
                  placeholder={origPrice > 0 ? `${minOffer.toLocaleString()}–${(origPrice - 1).toLocaleString()}` : 'Enter your offer'}
                  onKeyDown={(e) => e.key === 'Enter' && !submitting && offer && handleStart()}
                />
              </div>
            </div>

            {/* Message */}
            <div className="offer-msg-group offer-input-group">
              <label>Message to Provider <span>(optional)</span></label>
              <textarea
                className="offer-textarea"
                value={offerMsg}
                onChange={(e) => setOfferMsg(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="e.g. Regular customer, happy to book again soon…"
              />
              <div className="offer-char-count">{offerMsg.length}/200</div>
            </div>

            {/* Quick presets */}
            {origPrice > 0 && (
              <div className="offer-presets-wrap">
                <div className="offer-presets-label">Quick Presets:</div>
                <div className="offer-presets-row">
                  {[10, 15, 20, 25].map((pctOff) => {
                    const presetAmt = Math.round(origPrice * (1 - pctOff / 100));
                    if (presetAmt < minOffer) return null;
                    return (
                      <button
                        key={pctOff}
                        className={`offer-preset-btn ${Number(offer) === presetAmt ? 'active' : ''}`}
                        onClick={() => { setOffer(String(presetAmt)); setFormError(''); }}
                      >
                        −{pctOff}% · ₹{presetAmt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              className={`offer-submit-btn ${submitDisabled ? 'disabled' : 'active'}`}
              onClick={handleStart}
              disabled={submitDisabled}
            >
              {submitting
                ? '⏳ Sending your offer…'
                : `💰 Send Offer — ₹${offerNum > 0 ? offerNum.toLocaleString() : '—'}`}
            </button>

            <p className="offer-submit-hint">
              Max {MAX_DISCOUNT_PCT}% discount · Up to 5 rounds · Provider notified instantly
            </p>
          </div>
        </div>

      ) : (
        /* ── Case C: Provider — no negotiation yet ── */
        <div className="no-negotiation-card">
          <div className="no-negotiation-icon">🤝</div>
          <h3>No Active Negotiation</h3>
          <p>
            The customer hasn't proposed a price for this booking yet.<br />
            You'll be notified as soon as they send an offer.
          </p>
          <button className="btn-primary" onClick={() => navigate(-1)}>← Back to Dashboard</button>
        </div>
      )}
    </div>
  );
}