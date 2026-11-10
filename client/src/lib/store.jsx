import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

// ── Auth ────────────────────────────────────────────────
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, profile: null });

  const refresh = useCallback(async () => {
    try {
      const d = await api.get('/auth/me');
      setState({ loading: false, user: d.user, profile: d.profile || null });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const onUnauth = () => setState({ loading: false, user: null, profile: null });
    window.addEventListener('forja:unauthorized', onUnauth);
    return () => window.removeEventListener('forja:unauthorized', onUnauth);
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    refresh,
    setProfile: (profile) => setState((s) => ({ ...s, profile })),
    setUser: (user) => setState((s) => ({ ...s, user })),
    logout: async () => {
      await api.post('/auth/logout').catch(() => {});
      setState({ loading: false, user: null, profile: null });
    },
  }), [state, refresh]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ── Toasts ──────────────────────────────────────────────
const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ── Sonido y vibración ──────────────────────────────────
let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* sin audio */ }
}
export function beep(times = 3) {
  try {
    if (!audioCtx) return;
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = i === times - 1 ? 1320 : 880;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.start(t); o.stop(t + 0.24);
    }
  } catch { /* sin audio */ }
  navigator.vibrate?.([200, 100, 200]);
}

// ── Temporizador de descanso ────────────────────────────
const TimerCtx = createContext(null);

export function TimerProvider({ children }) {
  const [timer, setTimer] = useState(() => {
    try {
      const t = JSON.parse(localStorage.getItem('forja-timer') || 'null');
      return t && t.endAt > Date.now() ? t : null;
    } catch { return null; }
  });
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);

  useEffect(() => {
    try { localStorage.setItem('forja-timer', JSON.stringify(timer)); } catch { /* */ }
    if (!timer) return undefined;
    fired.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : 0;

  useEffect(() => {
    if (timer && remaining === 0 && !fired.current) {
      fired.current = true;
      beep();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then((r) => r.showNotification('Descanso terminado', { body: `Siguiente serie: ${timer.label || ''}`, tag: 'rest', icon: '/icons/icon-192.png' })).catch(() => {});
      }
      const t = setTimeout(() => setTimer(null), 2500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [remaining, timer]);

  const value = useMemo(() => ({
    timer,
    remaining,
    start: (seconds, label) => {
      unlockAudio();
      if (!seconds) return;
      setNow(Date.now());
      setTimer({ endAt: Date.now() + seconds * 1000, total: seconds, label });
    },
    add: (s) => setTimer((t) => (t ? { ...t, endAt: Math.max(Date.now() + 1000, t.endAt + s * 1000), total: Math.max(1, t.total + s) } : t)),
    stop: () => setTimer(null),
  }), [timer, remaining]);

  return <TimerCtx.Provider value={value}>{children}</TimerCtx.Provider>;
}
export const useTimer = () => useContext(TimerCtx);

// ── Entrenamiento en curso (borrador persistido en el dispositivo) ──
const WorkoutCtx = createContext(null);

export function WorkoutProvider({ userId, children }) {
  const key = `forja-workout-${userId}`;
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  });
  useEffect(() => {
    try {
      if (draft) localStorage.setItem(key, JSON.stringify(draft));
      else localStorage.removeItem(key);
    } catch { /* */ }
  }, [draft, key]);

  const value = useMemo(() => ({
    draft,
    setDraft,
    update: (fn) => setDraft((d) => (d ? fn(structuredClone(d)) : d)),
    discard: () => setDraft(null),
  }), [draft]);
  return <WorkoutCtx.Provider value={value}>{children}</WorkoutCtx.Provider>;
}
export const useWorkout = () => useContext(WorkoutCtx);

// ── Hook de datos simple ────────────────────────────────
export function useData(url, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api.get(url);
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}
