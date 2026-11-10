import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Target, ListChecks, Calculator, BookOpen, Lightbulb, Bell, Download, LogOut, ChevronRight, Smartphone, Sun, Moon, History, Share, SquarePlus } from 'lucide-react';
import { useAuth } from '../lib/store.jsx';
import { PageHeader, Card, Segmented, Sheet } from '../components/ui.jsx';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function More() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('forja-theme') || 'auto'; } catch { return 'auto'; }
  });
  const [install, setInstall] = useState(false);

  useEffect(() => {
    try {
      if (theme === 'auto') { localStorage.removeItem('forja-theme'); delete document.documentElement.dataset.theme; }
      else { localStorage.setItem('forja-theme', theme); document.documentElement.dataset.theme = theme; }
    } catch { /* */ }
  }, [theme]);

  const items = [
    [
      { to: '/mas/perfil', icon: User, label: 'Perfil y objetivos nutricionales' },
      { to: '/mas/objetivos', icon: Target, label: 'Mis objetivos' },
      { to: '/mas/habitos', icon: ListChecks, label: 'Hábitos diarios' },
      { to: '/entreno/historial', icon: History, label: 'Historial de entrenos' },
    ],
    [
      { to: '/mas/calculadoras', icon: Calculator, label: 'Calculadoras' },
      { to: '/mas/guia', icon: BookOpen, label: 'Guía de ejercicios' },
      { to: '/mas/consejos', icon: Lightbulb, label: 'Consejos para principiantes' },
    ],
    [
      { to: '/mas/recordatorios', icon: Bell, label: 'Recordatorios y notificaciones' },
      ...(!isStandalone() ? [{ onClick: () => setInstall(true), icon: Smartphone, label: 'Instalar en el iPhone' }] : []),
      { href: '/api/account/export', icon: Download, label: 'Exportar mis datos' },
    ],
  ];

  return (
    <div className="page">
      <PageHeader title="Más" />
      <Card className="profile-card">
        <div className="avatar lg" aria-hidden>{user.name[0]?.toUpperCase()}</div>
        <div className="grow">
          <strong>{user.name}</strong>
          <span className="muted small">{user.email}</span>
        </div>
      </Card>

      {items.map((group, i) => (
        <div key={i} className="list-card menu">
          {group.map((it) => {
            const body = (<><span className="menu-icon"><it.icon size={18} /></span><span className="grow">{it.label}</span><ChevronRight size={16} className="muted" /></>);
            if (it.to) return <Link key={it.label} to={it.to} className="list-row">{body}</Link>;
            if (it.href) return <a key={it.label} href={it.href} download className="list-row">{body}</a>;
            return <button key={it.label} type="button" className="list-row" onClick={it.onClick}>{body}</button>;
          })}
        </div>
      ))}

      <Card>
        <span className="field-label"><Sun size={14} /> Apariencia</span>
        <Segmented value={theme} onChange={setTheme} options={[{ value: 'dark', label: 'Oscuro' }, { value: 'light', label: 'Claro' }, { value: 'auto', label: 'Sistema' }]} />
      </Card>

      <button type="button" className="list-card list-row logout" onClick={logout}><LogOut size={18} /> Cerrar sesión</button>
      <p className="muted small center">Forja · tus datos solo son visibles para ti</p>

      <Sheet open={install} onClose={() => setInstall(false)} title="Instalar en el iPhone">
        <ol className="install-steps">
          <li>Abre esta web en <b>Safari</b>.</li>
          <li>Pulsa el botón <b>Compartir</b> <Share size={16} /> en la barra inferior.</li>
          <li>Elige <b>Añadir a pantalla de inicio</b> <SquarePlus size={16} />.</li>
          <li>Pulsa <b>Añadir</b>. Forja se abrirá a pantalla completa como una app.</li>
        </ol>
        <p className="muted small">Con la app instalada podrás activar las notificaciones de recordatorio (iOS 16.4 o superior).</p>
        <span className="sr-only"><Moon /></span>
      </Sheet>
    </div>
  );
}
