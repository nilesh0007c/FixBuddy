// frontend/src/components/chatbot/ChatbotWidget.jsx
import React, {
  useState, useRef, useEffect, useCallback, memo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  sendChatbotMessage,
  toggleChatbot,
  clearSession,
  addUserMessage,
} from '../../redux/slices/chatbotSlice';
import chatbotService from '../../services/chatbotService';
import './ChatbotWidget.css';

/* ── Quick-reply suggestions ── */
const QUICK_REPLIES = [
  { icon: '📅', label: 'How to book?' },
  { icon: '💰', label: 'Negotiate price' },
  { icon: '❌', label: 'Cancel booking' },
  { icon: '🔍', label: 'Track my order' },
  { icon: '💳', label: 'Payment options' },
  { icon: '⭐', label: 'Leave a review' },
];

/* ── Typing dots ── */
const TypingDots = memo(() => (
  <div className="cb-typing-dots">
    <div className="cb-typing-dot" />
    <div className="cb-typing-dot" />
    <div className="cb-typing-dot" />
  </div>
));

/* ── Message bubble ── */
const Bubble = memo(({ msg }) => {
  const isUser = msg.role === 'user';

  const renderContent = (text) =>
    text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g).map((p, j) =>
        j % 2 === 1 ? <strong key={j}>{p}</strong> : p
      );
      return (
        <span key={i}>
          {parts}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });

  return (
    <div className={`cb-msg cb-msg-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="cb-msg-avatar">🤖</div>
      )}
      <div className={`cb-bubble ${isUser ? 'user' : 'assistant'}`}>
        {renderContent(msg.content)}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════
   MAIN WIDGET
══════════════════════════════════════ */
export default function ChatbotWidget() {
  const dispatch = useDispatch();
  const { messages, loading, isOpen, sessionId } = useSelector(s => s.chatbot);

  const [input,     setInput]     = useState('');
  const [escalated, setEscalated] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [showRate,  setShowRate]  = useState(false);
  const [rated,     setRated]     = useState(false);
  const [ratingVal, setRatingVal] = useState(0);
  const [rateHover, setRateHover] = useState(0);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Unread badge */
  useEffect(() => {
    if (!isOpen) {
      const botMsgs = messages.filter(m => m.role === 'assistant').length;
      setUnread(botMsgs > 1 ? botMsgs - 1 : 0);
    } else {
      setUnread(0);
    }
  }, [messages, isOpen]);

  /* Show rating prompt after 3 user exchanges */
  useEffect(() => {
    const exchanges = messages.filter(m => m.role === 'user').length;
    if (exchanges >= 3 && !rated && !showRate && isOpen) {
      const t = setTimeout(() => setShowRate(true), 8000);
      return () => clearTimeout(t);
    }
  }, [messages, rated, showRate, isOpen]);

  /* ── Toggle panel ── */
  const handleToggle = () => {
    dispatch(toggleChatbot());
    setUnread(0);
    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 280);
  };

  /* ── Send message ── */
  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    dispatch(addUserMessage(msg));

    try {
      const action = await dispatch(sendChatbotMessage({
        message:   msg,
        sessionId: sessionId || undefined,
      }));
      if (sendChatbotMessage.fulfilled.match(action)) {
        if (action.payload?.escalated) setEscalated(true);
      }
    } catch (e) {
      console.error('[Chatbot] send error:', e);
    }
  }, [input, loading, dispatch, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ── Escalate ── */
  const handleEscalate = async () => {
    if (!sessionId) return;
    try {
      await chatbotService.escalate(sessionId);
      setEscalated(true);
    } catch (e) { console.error(e); }
  };

  /* ── Rate ── */
  const handleRate = async (stars) => {
    if (!sessionId || rated) return;
    try {
      await chatbotService.rateSession(sessionId, stars);
      setRated(true);
      setShowRate(false);
      setRatingVal(stars);
    } catch (e) { console.error(e); }
  };

  const handleClear = () => {
    dispatch(clearSession());
    setEscalated(false);
    setRated(false);
    setShowRate(false);
    setRatingVal(0);
  };

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="cb-root">

      {/* ── FAB ── */}
      <div className="cb-fab-wrapper">
        {!isOpen && unread > 0 && <div className="cb-ripple-ring" />}

        <button
          className={`cb-fab-btn ${isOpen ? 'open' : 'closed'}`}
          onClick={handleToggle}
          aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
        >
          <span className={`cb-fab-icon ${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? '✕' : '💬'}
          </span>
          {!isOpen && unread > 0 && (
            <span className="cb-unread-badge">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      <div className={`cb-panel ${isOpen ? 'open' : 'closed'}`}>

        {/* Ambient orbs */}
        <div className="cb-orbs">
          <div className="cb-orb cb-orb-1" />
          <div className="cb-orb cb-orb-2" />
        </div>

        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-row">
            <div className="cb-bot-avatar-wrap">
              <div className="cb-bot-avatar">🤖</div>
              <div className="cb-orbit-dot" />
            </div>

            <div className="cb-header-info">
              <div className="cb-header-title">SLS Assistant</div>
              <div className={`cb-header-status ${escalated ? 'escalated' : 'online'}`}>
                <span className={`cb-status-dot ${escalated ? 'escalated' : 'online'}`} />
                {escalated ? 'Escalated to human agent' : 'AI · Usually instant'}
              </div>
            </div>

            <div className="cb-header-actions">
              {!escalated && (
                <button className="cb-action-btn" onClick={handleEscalate} title="Talk to a human">
                  👤 Human
                </button>
              )}
              <button className="cb-action-btn" onClick={handleClear} title="New conversation">
                🔄
              </button>
            </div>
          </div>
          <div className="cb-shimmer-bar" />
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {visibleMessages.length === 0 && (
            <div className="cb-welcome">
              <div className="cb-welcome-emoji">✨</div>
              <div className="cb-welcome-title">Hi! I'm your SLS Assistant</div>
              <div className="cb-welcome-sub">
                I can help you book services, track orders, negotiate prices, and much more.
              </div>
            </div>
          )}

          {visibleMessages.map((msg, i) => (
            <Bubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="cb-msg">
              <TypingDots />
            </div>
          )}

          <div ref={bottomRef} className="cb-scroll-anchor" />
        </div>

        {/* Quick reply chips */}
        {visibleMessages.length <= 1 && !loading && (
          <div className="cb-chips-bar">
            {QUICK_REPLIES.map((q, i) => (
              <button
                key={i}
                className="cb-chip"
                onClick={() => send(q.label)}
                style={{ animation: `cb-fade-in 0.3s ease ${i * 0.05}s both` }}
              >
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        )}

        {/* Escalation banner */}
        {escalated && (
          <div className="cb-escalation-banner">
            <span className="cb-escalation-icon">⚡</span>
            <span className="cb-escalation-label">Connected to human support</span>
            <span className="cb-escalation-note">— expect a reply within 2 hours</span>
          </div>
        )}

        {/* Rating prompt */}
        {showRate && !rated && (
          <div className="cb-rating-prompt">
            <div className="cb-rating-label">Was this conversation helpful?</div>
            <div className="cb-rating-stars">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  className={`cb-star-btn ${s <= (rateHover || 0) ? 'active' : 'inactive'}`}
                  onClick={() => handleRate(s)}
                  onMouseEnter={() => setRateHover(s)}
                  onMouseLeave={() => setRateHover(0)}
                >⭐</button>
              ))}
              <button className="cb-skip-btn" onClick={() => setShowRate(false)}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Rating confirmation */}
        {rated && ratingVal > 0 && (
          <div className="cb-rating-confirm">
            ✓ Thanks for rating {ratingVal} star{ratingVal > 1 ? 's' : ''}!
          </div>
        )}

        {/* Input area */}
        {!escalated && (
          <div className="cb-input-area">
            <textarea
              ref={inputRef}
              className={`cb-textarea ${input ? 'has-input' : ''}`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything…"
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
              }}
            />
            <button
              className={`cb-send-btn ${(!input.trim() || loading) ? 'disabled' : 'ready'}`}
              onClick={() => send()}
              disabled={!input.trim() || loading}
            >
              {loading
                ? <span className="cb-send-loading">·</span>
                : '↑'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}