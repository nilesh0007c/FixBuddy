// frontend/src/components/chat/ChatWindow.jsx
import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import * as chatSvc from '../../services/chatService';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import './ChatWindow.css';

const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000';

const MAX_FILE_B = 50 * 1024 * 1024;
const ACCEPT_ALL = [
  'image/*','video/*','audio/*',
  '.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx',
  '.txt','.csv','.zip','.rar','.7z',
].join(',');

function fmtSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ── Lightbox ── */
const Lightbox = memo(({ src, name, onClose }) => {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="cw-lightbox-overlay" onClick={onClose}>
      <div className="cw-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span className="cw-lightbox-name">{name}</span>
        <div className="cw-lightbox-actions">
          <a href={src} download={name} className="cw-lightbox-dl"
            onClick={(e) => e.stopPropagation()}>↓ Download</a>
          <button className="cw-lightbox-close" onClick={onClose}>✕</button>
        </div>
      </div>
      <img src={src} alt={name} className="cw-lightbox-img"
        onClick={(e) => e.stopPropagation()} />
      <div className="cw-lightbox-hint">Click outside or press Esc to close</div>
    </div>
  );
});

/* ── Avatar ── */
const Avatar = memo(({ name = '?', size = 40 }) => {
  const letter = (name[0] || '?').toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  /* size, hue-derived background and fontSize are runtime-computed — kept inline */
  return (
    <div className="cw-header-avatar"
      style={{ width: size, height: size, background: `hsl(${hue},50%,38%)`, fontSize: size * 0.38 }}>
      {letter}
    </div>
  );
});

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default memo(function ChatWindow({
  roomId,
  recipientName = 'Chat',
  recipientAvatar,
  recipientOnline = false,
  onClose,
}) {
  const currentUser = useSelector((s) => s.auth?.user);
  const token       = useSelector((s) => s.auth?.token) || localStorage.getItem('token') || '';
  const myId   = currentUser?.id || currentUser?._id || '';
  const myName = currentUser?.name || 'You';

  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState('');
  const [replyTo,       setReplyTo]       = useState(null);
  const [pendingFile,   setPendingFile]   = useState(null);
  const [pendingAttach, setPendingAttach] = useState(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadProg,    setUploadProg]    = useState(0);
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState('');
  const [connected,     setConnected]     = useState(false);
  const [recording,     setRecording]     = useState(false);
  const [recordSecs,    setRecordSecs]    = useState(0);
  const [listening,     setListening]     = useState(false);
  const [lightbox,      setLightbox]      = useState(null);
  const [typingUsers,   setTypingUsers]   = useState([]);

  const socketRef   = useRef(null);
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const inputRef    = useRef(null);
  const recRef      = useRef(null);
  const recTimer    = useRef(null);
  const audioChunks = useRef([]);
  const sttRef      = useRef(null);
  const typingTimer = useRef(null);

  const openLightbox  = useCallback((src, name) => setLightbox({ src, name }), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  /* Load messages */
  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    chatSvc.getMessages(roomId)
      .then((d) => {
        setMessages(d.data || d.messages || []);
        chatSvc.markRead(roomId).catch(() => {});
      })
      .catch(() => setError('Failed to load messages.'));
  }, [roomId]);

  /* Socket */
  useEffect(() => {
    if (!roomId || !token) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500,
      });
    }
    const s = socketRef.current;
    const join = () => {
      setConnected(true);
      s.emit('join_room', roomId);
      s.emit('chat:join_rooms');
    };
    const onMsg = (msg) => {
      const cid = msg.chatId?._id || msg.chatId;
      if (cid && cid.toString() !== roomId.toString()) return;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    };
    const onDel = (p) => {
      const id = p?.messageId || p;
      setMessages((prev) => prev.filter((m) => m._id !== id));
    };
    const onTyping = (d) => {
      if (d.roomId !== roomId) return;
      setTypingUsers((prev) =>
        d.isTyping
          ? prev.includes(d.name) ? prev : [...prev, d.name]
          : prev.filter((n) => n !== d.name)
      );
    };
    s.on('connect',              join);
    s.on('disconnect',           () => setConnected(false));
    s.on('chat:new_message',     onMsg);
    s.on('new_message',          onMsg);
    s.on('chat:message_deleted', onDel);
    s.on('message_deleted',      onDel);
    s.on('reconnect',            join);
    s.on('chat:typing',          onTyping);
    if (s.connected) join();
    return () => {
      s.off('connect', join);
      s.off('disconnect');
      s.off('chat:new_message', onMsg);
      s.off('new_message', onMsg);
      s.off('chat:message_deleted', onDel);
      s.off('message_deleted', onDel);
      s.off('reconnect', join);
      s.off('chat:typing', onTyping);
      s.emit('leave_room', roomId);
    };
  }, [roomId, token]);

  /* Typing indicator emit */
  const emitTyping = useCallback((isTyping) => {
    socketRef.current?.emit('chat:typing', { roomId, name: myName, isTyping });
  }, [roomId, myName]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 2000);
    // Auto-resize textarea
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [emitTyping]);

  /* File upload */
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > MAX_FILE_B) { setError('Max file size is 50 MB.'); return; }
    setError('');
    setPendingFile(file);
    setUploading(true);
    setUploadProg(0);
    try {
      const tick = setInterval(() => setUploadProg((p) => Math.min(p + 12, 90)), 200);
      const res = await chatSvc.uploadFile(file);
      clearInterval(tick);
      setUploadProg(100);
      setPendingAttach(res.data || res);
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed.');
      setPendingFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const removePending = useCallback(() => {
    setPendingFile(null);
    setPendingAttach(null);
    setUploadProg(0);
    setError('');
  }, []);

  /* Send */
  const handleSend = useCallback(async () => {
    if (sending || uploading) return;
    if (!text.trim() && !pendingAttach) return;
    emitTyping(false);
    clearTimeout(typingTimer.current);
    setSending(true);
    setError('');
    const optimistic = {
      _id: `opt_${Date.now()}`,
      sender: { _id: myId, id: myId, name: myName },
      content: text.trim(),
      attachment: pendingAttach || undefined,
      replyTo: replyTo || undefined,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    const sv = text.trim();
    const sa = pendingAttach;
    const sr = replyTo;
    setText('');
    setPendingFile(null);
    setPendingAttach(null);
    setReplyTo(null);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }
    try {
      const res = await chatSvc.sendMessage({
        chatId: roomId,
        content: sv,
        attachment: sa,
        replyTo: sr?._id,
      });
      const saved = res?.data || res;
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? saved : m)));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setText(sv);
      setPendingAttach(sa);
      setReplyTo(sr);
      setError(err?.response?.data?.message || 'Failed to send. Try again.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [sending, uploading, text, pendingAttach, replyTo, roomId, myId, myName, emitTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleDelete = useCallback(async (id) => {
    try {
      await chatSvc.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch {
      setError('Could not delete message.');
    }
  }, []);

  /* Voice recording */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];
      rec.ondataavailable = (e) => audioChunks.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        setPendingFile(file);
        setUploading(true);
        try {
          const r = await chatSvc.uploadFile(file);
          setPendingAttach(r.data || r);
        } catch {
          setError('Voice upload failed.');
          setPendingFile(null);
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecordSecs(0);
      recTimer.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      setError('Microphone access denied.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    clearInterval(recTimer.current);
    setRecording(false);
    setRecordSecs(0);
  }, []);

  /* STT */
  const toggleSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported in this browser.'); return; }
    if (listening) { sttRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(''));
    r.onend   = () => setListening(false);
    r.onerror = () => { setListening(false); setError('Speech recognition error.'); };
    r.start();
    sttRef.current = r;
    setListening(true);
  }, [listening]);

  const canSend = !sending && !uploading && (!!text.trim() || !!pendingAttach);

  const recFmt = `${String(Math.floor(recordSecs / 60)).padStart(2, '0')}:${String(recordSecs % 60).padStart(2, '0')}`;

  /* Group messages by date */
  const renderMessages = () => {
    let lastDate = null;
    return messages.map((msg) => {
      const sid    = msg.sender?._id || msg.sender?.id || msg.sender;
      const isMine = sid?.toString() === myId?.toString();
      const date   = new Date(msg.createdAt || msg.sentAt).toLocaleDateString([], {
        weekday: 'long', month: 'short', day: 'numeric',
      });
      const showSep = date !== lastDate;
      lastDate = date;
      return (
        <React.Fragment key={msg._id}>
          {showSep && (
            <div className="cw-date-sep"><span>{date}</span></div>
          )}
          <MessageBubble
            message={msg}
            isOwn={isMine}
            onReply={setReplyTo}
            onDelete={handleDelete}
            onImageClick={openLightbox}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <>
      {lightbox && (
        <Lightbox src={lightbox.src} name={lightbox.name} onClose={closeLightbox} />
      )}

      <div className="cw-root">

        {/* HEADER */}
        <div className="cw-header">
          {recipientAvatar
            ? <div className="cw-header-avatar"><img src={recipientAvatar} alt="" /></div>
            : <Avatar name={recipientName} />
          }
          <div className="cw-header-info">
            <div className="cw-header-name">{recipientName}</div>
            <div className="cw-header-status">
              <div className={`cw-status-dot ${(connected && recipientOnline) ? 'online' : ''}`} />
              <span className="cw-status-text">
                {!connected ? 'Connecting…' : recipientOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {onClose && (
            <button className="cw-close-btn" onClick={onClose} title="Close">✕</button>
          )}
        </div>

        {/* MESSAGES */}
        <div className="cw-messages">
          {messages.length === 0 ? (
            <div className="cw-empty">
              <div className="cw-empty-icon">💬</div>
              <div className="cw-empty-title">Start the conversation</div>
              <div className="cw-empty-sub">Send a message, photo, video, or file.</div>
            </div>
          ) : (
            renderMessages()
          )}
          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
          <div ref={bottomRef} />
        </div>

        {/* ERROR */}
        {error && (
          <div className="cw-error-bar">
            <span>⚠️ {error}</span>
            <button className="cw-error-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* REPLY BANNER */}
        {replyTo && (
          <div className="cw-reply-banner">
            <div className="cw-reply-bar">
              ↩ Replying to: {replyTo.content?.substring(0, 80) || '[attachment]'}
            </div>
            <button className="cw-reply-close" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}

        {/* PENDING FILE */}
        {pendingFile && (
          <div className="cw-pending-bar">
            <div className="cw-upload-pill">
              {/* width is state-driven — kept inline */}
              <div className="cw-upload-pill-progress" style={{ width: `${uploadProg}%` }} />
              <span className="cw-upload-pill-icon">
                {pendingFile.type.startsWith('image') ? '🖼️'
                  : pendingFile.type.startsWith('video') ? '🎬'
                  : pendingFile.type.startsWith('audio') ? '🎵' : '📄'}
              </span>
              <div className="cw-upload-pill-info">
                <div className="cw-upload-pill-name">{pendingFile.name}</div>
                <div className="cw-upload-pill-sub">
                  {uploading ? `Uploading ${uploadProg}%…` : fmtSize(pendingFile.size)}
                </div>
              </div>
              {!uploading && (
                <button className="cw-upload-pill-rm" onClick={removePending}>✕</button>
              )}
            </div>
          </div>
        )}

        {/* RECORDING */}
        {recording && (
          <div className="cw-rec-bar">
            <div className="cw-rec-dot" />
            <span className="cw-rec-label">Recording {recFmt}</span>
            <button className="cw-rec-stop" onClick={stopRecording}>⏹ Stop & Send</button>
          </div>
        )}

        {/* INPUT BAR */}
        <div className="cw-input-bar">
          {/* display:none moved to .cw-file-input in ChatWindow.css */}
          <input ref={fileRef} type="file" accept={ACCEPT_ALL}
            onChange={handleFileChange} className="cw-file-input" />

          {/* Attach */}
          <button className="cw-action-btn" title="Attach file"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || recording}>
            📎
          </button>

          {/* Voice */}
          <button
            className={`cw-action-btn ${recording ? 'recording' : ''}`}
            title={recording ? 'Stop recording' : 'Record voice'}
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading}>
            {recording ? '⏹' : '🎙️'}
          </button>

          {/* Textarea */}
          <div className="cw-textarea-wrap">
            <textarea
              ref={inputRef}
              className={`cw-textarea ${listening ? 'listening' : ''}`}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={listening ? '🎤 Listening…' : 'Type a message… (Enter to send)'}
              rows={1}
            />
            <button
              className={`cw-stt-btn ${listening ? 'active' : ''}`}
              title={listening ? 'Stop listening' : 'Voice to text'}
              onClick={toggleSTT}>
              🎤
            </button>
          </div>

          {/* Send */}
          <button
            className={`cw-send-btn ${canSend ? 'ready' : ''}`}
            onClick={handleSend}
            disabled={!canSend}
            title="Send message (Enter)">
            {sending ? <span className="cw-sending-icon">⏳</span> : '➤'}
          </button>
        </div>

      </div>
    </>
  );
});