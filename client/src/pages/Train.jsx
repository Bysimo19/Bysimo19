import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Plus, History, ChevronRight, BookOpen, Sparkles, Copy, Trash2, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast, useWorkout } from '../lib/store.jsx';
import { startWorkout } from '../lib/workout.js';
import { DAY_NAMES, fmtDate, durationWords, n0, isoDow, today } from '../lib/format.js';
import { imgSrc } from '../lib/library.js';
import { PageHeader, Card, Button, Sheet, Field, Empty, Loading, ErrorState, useConfirm, IconButton } from '../components/ui.jsx';

const COLORS = ['#7C8CFF', '#3DDC97', '#FFB547', '#FF6B8B', '#4CC9F0', '#C77DFF'];

export default function Train() {
  const { data, error, loading, reload } = useData('/routines');
  const recent = useData('/workouts?limit=3');
  const { draft, setDraft } = useWorkout();
  const nav = useNavigate();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [confirmEl, ask] = useConfirm();

  const begin = async (rt) => {
    if (draft) {
      const ok = await ask({ title: 'Ya tienes un entreno en curso', message: `¿Descartar "${draft.routine_name}" y empezar uno nuevo?`, confirm: 'Descartar y empezar', danger: true });
      if (!ok) return;
    }
    setBusyId(rt?.id ?? 'free');
    try {
      await startWorkout(rt, setDraft);
      nav('/entreno/sesion');
    } catch (e) { toast(e.message, 'error'); } finally { setBusyId(null); }
  };

  const createDefault = async () => {
    try { await api.post('/routines/default'); reload(); toast('Rutina para principiantes creada'); } catch (e) { toast(e.message, 'error'); }
  };

  const duplicate = async (rt) => {
    setMenu(null);
    try { await api.post(`/routines/${rt.id}/duplicate`); reload(); toast('Rutina duplicada'); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async (rt) => {
    setMenu(null);
    if (!(await ask({ title: `¿Eliminar ${rt.name}?`, message: 'Tu historial de entrenamientos se conserva.', confirm: 'Eliminar', danger: true }))) return;
    try { await api.del(`/routines/${rt.id}`); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  if (loading && !data) return <div className="page"><PageHeader title="Entreno" /><Loading /></div>;
  if (error && !data) return <div className="page"><PageHeader title="Entreno" /><ErrorState error={error} retry={reload} /></div>;
  const todayDow = isoDow(today());

  return (
    <div className="page">
      <PageHeader title="Entreno" right={<IconButton label="Historial" onClick={() => nav('/entreno/historial')}><History size={21} /></IconButton>} />

      {draft && (
        <Card className="resume-card" onClick={() => nav('/entreno/sesion')}>
          <span className="live-dot" />
          <div className="grow"><strong>{draft.routine_name}</strong><span className="muted small">Entreno en curso · toca para continuar</span></div>
          <ChevronRight size={18} />
        </Card>
      )}

      <div className="section-head">
        <h2>Mis rutinas</h2>
        <button type="button" className="link-sm" onClick={() => setNewOpen(true)}><Plus size={15} /> Nueva</button>
      </div>

      {data.length === 0 ? (
        <Empty icon="dumbbell" title="Aún no tienes rutinas" text="Te recomiendo empezar con la rutina full body de 3 días para principiantes."
          action={<div className="stack-sm"><Button onClick={createDefault}><Sparkles size={16} /> Crear rutina recomendada</Button><Button variant="secondary" onClick={() => setNewOpen(true)}>Crear desde cero</Button></div>} />
      ) : (
        <div className="stack">
          {data.map((rt) => (
            <Card key={rt.id} className={`routine-card ${rt.day_of_week === todayDow ? 'is-today' : ''}`} style={{ '--rc': rt.color || 'var(--accent)' }}>
              <div className="routine-top" onClick={() => nav(`/entreno/rutina/${rt.id}`)} role="button" tabIndex={0}>
                <div className="grow">
                  <span className="routine-day">{rt.day_of_week ? DAY_NAMES[rt.day_of_week - 1] : 'Sin día fijo'}{rt.day_of_week === todayDow ? ' · Hoy' : ''}</span>
                  <h3>{rt.name}</h3>
                  {rt.subtitle && <p className="muted small">{rt.subtitle}</p>}
                </div>
                <IconButton label="Opciones" onClick={(e) => { e.stopPropagation(); setMenu(rt); }}><Pencil size={17} /></IconButton>
              </div>
              <div className="routine-thumbs" onClick={() => nav(`/entreno/rutina/${rt.id}`)}>
                {rt.exercises.slice(0, 6).map((e) => (
                  <span key={e.id} className="thumb" title={e.name}>
                    {e.image ? <img src={imgSrc(e.image)} alt="" loading="lazy" /> : <span>{e.name[0]}</span>}
                  </span>
                ))}
                {rt.exercises.length > 6 && <span className="thumb more">+{rt.exercises.length - 6}</span>}
              </div>
              <p className="routine-list small muted">{rt.exercises.map((e) => e.name).join(' · ') || 'Sin ejercicios todavía'}</p>
              <Button block onClick={() => begin(rt)} loading={busyId === rt.id} disabled={!rt.exercises.length}>
                <Play size={16} fill="currentColor" /> Empezar {rt.name}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Button variant="secondary" block onClick={() => begin(null)} loading={busyId === 'free'} className="mt">
        <Plus size={16} /> Entreno libre (sin rutina)
      </Button>

      <div className="section-head">
        <h2>Últimos entrenos</h2>
        <Link to="/entreno/historial" className="link-sm">Ver todo <ChevronRight size={14} /></Link>
      </div>
      {recent.data?.length ? (
        <div className="list-card">
          {recent.data.map((w) => (
            <Link key={w.id} to={`/entreno/historial/${w.id}`} className="list-row">
              <div className="grow">
                <strong>{w.routine_name}</strong>
                <span className="muted small">{fmtDate(w.date, { weekday: true })} · {durationWords(w.duration_sec)} · {n0(w.total_volume)} kg</span>
              </div>
              {w.prs > 0 && <span className="pr-badge">🏆 {w.prs}</span>}
              <ChevronRight size={16} className="muted" />
            </Link>
          ))}
        </div>
      ) : <p className="muted small">Aquí aparecerán tus entrenos cuando termines el primero.</p>}

      <Link to="/mas/guia" className="card card-tap guide-link">
        <BookOpen size={20} />
        <div className="grow"><strong>Guía de ejercicios</strong><span className="muted small">Técnica, músculos y vídeos de cada ejercicio</span></div>
        <ChevronRight size={18} className="muted" />
      </Link>

      <NewRoutineSheet open={newOpen} onClose={() => setNewOpen(false)} onCreated={(rt) => nav(`/entreno/rutina/${rt.id}`)} />
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name}>
        <div className="stack-sm">
          <Button variant="secondary" block onClick={() => nav(`/entreno/rutina/${menu.id}`)}><Pencil size={16} /> Editar rutina</Button>
          <Button variant="secondary" block onClick={() => duplicate(menu)}><Copy size={16} /> Duplicar</Button>
          <Button variant="danger" block onClick={() => remove(menu)}><Trash2 size={16} /> Eliminar</Button>
        </div>
      </Sheet>
      {confirmEl}
    </div>
  );
}

export function NewRoutineSheet({ open, onClose, onCreated }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', subtitle: '', day_of_week: '', color: COLORS[0] });
  const save = async () => {
    try {
      const rt = await api.post('/routines', { ...f, day_of_week: f.day_of_week || null });
      onClose();
      setF({ name: '', subtitle: '', day_of_week: '', color: COLORS[0] });
      onCreated?.(rt);
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Nueva rutina">
      <RoutineForm f={f} setF={setF} />
      <Button block size="lg" disabled={!f.name.trim()} onClick={save} className="mt">Crear rutina</Button>
    </Sheet>
  );
}

export function RoutineForm({ f, setF }) {
  return (
    <div className="stack">
      <Field label="Nombre"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej. Entreno D · Torso" maxLength={60} /></Field>
      <Field label="Descripción"><input value={f.subtitle || ''} onChange={(e) => setF({ ...f, subtitle: e.target.value })} placeholder="Opcional" maxLength={80} /></Field>
      <Field label="Día">
        <select value={f.day_of_week || ''} onChange={(e) => setF({ ...f, day_of_week: e.target.value ? Number(e.target.value) : '' })}>
          <option value="">Sin día fijo</option>
          {DAY_NAMES.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
      </Field>
      <div>
        <span className="field-label">Color</span>
        <div className="color-picker">
          {COLORS.map((c) => <button key={c} type="button" aria-label={c} className={f.color === c ? 'active' : ''} style={{ background: c }} onClick={() => setF({ ...f, color: c })} />)}
        </div>
      </div>
    </div>
  );
}
