// frontend/src/components/chatbot/ChatbotWidget.jsx
//
// Enhanced AI chatbot widget:
//   • Image upload + camera capture with preview
//   • Claude vision-powered problem analysis
//   • YouTube tutorial embeds inside chat
//   • Provider suggestion cards (book directly)
//   • Rich markdown-lite rendering
//   • Quick-reply chips, escalation, star rating
//   • Keyboard shortcuts (Enter to send, Esc to close)

import React, {
  useState, useRef, useEffect, useCallback, memo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  sendChatbotMessage,
  analyzeImage,
  toggleChatbot,
  clearSession,
  addUserMessage,
} from '../../redux/slices/chatbotSlice';
import chatbotService from '../../services/chatbotService';
import './ChatbotWidget.css';

/* ── Quick-reply chips ── */
const QUICK_REPLIES = [
  { icon: '📅', label: 'How to book?' },
  { icon: '🤝', label: 'How negotiation works?' },
  { icon: '❌', label: 'How to cancel?' },
  { icon: '💳', label: 'How payment works?' },
  { icon: '🛠️', label: 'How to become provider?' },
  { icon: '📸', label: 'Upload problem image' },
];

/* ═══════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════ */

/* Typing animation */
const TypingDots = memo(() => (
  <div className="cb-typing-wrap">
    <div className="cb-msg-avatar">🤖</div>
    <div className="cb-typing-dots">
      <div className="cb-typing-dot" />
      <div className="cb-typing-dot" />
      <div className="cb-typing-dot" />
    </div>
  </div>
));

/* ── YouTube video card ── */
const VideoCard = memo(({ video }) => {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="cb-video-card">
      {playing ? (
        <iframe
          className="cb-video-iframe"
          src={`${video.embedUrl}&autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="cb-video-thumb" onClick={() => setPlaying(true)}>
          {video.thumbnail
            ? <img src={video.thumbnail} alt={video.title} />
            : <div className="cb-video-placeholder">🎬</div>}
          <div className="cb-video-play">▶</div>
        </div>
      )}
      <div className="cb-video-meta">
        <div className="cb-video-title">{video.title}</div>
        <div className="cb-video-channel">📺 {video.channelTitle}</div>
      </div>
    </div>
  );
});

/* ── Provider card ── */
const ProviderCard = memo(({ provider }) => {
  const stars = '★'.repeat(Math.round(provider.rating || 0)) +
                '☆'.repeat(5 - Math.round(provider.rating || 0));

  return (
    <div className="cb-provider-card">
      <div className="cb-provider-avatar">
        {provider.avatar
          ? <img src={provider.avatar} alt={provider.name} />
          : <span>{provider.name?.[0] || '👤'}</span>}
      </div>
      <div className="cb-provider-info">
        <div className="cb-provider-name">{provider.name}</div>
        <div className="cb-provider-cat">{provider.category?.replace(/_/g, ' ')}</div>
        <div className="cb-provider-stars">
          <span className="cb-stars">{stars}</span>
          {provider.reviewCount > 0 && (
            <span className="cb-review-count">({provider.reviewCount})</span>
          )}
        </div>
        {provider.city && <div className="cb-provider-city">📍 {provider.city}</div>}
      </div>
      <div className="cb-provider-actions">
        {provider.isAvailable
          ? <span className="cb-badge-avail">Available</span>
          : <span className="cb-badge-busy">Busy</span>}
        <a
          href={`/providers/${provider.id}`}
          className="cb-book-btn"
          target="_blank"
          rel="noreferrer"
        >
          Book
        </a>
      </div>
    </div>
  );
});

/* ── DIY Step ── */
const DiyStep = memo(({ step }) => (
  <div className="cb-diy-step">
    <div className="cb-diy-num">{step.step}</div>
    <div className="cb-diy-content">
      <strong>{step.title}</strong>
      <p>{step.detail}</p>
    </div>
  </div>
));

/* ── Analysis result panel ── */
const AnalysisPanel = memo(({ analysis, videos, providers }) => {
  const [tab, setTab] = useState('solution');   // 'solution' | 'videos' | 'providers'

  if (!analysis?.detected) return null;

  const severityColor = { low: '#34d399', medium: '#f59e0b', high: '#f87171' };
  const sColor = severityColor[analysis.severity] || '#7c6af7';

  return (
    <div className="cb-analysis-panel">
      {/* Severity badge */}
      <div className="cb-severity-bar" style={{ borderColor: sColor }}>
        <span style={{ color: sColor }}>●</span>
        <span className="cb-severity-label">{analysis.severity?.toUpperCase()} severity</span>
        {analysis.needsProfessional && (
          <span className="cb-pro-needed">⚠️ Pro recommended</span>
        )}
      </div>

      {/* Tabs */}
      <div className="cb-analysis-tabs">
        {[
          { key: 'solution',  label: '🔧 Solution' },
          { key: 'videos',    label: `🎬 Videos (${videos?.length || 0})` },
          { key: 'providers', label: `👷 Providers (${providers?.length || 0})` },
        ].map(t => (
          <button
            key={t.key}
            className={`cb-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Solution tab */}
      {tab === 'solution' && (
        <div className="cb-tab-content">
          {analysis.causes?.length > 0 && (
            <div className="cb-causes">
              <div className="cb-section-title">🔍 Possible Causes</div>
              <ul>
                {analysis.causes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {analysis.diySteps?.length > 0 && (
            <div className="cb-diy-steps">
              <div className="cb-section-title">🛠️ DIY Steps</div>
              {analysis.diySteps.map((s, i) => <DiyStep key={i} step={s} />)}
            </div>
          )}

          {analysis.safetyTips?.length > 0 && (
            <div className="cb-safety-tips">
              <div className="cb-section-title">⚠️ Safety Tips</div>
              <ul>
                {analysis.safetyTips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Videos tab */}
      {tab === 'videos' && (
        <div className="cb-tab-content">
          {videos?.length > 0
            ? videos.map((v, i) => <VideoCard key={i} video={v} />)
            : <div className="cb-empty-tab">No tutorial videos found.</div>}
        </div>
      )}

      {/* Providers tab */}
      {tab === 'providers' && (
        <div className="cb-tab-content">
          {providers?.length > 0
            ? providers.map((p, i) => <ProviderCard key={i} provider={p} />)
            : <div className="cb-empty-tab">No nearby providers found.</div>}
        </div>
      )}
    </div>
  );
});

/* ── Render markdown-lite text (bold, line breaks) ── */
function renderText(text) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.+?)\*\*/g).map((p, j) =>
      j % 2 === 1 ? <strong key={j}>{p}</strong> : p
    );
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

/* ── Single message bubble ── */
const Bubble = memo(({ msg }) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`cb-msg cb-msg-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="cb-msg-avatar">🤖</div>}
      <div className={`cb-bubble ${isUser ? 'user' : 'assistant'}`}>
        {renderText(msg.content)}

        {/* Rich image analysis result */}
        {msg.type === 'image_analysis' && (
          <AnalysisPanel
            analysis={msg.analysis}
            videos={msg.videos}
            providers={msg.providers}
          />
        )}
      </div>
    </div>
  );
});

/* ── Image preview strip (before sending) ── */
const ImagePreview = memo(({ file, previewUrl, note, onNoteChange, onSend, onCancel, loading }) => (
  <div className="cb-img-preview-strip">
    <div className="cb-preview-header">
      <span>📸 Image ready to analyse</span>
      <button className="cb-cancel-img" onClick={onCancel}>✕</button>
    </div>
    <div className="cb-preview-body">
      <img src={previewUrl} alt="preview" className="cb-preview-thumb" />
      <textarea
        className="cb-preview-note"
        placeholder="Describe the problem (optional)…"
        value={note}
        onChange={e => onNoteChange(e.target.value)}
        rows={2}
      />
    </div>
    <button
      className={`cb-analyse-btn ${loading ? 'loading' : ''}`}
      onClick={onSend}
      disabled={loading}
    >
      {loading ? '🔍 Analysing…' : '🔍 Analyse Image'}
    </button>
  </div>
));

/* ═══════════════════════════════════════
   MAIN WIDGET
═══════════════════════════════════════ */
export default function ChatbotWidget() {
  const dispatch   = useDispatch();
  const { messages, loading, isOpen, sessionId, analyzing } = useSelector(s => s.chatbot);

  /* Text input */
  const [input,     setInput]     = useState('');

  /* Image state */
  const [imgFile,      setImgFile]      = useState(null);
  const [imgPreview,   setImgPreview]   = useState(null);
  const [imgNote,      setImgNote]      = useState('');

  /* UI state */
  const [escalated, setEscalated] = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [showRate,  setShowRate]  = useState(false);
  const [rated,     setRated]     = useState(false);
  const [ratingVal, setRatingVal] = useState(0);
  const [rateHover, setRateHover] = useState(0);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const fileRef    = useRef(null);
  const cameraRef  = useRef(null);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, analyzing]);

  /* ── Unread badge ── */
  useEffect(() => {
    if (!isOpen) {
      const botMsgs = messages.filter(m => m.role === 'assistant').length;
      setUnread(botMsgs > 1 ? botMsgs - 1 : 0);
    } else {
      setUnread(0);
    }
  }, [messages, isOpen]);

  /* ── Rating prompt after 3 exchanges ── */
  useEffect(() => {
    const exchanges = messages.filter(m => m.role === 'user').length;
    if (exchanges >= 3 && !rated && !showRate && isOpen) {
      const t = setTimeout(() => setShowRate(true), 8000);
      return () => clearTimeout(t);
    }
  }, [messages, rated, showRate, isOpen]);

  /* ── Keyboard: Esc to close panel ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen) dispatch(toggleChatbot()); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, dispatch]);

  /* ── Toggle ── */
  const handleToggle = () => {
    dispatch(toggleChatbot());
    setUnread(0);
    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 280);
  };

  /* ── Send text message ── */
  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    dispatch(addUserMessage(msg));

    try {
      const action = await dispatch(sendChatbotMessage({ message: msg, sessionId: sessionId || undefined }));
      if (sendChatbotMessage.fulfilled.match(action) && action.payload?.escalated) setEscalated(true);
    } catch (e) {
      console.error('[Chatbot] send error:', e);
    }
  }, [input, loading, dispatch, sessionId]);

  /* ── Handle Enter key ── */
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  /* ── Pick image file ── */
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    e.target.value = '';  // reset so same file can be re-selected
  };

  /* ── Camera capture ── */
  const handleCamera = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video    = document.createElement('video');
      const canvas   = document.createElement('canvas');
      video.srcObject = stream;
      await video.play();
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());

      canvas.toBlob(blob => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setImgFile(file);
        setImgPreview(URL.createObjectURL(blob));
      }, 'image/jpeg', 0.92);
    } catch {
      // Camera not available — fall back to file picker
      fileRef.current?.click();
    }
  };

  /* ── Cancel image selection ── */
  const cancelImage = () => {
    setImgFile(null);
    setImgPreview(null);
    setImgNote('');
  };

  /* ── Send image for analysis ── */
  const sendImage = async () => {
    if (!imgFile || analyzing) return;

    dispatch(addUserMessage(`📸 Image uploaded${imgNote ? ': ' + imgNote : ''}`));
    const file = imgFile;
    const note = imgNote;
    cancelImage();

    try {
      const action = await dispatch(analyzeImage({
        file, note,
        sessionId: sessionId || undefined,
        city: '',   // TODO: pass user's city from auth state if available
      }));
      if (analyzeImage.fulfilled.match(action) && action.payload?.escalated) setEscalated(true);
    } catch (e) {
      console.error('[Chatbot] image analyse error:', e);
    }
  };

  /* ── Escalate ── */
  const handleEscalate = async () => {
    if (!sessionId) return;
    try { await chatbotService.escalate(sessionId); setEscalated(true); }
    catch (e) { console.error(e); }
  };

  /* ── Rate ── */
  const handleRate = async (stars) => {
    if (!sessionId || rated) return;
    try {
      await chatbotService.rateSession(sessionId, stars);
      setRated(true); setShowRate(false); setRatingVal(stars);
    } catch (e) { console.error(e); }
  };

  /* ── Clear / new chat ── */
  const handleClear = () => {
    dispatch(clearSession());
    setEscalated(false);
    setRated(false); setShowRate(false); setRatingVal(0);
    cancelImage();
  };

  const visibleMessages = messages.filter(m => m.role !== 'system');
  const busy = loading || analyzing;

  return (
    <div className="cb-root">

      {/* ── FAB ── */}
      <div className="cb-fab-wrapper">
        {!isOpen && unread > 0 && <div className="cb-ripple-ring" />}

        <button
          className={`cb-fab-btn ${isOpen ? 'open' : 'closed'}`}
          onClick={handleToggle}
          aria-label={isOpen ? 'Close chat' : 'Open AI chat assistant'}
        >
          <span className={`cb-fab-icon ${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? '✕' : '💬'}
          </span>
          {!isOpen && unread > 0 && (
            <span className="cb-unread-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      <div className={`cb-panel ${isOpen ? 'open' : 'closed'}`} role="dialog" aria-label="Chat assistant">

        {/* Ambient orbs */}
        <div className="cb-orbs" aria-hidden>
          <div className="cb-orb cb-orb-1" />
          <div className="cb-orb cb-orb-2" />
        </div>

        {/* ── Header ── */}
        <div className="cb-header">
          <div className="cb-header-row">
            <div className="cb-bot-avatar-wrap">
              <div className="cb-bot-avatar">🤖</div>
              <div className="cb-orbit-dot" />
            </div>

            <div className="cb-header-info">
              <div className="cb-header-title">FixBuddy Assistant</div>
              <div className={`cb-header-status ${escalated ? 'escalated' : 'online'}`}>
                <span className={`cb-status-dot ${escalated ? 'escalated' : 'online'}`} />
                {escalated ? 'Escalated to human agent' : 'AI · Instant · Vision enabled'}
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

        {/* ── Messages ── */}
        <div className="cb-messages">

          {visibleMessages.length === 0 && (
            <div className="cb-welcome">
              <div className="cb-welcome-emoji">✨</div>
              <div className="cb-welcome-title">Hi! I'm your FixBuddy Assistant</div>
              <div className="cb-welcome-sub">
                Book services, track orders, negotiate prices — or 📸 <strong>upload an image</strong> of your problem and I'll diagnose it!
              </div>
            </div>
          )}

          {visibleMessages.map((msg, i) => <Bubble key={i} msg={msg} />)}

          {(loading || analyzing) && (
            <div className="cb-msg">
              <TypingDots />
              {analyzing && (
                <div className="cb-analyse-status">
                  🔍 Analysing image with AI…
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} className="cb-scroll-anchor" />
        </div>

        {/* ── Quick reply chips (only at start) ── */}
        {visibleMessages.length <= 1 && !busy && !imgFile && (
          <div className="cb-chips-bar">
            {QUICK_REPLIES.map((q, i) => (
              <button
                key={i}
                className="cb-chip"
                onClick={() =>
                  q.label === 'Upload problem image'
                    ? fileRef.current?.click()
                    : send(q.label)
                }
                style={{ animation: `cb-fade-in 0.3s ease ${i * 0.05}s both` }}
              >
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Image preview strip ── */}
        {imgFile && (
          <ImagePreview
            file={imgFile}
            previewUrl={imgPreview}
            note={imgNote}
            onNoteChange={setImgNote}
            onSend={sendImage}
            onCancel={cancelImage}
            loading={analyzing}
          />
        )}

        {/* ── Escalation banner ── */}
        {escalated && (
          <div className="cb-escalation-banner">
            <span className="cb-escalation-icon">⚡</span>
            <span className="cb-escalation-label">Connected to human support</span>
            <span className="cb-escalation-note">— reply within 2 hours</span>
          </div>
        )}

        {/* ── Rating prompt ── */}
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
              <button className="cb-skip-btn" onClick={() => setShowRate(false)}>Skip</button>
            </div>
          </div>
        )}

        {rated && ratingVal > 0 && (
          <div className="cb-rating-confirm">
            ✓ Thanks for rating {ratingVal} star{ratingVal > 1 ? 's' : ''}!
          </div>
        )}

        {/* ── Input area ── */}
        {!escalated && !imgFile && (
          <div className="cb-input-area">

            {/* Hidden file inputs */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFilePick}
            />

            {/* Upload / camera buttons */}
            <div className="cb-input-tools">
              <button
                className="cb-tool-btn"
                onClick={() => fileRef.current?.click()}
                title="Upload image"
                disabled={busy}
              >📎</button>
              <button
                className="cb-tool-btn"
                onClick={handleCamera}
                title="Take photo"
                disabled={busy}
              >📷</button>
            </div>

            <textarea
              ref={inputRef}
              className={`cb-textarea ${input ? 'has-input' : ''}`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything or upload an image…"
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px';
              }}
              disabled={busy}
            />

            <button
              className={`cb-send-btn ${(!input.trim() || busy) ? 'disabled' : 'ready'}`}
              onClick={() => send()}
              disabled={!input.trim() || busy}
              aria-label="Send message"
            >
              {busy ? <span className="cb-send-loading">·</span> : '↑'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}