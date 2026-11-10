import { useEffect, useState } from 'react';
import { Bell, CalendarPlus, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { DAY_NAMES, today, addDays, isoDow } from '../lib/format.js';
import { PageHeader, Card, Button } from '../components/ui.jsx';

const KINDS = [
  { k: 'creatine', l: 'Creatina', d: 'Solo si aún no la has marcado hoy', def: '10:00' },
  { k: 'workout', l: 'Día de gimnasio', d: 'Solo los días de entreno si aún no has entrenado', def: '17:00' },
  { k: 'water', l: 'Hidratación', d: 'Si llevas menos de la mitad del objetivo', def: '13:00' },
  { k: 'protein', l: 'Proteína', d: 'Si vas por debajo del 80% de tu objetivo', def: '20:30' },
];

const b64ToUint8 = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function Reminders() {
  const { profile, setProfile } = useAuth();
  const toast = useToast();
  const [rem, setRem] = useState(() => ({ ...Object.fromEntries(KINDS.map((x) => [x.k, { enabled: false, time: x.def }])), ...profile.reminders }));
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setSubscribed(!!s)).catch(() => {});
  }, [supported]);

  const enablePush = async () => {
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== 'granted') return toast('Permiso denegado. Actívalo en Ajustes del iPhone > Notificaciones > Forja.', 'error');
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      const { publicKey } = await api.get('/push/key');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) });
      await api.post('/push/subscribe', sub.toJSON());
      setSubscribed(true);
      toast('Notificaciones activadas en este dispositivo');
    } catch (e) { toast(e.message || 'No se pudo activar', 'error'); }
  };

  const save = async (next) => {
    setRem(next);
    try { setProfile(await api.put('/profile', { reminders: next, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })); } catch (e) { toast(e.message, 'error'); }
  };

  const test = async () => {
    try { const r = await api.post('/push/test'); toast(r.sent ? 'Notificación enviada' : 'No hay dispositivos suscritos', r.sent ? 'ok' : 'error'); } catch (e) { toast(e.message, 'error'); }
  };

  /** Archivo .ics con los entrenos semanales y la creatina diaria: recordatorios nativos del calendario. */
  const downloadIcs = () => {
    const pad = (n) => String(n).padStart(2, '0');
    const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const at = (dateKey, hhmm) => `${dateKey.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
    const ev = [];
    const t = today();
    const wt = rem.workout?.time || '17:00';
    for (const d of profile.training_days) {
      let first = t;
      while (isoDow(first) !== d) first = addDays(first, 1);
      const [h, m] = wt.split(':').map(Number);
      ev.push(['BEGIN:VEVENT', `UID:forja-workout-${d}@forja`, `DTSTAMP:${stamp}`, `DTSTART:${at(first, wt)}`, `DTEND:${at(first, `${pad((h + 1) % 24)}:${pad(m)}`)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[d - 1]}`, `SUMMARY:🏋️ Gimnasio (${DAY_NAMES[d - 1]})`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Gimnasio en 30 min', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
    }
    const ct = rem.creatine?.time || '10:00';
    ev.push(['BEGIN:VEVENT', 'UID:forja-creatine@forja', `DTSTAMP:${stamp}`, `DTSTART:${at(t, ct)}`, `DTEND:${at(t, ct)}`, 'RRULE:FREQ=DAILY',
      'SUMMARY:💊 Creatina', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Toma tu creatina', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forja//ES', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'forja-recordatorios.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="page">
      <PageHeader back="/mas" title="Recordatorios" />
      <Card>
        <h3 className="card-title"><Bell size={17} /> Notificaciones push</h3>
        {!supported ? (
          <p className="muted small">{isIOS && !standalone ? 'En iPhone, primero instala la app: Safari → Compartir → “Añadir a pantalla de inicio”. Después abre Forja desde el icono y vuelve aquí.' : 'Este navegador no admite notificaciones push. Usa el calendario de abajo.'}</p>
        ) : subscribed && perm === 'granted' ? (
          <>
            <p className="muted small">Activadas en este dispositivo.</p>
            <Button variant="secondary" block onClick={test}><Send size={16} /> Enviar notificación de prueba</Button>
          </>
        ) : (
          <>
            <p className="muted small">Recibe avisos aunque la app esté cerrada.</p>
            <Button block onClick={enablePush}>Activar notificaciones</Button>
          </>
        )}
      </Card>

      <div className="list-card">
        {KINDS.map((x) => (
          <div key={x.k} className="list-row reminder-row">
            <div className="grow">
              <strong>{x.l}</strong>
              <span className="muted small">{x.d}</span>
            </div>
            <input type="time" value={rem[x.k]?.time || x.def} onChange={(e) => save({ ...rem, [x.k]: { ...rem[x.k], time: e.target.value } })} aria-label={`Hora ${x.l}`} />
            <label className="switch">
              <input type="checkbox" checked={!!rem[x.k]?.enabled} onChange={(e) => save({ ...rem, [x.k]: { ...rem[x.k], time: rem[x.k]?.time || x.def, enabled: e.target.checked } })} />
              <span />
            </label>
          </div>
        ))}
      </div>

      <Card>
        <h3 className="card-title"><CalendarPlus size={17} /> Añadir al calendario del iPhone</h3>
        <p className="muted small">Crea eventos recurrentes con aviso para tus días de gimnasio ({profile.training_days.map((d) => DAY_NAMES[d - 1]).join(', ')}) y la creatina diaria. Funciona siempre, incluso sin notificaciones push.</p>
        <Button variant="secondary" block onClick={downloadIcs}>Descargar recordatorios (.ics)</Button>
      </Card>
    </div>
  );
}
