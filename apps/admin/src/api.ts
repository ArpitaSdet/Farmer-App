import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const TOKEN_KEY = 'krishi_admin_token';

export const rupees = (paise?: number | null) => `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;

export const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Authenticated JSON call to the API; throws with the server's message. Logs out on 401. */
export async function apiCall<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('krishi_admin_user');
    window.location.reload();
  }
  if (!res.ok || data.success === false) throw new Error(data?.error?.message || data.message || 'Request failed');
  return data.data;
}

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (!socket) socket = io({ auth: { token }, transports: ['websocket'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Subscribe to live server events for the lifetime of a component. */
export function useLive(events: string[], handler: (payload: any, event: string) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = events.join('|');
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const list = key.split('|');
    const fns = list.map((e) => {
      const fn = (p: any) => ref.current(p, e);
      s.on(e, fn);
      return [e, fn] as const;
    });
    return () => fns.forEach(([e, fn]) => s.off(e, fn));
  }, [key]);
}

/** Load data from the API and reload whenever any of the given live events fire. */
export function useLiveData<T>(path: string, events: string[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    apiCall<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  useLive(events, () => load());
  return { data, error, reload: load };
}

/** `sessionKey` changes on login so the hook re-attaches to the new socket. */
export function useSocketStatus(sessionKey?: string) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const on = () => setConnected(true);
    const off = () => setConnected(false);
    setConnected(s.connected);
    s.on('connect', on);
    s.on('disconnect', off);
    return () => {
      s.off('connect', on);
      s.off('disconnect', off);
    };
  }, [sessionKey]);
  return connected;
}
