import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api } from './api';

let socket = null;
const listeners = new Map(); // event -> Set(handler)

function attach(event) {
  if (socket && !socket.hasListeners(event)) {
    socket.on(event, (payload) => listeners.get(event)?.forEach((h) => h(payload)));
  }
}

/** Open (or re-open) the authenticated Socket.IO connection to the API server. */
export function connectRealtime(token) {
  disconnectRealtime();
  if (!token) return;
  socket = io(api.serverUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1500,
  });
  socket.on('connect', () => notify('realtime:status', { connected: true }));
  socket.on('disconnect', () => notify('realtime:status', { connected: false }));
  socket.on('connect_error', (e) => notify('realtime:status', { connected: false, error: e.message }));
  listeners.forEach((_set, event) => attach(event));
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

function notify(event, payload) {
  listeners.get(event)?.forEach((h) => h(payload));
}

export function subscribe(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  attach(event);
  return () => listeners.get(event)?.delete(handler);
}

/** Subscribe a component to one or more live server events. */
export function useRealtime(events, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = Array.isArray(events) ? events.join('|') : events;
  useEffect(() => {
    const list = key.split('|');
    const unsubs = list.map((e) => subscribe(e, (p) => ref.current(p, e)));
    return () => unsubs.forEach((u) => u());
  }, [key]);
}

/** Send a chat message to an order/rental room; resolves with the server acknowledgement. */
export function sendChat(roomId, text) {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve({ success: false });
    socket.timeout(8000).emit('chat:message', { roomId, text }, (err, res) => resolve(err ? { success: false } : res));
  });
}

export function isRealtimeConnected() {
  return !!socket?.connected;
}
