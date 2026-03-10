// frontend/src/hooks/useSocket.js  — COMPLETE REWRITE (Singleton)
import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

// ── Module-level singleton: ONE connection shared across all components ─────
let _socket = null;
const _listeners = {};   // { eventName: Set<handler> }

function getSocket(token) {
  if (_socket && _socket.connected) return _socket;

  _socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    auth:       { token },
    transports: ['websocket'],
    reconnection:       true,
    reconnectionAttempts: 10,
    reconnectionDelay:  1000,
    timeout:            20000,
  });

  _socket.on('connect',            () => console.log('[Socket] Connected:', _socket.id));
  _socket.on('disconnect', (reason)=> console.warn('[Socket] Disconnected:', reason));
  _socket.on('connect_error',(err) => console.error('[Socket] Error:', err.message));

  return _socket;
}

// ── The hook ──────────────────────────────────────────────────────────────────
const useSocket = () => {
  const token    = useSelector(s => s.auth.token);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    socketRef.current = getSocket(token);

    // Join all user chat rooms on connect/reconnect
    socketRef.current.emit('chat:join_rooms');
    socketRef.current.on('reconnect', () => {
      socketRef.current.emit('chat:join_rooms');
    });

    return () => {
      // Do NOT disconnect on unmount — we keep the singleton alive.
      // Only disconnect when user logs out (call disconnectSocket() from logout action).
    };
  }, [token]);

  // emit: send event to server
  const emit = useCallback((event, data, ack) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, ack);
    } else {
      console.warn('[Socket] Not connected, cannot emit:', event);
    }
  }, []);

  // on: subscribe to server event. Returns cleanup function.
  const on = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  // off: remove a specific handler
  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return { emit, on, off, socket: socketRef.current };
};

// Call this from Redux logout action
export const disconnectSocket = () => {
  if (_socket) { _socket.disconnect(); _socket = null; }
};

export default useSocket;
