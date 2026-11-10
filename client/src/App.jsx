import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { House, Dumbbell, Utensils, ChartLine, Ellipsis, Timer, Play } from 'lucide-react';
import { useAuth, TimerProvider, WorkoutProvider, useTimer, useWorkout } from './lib/store.jsx';
import { duration } from './lib/format.js';
import { Loading } from './components/ui.jsx';
import Auth from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';

const Train = lazy(() => import('./pages/Train.jsx'));
const RoutineEdit = lazy(() => import('./pages/RoutineEdit.jsx'));
const Session = lazy(() => import('./pages/Session.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail.jsx'));
const Nutrition = lazy(() => import('./pages/Nutrition.jsx'));
const Progress = lazy(() => import('./pages/Progress.jsx'));
const More = lazy(() => import('./pages/More.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Calculators = lazy(() => import('./pages/Calculators.jsx'));
const Guide = lazy(() => import('./pages/Guide.jsx'));
const Tips = lazy(() => import('./pages/Tips.jsx'));
const Reminders = lazy(() => import('./pages/Reminders.jsx'));
const Habits = lazy(() => import('./pages/Habits.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const TABS = [
  { to: '/', label: 'Hoy', icon: House, end: true },
  { to: '/entreno', label: 'Entreno', icon: Dumbbell },
  { to: '/nutricion', label: 'Nutrición', icon: Utensils },
  { to: '/progreso', label: 'Progreso', icon: ChartLine },
  { to: '/mas', label: 'Más', icon: Ellipsis },
];

function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map(({ to, label, icon: I, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <I size={23} strokeWidth={2} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Píldora flotante: entrenamiento en curso o descanso activo fuera de la pantalla de sesión. */
function LivePill() {
  const { draft } = useWorkout();
  const { timer, remaining } = useTimer();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [, tick] = useState(0);
  const show = !!draft && pathname !== '/entreno/sesion';
  useEffect(() => {
    if (!show) return undefined;
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [show]);
  if (!show) return null;
  const elapsed = (Date.now() - draft.startedAtMs) / 1000;
  return (
    <button type="button" className="live-pill" onClick={() => nav('/entreno/sesion')}>
      <span className="live-dot" />
      <span className="live-name">{draft.routine_name}</span>
      {timer ? (
        <span className="live-time"><Timer size={15} /> {duration(remaining)}</span>
      ) : (
        <span className="live-time"><Play size={14} /> {duration(elapsed)}</span>
      )}
    </button>
  );
}

function Shell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const hideNav = pathname === '/entreno/sesion';
  return (
    <WorkoutProvider userId={user.id}>
      <TimerProvider>
        <ScrollTop />
        <main className={`app-main ${hideNav ? 'no-nav' : ''}`}>
          <Suspense fallback={<div className="page"><Loading /></div>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entreno" element={<Train />} />
              <Route path="/entreno/rutina/:id" element={<RoutineEdit />} />
              <Route path="/entreno/sesion" element={<Session />} />
              <Route path="/entreno/historial" element={<History />} />
              <Route path="/entreno/historial/:id" element={<WorkoutDetail />} />
              <Route path="/nutricion" element={<Nutrition />} />
              <Route path="/progreso" element={<Progress />} />
              <Route path="/mas" element={<More />} />
              <Route path="/mas/perfil" element={<Profile />} />
              <Route path="/mas/calculadoras" element={<Calculators />} />
              <Route path="/mas/guia" element={<Guide />} />
              <Route path="/mas/consejos" element={<Tips />} />
              <Route path="/mas/recordatorios" element={<Reminders />} />
              <Route path="/mas/habitos" element={<Habits />} />
              <Route path="/mas/objetivos" element={<Goals />} />
              <Route path="/bienvenida" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {!hideNav && <LivePill />}
        {!hideNav && <TabBar />}
      </TimerProvider>
    </WorkoutProvider>
  );
}

export default function App() {
  const { loading, user, profile } = useAuth();
  if (loading) {
    return (
      <div className="splash">
        <div className="brand-mark" />
      </div>
    );
  }
  if (!user) {
    return (
      <Routes>
        <Route path="/registro" element={<Auth mode="register" />} />
        <Route path="*" element={<Auth mode="login" />} />
      </Routes>
    );
  }
  if (!profile?.onboarded) return <Onboarding />;
  return <Shell />;
}
