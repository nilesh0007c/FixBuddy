// src/components/bargaining/NegotiationPanel.jsx
//
// ═══════════════════════════════════════════════════════════════════════
// BUGS FIXED (all original fixes retained)
// ✅ BUG #1 — Use `currentUser?.id || currentUser?._id`
// ✅ BUG #2 — Round counter shows 1-of-5 with colour feedback
// ✅ BUG #3 — Waiting-state label uses "the customer" for providers
// ✅ FEATURE — Provider auto-suggest banner
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNegotiation,
  submitOffer,
  acceptOffer,
  rejectOffer,
  fetchSuggestion,
} from '../../redux/slices/bargainSlice';
import './Negotiation.css';

/* ── Formatters ── */
const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const pct = (offer, original) =>
  (((original - offer) / original) * 100).toFixed(1);

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

/* ── Offer Bubble ── */
const OfferBubble = ({ offer, originalPrice, isOwn }) => {
  const isCustomer = offer.role === 'customer';
  const isAuto     = offer.fromUser === null;
  const discount   = parseFloat(pct(offer.amount, originalPrice));
  const roleClass  = isCustomer ? 'customer' : 'provider';
  const ownClass   = isOwn ? 'own' : 'theirs';

  return (
    <div className={`np-offer-row ${ownClass}`}>

      {/* Left avatar */}
      {!isOwn && (
        <div className={`np-bubble-avatar left ${roleClass}`}>
          {isCustomer ? '👤' : (isAuto ? '🤖' : '🔧')}
        </div>
      )}

      <div className="np-bubble-wrap">
        {/* Name + time */}
        <div className={`np-bubble-meta ${ownClass}`}>
          <span className={`np-bubble-sender ${roleClass}`}>
            {isCustomer ? 'Customer' : `Provider${isAuto ? ' (Auto-suggested)' : ''}`}
          </span>
          &nbsp;·&nbsp;{timeAgo(offer.createdAt)}
        </div>

        {/* Bubble */}
        <div className={`np-bubble ${ownClass} ${roleClass}`}>
          <div className="np-bubble-amount">{fmt(offer.amount)}</div>

          <div className="np-bubble-tags">
            <span className={`np-discount-tag ${discount > 0 ? 'green' : 'gray'}`}>
              {discount > 0 ? `−${discount}% off listed` : 'Listed price'}
            </span>
            {isAuto && <span className="np-ai-tag">🤖 AI Suggested</span>}
          </div>

          {offer.message && (
            <p className="np-bubble-message">"{offer.message}"</p>
          )}
        </div>
      </div>

      {/* Right avatar */}
      {isOwn && (
        <div className={`np-bubble-avatar right ${roleClass}`}>
          {isCustomer ? '👤' : '🔧'}
        </div>
      )}
    </div>
  );
};

/* ── Round Progress Dots ── */
const RoundDots = ({ current, max }) => (
  <div className="np-round-dots">
    {Array.from({ length: max }).map((_, i) => {
      const filled  = i < current;
      const isLast2 = i >= max - 2;
      let cls = 'np-round-dot';
      if (filled)  cls += isLast2 ? ' filled-warning' : ' filled-normal';
      else         cls += ' empty';
      return <div key={i} className={cls} />;
    })}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function NegotiationPanel({ negotiationId, userRole, onDealClosed }) {
  const dispatch = useDispatch();
  const { current: neg, suggestion, loading, error } = useSelector((s) => s.bargain);

  const [counterAmt, setCounterAmt] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [acting,     setActing]     = useState('');
  const [formError,  setFormError]  = useState('');
  const [dealBanner, setDealBanner] = useState(null);
  const [pollStopped, setPollStopped] = useState(false);

  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const myRole = userRole || 'customer';

  /* ── Derived values ── */
  const lastOffer  = neg?.offers?.[neg.offers.length - 1];
  const isMyTurn   = neg?.status === 'open' && lastOffer?.role !== myRole;
  const roundsLeft = neg ? Math.max(0, neg.maxRounds - neg.currentRound) : 0;
  const isClosed   = neg?.status !== 'open';
  const origPrice  = neg?.originalPrice || 0;
  const currOffer  = neg?.currentOffer  || 0;
  const saving     = origPrice - currOffer;

  /* ── Fetch & poll every 6s ── */
  const refresh = useCallback(async () => {
    if (!negotiationId || pollStopped) return;
    try {
      const result = await dispatch(fetchNegotiation(negotiationId));
      if (result?.error || fetchNegotiation.rejected.match(result)) {
        const msg = result?.payload || '';
        if (typeof msg === 'string' && (msg.includes('403') || msg.includes('Access') || msg.includes('Forbidden'))) {
          setPollStopped(true);
        }
      }
    } catch (_) { /* ignore */ }
  }, [negotiationId, dispatch, pollStopped]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 6000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [neg?.offers?.length]);

  useEffect(() => {
    if (suggestion != null && !counterAmt) setCounterAmt(String(suggestion));
  }, [suggestion]); // eslint-disable-line

  useEffect(() => {
    if (!neg || dealBanner) return;
    if (neg.status === 'accepted') {
      setDealBanner({ type: 'accepted', price: neg.finalPrice });
      onDealClosed?.('accepted');
    } else if (neg.status === 'rejected') {
      setDealBanner({ type: 'rejected' });
      onDealClosed?.('rejected');
    } else if (neg.status === 'expired') {
      setDealBanner({ type: 'expired' });
      onDealClosed?.('expired');
    }
  }, [neg?.status]); // eslint-disable-line

  /* ── Actions ── */
  const handleAccept = async () => {
    setActing('accept'); setFormError('');
    try { await dispatch(acceptOffer(negotiationId)).unwrap(); }
    catch (e) { setFormError(typeof e === 'string' ? e : e?.message || 'Accept failed'); }
    finally   { setActing(''); }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this offer? The negotiation will end.')) return;
    setActing('reject'); setFormError('');
    try { await dispatch(rejectOffer(negotiationId)).unwrap(); }
    catch (e) { setFormError(typeof e === 'string' ? e : e?.message || 'Reject failed'); }
    finally   { setActing(''); }
  };

  const handleCounter = async () => {
    const amt = Number(counterAmt);
    if (!amt || amt <= 0)    return setFormError('Enter a valid counter amount.');
    if (!neg)                return;
    const minAllowed = origPrice * 0.6;
    if (amt < minAllowed)
      return setFormError(`Minimum counter is ${fmt(Math.ceil(minAllowed))} (max 40% off).`);
    if (amt >= origPrice)
      return setFormError('Counter must be below the original listed price.');

    setFormError(''); setActing('counter');
    try {
      await dispatch(submitOffer({ negotiationId, amount: amt, message: counterMsg.trim() })).unwrap();
      setCounterAmt(''); setCounterMsg('');
    } catch (e) {
      setFormError(typeof e === 'string' ? e : e?.message || 'Counter failed');
    } finally { setActing(''); }
  };

  const handleSuggest = async () => {
    setActing('suggest');
    try {
      const result = await dispatch(fetchSuggestion(negotiationId)).unwrap();
      if (result) setCounterAmt(String(result));
    } catch { /* ignore */ }
    finally   { setActing(''); }
  };

  /* ── Status meta ── */
  const statusMeta = {
    open:     { color: 'var(--orange)', bg: 'var(--orange-light)', borderColor: 'var(--orange-border)', icon: '💬', label: 'Negotiating' },
    accepted: { color: 'var(--green)',  bg: 'var(--green-bg)',     borderColor: 'var(--green-border)',  icon: '🤝', label: 'Deal Agreed!' },
    rejected: { color: 'var(--red)',    bg: 'var(--red-bg)',       borderColor: 'var(--red-border)',    icon: '❌', label: 'Offer Rejected' },
    expired:  { color: 'var(--gray)',   bg: 'var(--gray-bg)',      borderColor: 'var(--gray-border)',   icon: '⏰', label: 'Negotiation Expired' },
  };
  const sm = statusMeta[neg?.status] || statusMeta.open;

  /* ── Progress bar class ── */
  const progressClass = roundsLeft <= 1 ? 'low' : roundsLeft <= 2 ? 'medium' : 'high';
  const counterSubmitDisabled = !!acting || !counterAmt || Number(counterAmt) <= 0;

  /* ── Early returns ── */
  if (loading && !neg) return (
    <div className="np-loading">
      <div className="spinner" />
      Loading negotiation…
    </div>
  );

  if (error && !neg) return (
    <div className="np-error">⚠️ {error}</div>
  );

  if (!neg) return null;

  /* ── Render ── */
  return (
    <div className="np-card">

      {/* ── Header ── */}
      <div className="np-header">
        <div className="np-header-inner">
          <div>
            <div className="np-header-title">💰 Price Negotiation</div>
            <RoundDots current={neg.currentRound} max={neg.maxRounds} />
            <div className="np-header-round">
              Round {neg.currentRound} of {neg.maxRounds}
              {!isClosed && roundsLeft > 0 && ` · ${roundsLeft} round${roundsLeft !== 1 ? 's' : ''} left`}
              {isClosed && ` · ${sm.label}`}
            </div>
          </div>
          <div className="np-header-price-side">
            <div className="np-header-price-label">
              {isClosed && neg.status === 'accepted' ? 'Final Price' : 'Current Offer'}
            </div>
            <div className="np-header-price-value">
              {fmt(isClosed && neg.finalPrice ? neg.finalPrice : currOffer)}
            </div>
            {saving > 0 && (
              <div className="np-header-savings">
                {fmt(saving)} off ({pct(currOffer, origPrice)}% discount)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Round progress bar ── */}
      <div className="np-progress-bar-track">
        <div
          className={`np-progress-bar-fill ${progressClass}`}
          style={{ width: `${Math.min(100, (neg.currentRound / neg.maxRounds) * 100)}%` }}
        />
      </div>

      {/* ── Price scale ── */}
      <div className="np-price-scale">
        <div className="np-price-scale-item">
          <div className="np-price-scale-label">Original</div>
          <div className="np-price-scale-value gray">{fmt(origPrice)}</div>
        </div>
        <div className="np-price-scale-item center">
          <div className="np-price-scale-label">Current Bid</div>
          <div className="np-price-scale-value orange-lg">{fmt(currOffer)}</div>
        </div>
        <div className="np-price-scale-item right">
          <div className="np-price-scale-label">Min Allowed</div>
          <div className="np-price-scale-value red">{fmt(Math.ceil(origPrice * 0.6))}</div>
        </div>
      </div>

      {/* ── Deal closed banner ── */}
      {isClosed && (
        <div
          className="np-deal-banner"
          style={{ background: sm.bg, borderColor: sm.borderColor }}
        >
          <div className="np-deal-banner-icon">{sm.icon}</div>
          <div>
            <div className="np-deal-banner-title" style={{ color: sm.color }}>{sm.label}</div>
            {neg.status === 'accepted' && (
              <div className="np-deal-banner-desc" style={{ color: 'var(--green)' }}>
                Final agreed price: <strong>{fmt(neg.finalPrice)}</strong> — invoice will reflect this amount.
              </div>
            )}
            {neg.status === 'rejected' && (
              <div className="np-deal-banner-desc" style={{ color: 'var(--gray)' }}>
                Negotiation ended. The original listed price applies.
              </div>
            )}
            {neg.status === 'expired' && (
              <div className="np-deal-banner-desc" style={{ color: 'var(--gray)' }}>
                The negotiation window closed without an agreement.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Turn indicator ── */}
      {!isClosed && (
        <div className={`np-turn-indicator ${isMyTurn ? 'my-turn' : 'waiting'}`}>
          <span className="np-turn-dot" />
          {isMyTurn
            ? `✋ It's your turn — accept, reject, or send a counter-offer.`
            : `⏳ Waiting for ${myRole === 'customer' ? 'the provider' : 'the customer'} to respond…`}
          {!isMyTurn && <span className="np-turn-refresh-hint">auto-refreshes every 6s</span>}
        </div>
      )}

      {/* ── Rounds warning ── */}
      {!isClosed && isMyTurn && roundsLeft <= 2 && roundsLeft > 0 && (
        <div className="np-rounds-warning">
          ⚠️ Only {roundsLeft} round{roundsLeft !== 1 ? 's' : ''} remaining — consider accepting or making your final offer.
        </div>
      )}

      {/* ── Offer history ── */}
      <div className="np-offer-history">
        {neg.offers.length === 0 && (
          <div className="np-offer-history-empty">
            No offers yet. Be the first to propose a price!
          </div>
        )}
        {neg.offers.map((offer, i) => (
          <OfferBubble
            key={i}
            offer={offer}
            originalPrice={origPrice}
            isOwn={offer.role === myRole}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Action area (open + my turn) ── */}
      {!isClosed && isMyTurn && (
        <div className="np-action-area">

          {formError && <div className="np-action-error">⚠️ {formError}</div>}

          {/* Quick decision */}
          <div className="np-quick-decision">
            <div className="np-action-section-label">Quick Decision</div>
            <div className="np-quick-row">
              <button
                onClick={handleAccept}
                disabled={!!acting}
                className={`np-accept-btn ${acting === 'accept' ? 'waiting' : ''}`}
              >
                {acting === 'accept' ? '⏳ Accepting…' : `✅ Accept ${fmt(currOffer)}`}
              </button>
              <button
                onClick={handleReject}
                disabled={!!acting}
                className={`np-reject-btn ${acting === 'reject' ? 'waiting' : ''}`}
              >
                {acting === 'reject' ? '⏳…' : '❌ Reject & End'}
              </button>
            </div>
          </div>

          {/* Counter offer */}
          <div className="np-counter-section">
            <div className="np-action-section-label">Or Send a Counter Offer</div>

            {/* Auto-suggest */}
            <button
              onClick={handleSuggest}
              disabled={!!acting}
              className={`np-suggest-btn ${suggestion != null ? 'has-suggestion' : 'no-suggestion'} ${acting === 'suggest' ? 'waiting' : ''}`}
            >
              {acting === 'suggest' ? '⏳ Calculating…' : (
                suggestion != null
                  ? `🎯 Use AI-suggested fair price: ${fmt(suggestion)}`
                  : '🎯 Get AI-Suggested Fair Price'
              )}
            </button>

            {/* Amount input */}
            <div className="np-counter-input-wrap">
              <span className="np-counter-currency">₹</span>
              <input
                type="number"
                className="np-counter-input"
                value={counterAmt}
                onChange={(e) => { setCounterAmt(e.target.value); setFormError(''); }}
                placeholder={`${Math.ceil(origPrice * 0.6).toLocaleString()}–${(origPrice - 1).toLocaleString()}`}
                min={Math.ceil(origPrice * 0.6)}
                max={origPrice - 1}
                onKeyDown={(e) => e.key === 'Enter' && !acting && counterAmt && handleCounter()}
              />
            </div>

            {/* Optional message */}
            <textarea
              className="np-counter-textarea"
              value={counterMsg}
              onChange={(e) => setCounterMsg(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Add a note to your offer (optional)…"
            />

            {/* Submit */}
            <button
              onClick={handleCounter}
              disabled={counterSubmitDisabled}
              className={`np-counter-submit-btn ${counterSubmitDisabled ? 'disabled' : 'active'}`}
            >
              {acting === 'counter'
                ? '⏳ Sending…'
                : `💬 Send Counter${counterAmt ? ` — ${fmt(counterAmt)}` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Waiting state ── */}
      {!isClosed && !isMyTurn && (
        <div className="np-waiting-state">
          <div className="np-waiting-inner">
            <div className="np-waiting-spinner" />
            <div>
              <div className="np-waiting-title">⏳ Your offer has been sent!</div>
              <div className="np-waiting-desc">
                {myRole === 'customer'
                  ? 'The provider has received your offer and will accept, reject, or counter it. This page updates automatically.'
                  : 'The customer has received your counter-offer and will respond shortly. This page updates automatically.'}
              </div>
              <div className="np-waiting-badge">
                <span className="np-waiting-pulse" />
                Checking for response every 6 seconds
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}