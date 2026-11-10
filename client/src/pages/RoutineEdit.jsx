import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, Plus, Play, Info, Settings2, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast, useWorkout } from '../lib/store.jsx';
import { startWorkout } from '../lib/workout.js';
import { DAY_NAMES, n1 } from '../lib/format.js';
import { PageHeader, Card, Button, Sheet, Field, Loading, ErrorState, Empty, useConfirm, IconButton } from '../components/ui.jsx';
import { ExerciseThumb, ExerciseInfoSheet, ExercisePicker } from '../components/exercise.jsx';
import { RoutineForm } from './Train.jsx';

export default function RoutineEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useData('/routines');
  const { draft, setDraft } = useWorkout();
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(null);
  const [info, setInfo] = useState(null);
  const [meta, setMeta] = useState(null);
  const [starting, setStarting] = useState(false);
  const [confirmEl, ask] = useConfirm();

  if (loading && !data) return <div className="page"><PageHeader back="/entreno" /><Loading /></div>;
  if (error && !data) return <div className="page"><PageHeader back="/entreno" /><ErrorState error={error} retry={reload} /></div>;
  const rt = data.find((r) => r.id === Number(id));
  if (!rt) return <div className="page"><PageHeader back="/entreno" /><Empty title="Rutina no encontrada" /></div>;

  const patchLocal = (fn) => setData((list) => list.map((r) => (r.id === rt.id ? fn(r) : r)));

  const move = async (idx, dir) => {
    const ex = [...rt.exercises];
    const j = idx + dir;
    if (j < 0 || j >= ex.length) return;
    [ex[idx], ex[j]] = [ex[j], ex[idx]];
    patchLocal((r) => ({ ...r, exercises: ex }));
    try { await api.put(`/routines/${rt.id}`, { order: ex.map((e) => e.id) }); } catch (e) { toast(e.message, 'error'); reload(); }
  };

  const add = async (pick) => {
    setPicker(false);
    try {
      const ex = await api.post(`/routines/${rt.id}/exercises`, pick);
      patchLocal((r) => ({ ...r, exercises: [...r.exercises, ex] }));
      toast(`${ex.name} añadido`);
    } catch (e) { toast(e.message, 'error'); }
  };

  const begin = async () => {
    if (draft && !(await ask({ title: 'Ya tienes un entreno en curso', message: '¿Descartarlo y empezar este?', confirm: 'Descartar y empezar', danger: true }))) return;
    setStarting(true);
    try { await startWorkout(rt, setDraft); nav('/entreno/sesion'); } catch (e) { toast(e.message, 'error'); setStarting(false); }
  };

  const saveMeta = async () => {
    try {
      const r = await api.put(`/routines/${rt.id}`, { ...meta, day_of_week: meta.day_of_week || null });
      patchLocal(() => r);
      setMeta(null);
    } catch (e) { toast(e.message, 'error'); }
  };

  const totalSets = rt.exercises.reduce((a, e) => a + e.sets, 0);
  const estMin = Math.round(rt.exercises.reduce((a, e) => a + e.sets * (40 + e.rest_sec), 0) / 60);

  return (
    <div className="page">
      <PageHeader back="/entreno" title={rt.name} subtitle={`${rt.day_of_week ? DAY_NAMES[rt.day_of_week - 1] : 'Sin día fijo'} · ${rt.exercises.length} ejercicios · ${totalSets} series · ~${estMin} min`}
        right={<IconButton label="Editar rutina" onClick={() => setMeta({ name: rt.name, subtitle: rt.subtitle, day_of_week: rt.day_of_week || '', color: rt.color })}><Settings2 size={20} /></IconButton>} />

      <Button block size="lg" onClick={begin} loading={starting} disabled={!rt.exercises.length}><Play size={17} fill="currentColor" /> Empezar entreno</Button>

      <div className="stack mt">
        {rt.exercises.map((e, i) => (
          <Card key={e.id} className="rex-card">
            <button type="button" className="rex-main" onClick={() => setEditing(e)}>
              <ExerciseThumb img={e.image} name={e.name} size={56} />
              <span className="grow">
                <strong>{e.name}</strong>
                <span className="muted small">{e.muscles}</span>
                <span className="rex-meta">
                  <b>{e.sets}×{e.reps_min === e.reps_max ? e.reps_min : `${e.reps_min}-${e.reps_max}`}</b>
                  <span>{e.rest_sec}s</span>
                  <span>{e.weight > 0 ? `${n1(e.weight)} kg` : 'Peso libre'}</span>
                </span>
              </span>
            </button>
            <div className="rex-side">
              <IconButton label="Ver técnica" onClick={() => setInfo(e)}><Info size={18} /></IconButton>
              <IconButton label="Subir" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={18} /></IconButton>
              <IconButton label="Bajar" onClick={() => move(i, 1)} disabled={i === rt.exercises.length - 1}><ArrowDown size={18} /></IconButton>
            </div>
          </Card>
        ))}
        {!rt.exercises.length && <Empty title="Rutina vacía" text="Añade ejercicios de la biblioteca o crea los tuyos." />}
        <Button variant="secondary" block onClick={() => setPicker(true)}><Plus size={17} /> Añadir ejercicio</Button>
      </div>

      <p className="muted small mt">Consejo: cuando hagas todas las series en el tope de repeticiones, la app te sugerirá subir peso en la siguiente sesión.</p>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={add} />
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} ex={info && { ...info, img: info.image, video: info.video_url }} />
      <ExerciseEditSheet ex={editing} onClose={() => setEditing(null)}
        onSaved={(ex) => { patchLocal((r) => ({ ...r, exercises: r.exercises.map((x) => (x.id === ex.id ? ex : x)) })); setEditing(null); }}
        onDeleted={(exId) => { patchLocal((r) => ({ ...r, exercises: r.exercises.filter((x) => x.id !== exId) })); setEditing(null); }} />
      <Sheet open={!!meta} onClose={() => setMeta(null)} title="Editar rutina">
        {meta && <RoutineForm f={meta} setF={setMeta} />}
        <Button block size="lg" className="mt" onClick={saveMeta} disabled={!meta?.name?.trim()}>Guardar</Button>
      </Sheet>
      {confirmEl}
    </div>
  );
}

function ExerciseEditSheet({ ex, onClose, onSaved, onDeleted }) {
  const toast = useToast();
  const [f, setF] = useState(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEl, ask] = useConfirm();
  useEffect(() => { if (ex) setF({ ...ex }); }, [ex]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: f.name, muscles: f.muscles, sets: f.sets, reps_min: f.reps_min, reps_max: f.reps_max, rest_sec: f.rest_sec,
        weight: String(f.weight ?? '').replace(',', '.') || 0, tips: f.tips, video_url: f.video_url, notes: f.notes,
      };
      onSaved(await api.put(`/routine-exercises/${ex.id}`, body));
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!(await ask({ title: `¿Quitar ${ex.name}?`, confirm: 'Quitar', danger: true }))) return;
    try { await api.del(`/routine-exercises/${ex.id}`); onDeleted(ex.id); } catch (e) { toast(e.message, 'error'); }
  };
  const doReplace = async (pick) => {
    setReplace(false);
    try {
      const body = pick.library_id ? { library_id: pick.library_id, name: pick.name, muscles: null, tips: null, video_url: null } : { name: pick.name };
      if (pick.library_id) { delete body.muscles; delete body.tips; delete body.video_url; }
      onSaved(await api.put(`/routine-exercises/${ex.id}`, body));
      toast('Ejercicio sustituido');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <Sheet open={!!ex} onClose={onClose} title="Editar ejercicio" tall>
      {f && (
        <div className="stack">
          <Field label="Nombre"><input value={f.name} onChange={set('name')} maxLength={80} /></Field>
          <div className="grid-3">
            <Field label="Series"><input inputMode="numeric" value={f.sets} onChange={set('sets')} /></Field>
            <Field label="Reps mín."><input inputMode="numeric" value={f.reps_min} onChange={set('reps_min')} /></Field>
            <Field label="Reps máx."><input inputMode="numeric" value={f.reps_max} onChange={set('reps_max')} /></Field>
          </div>
          <div className="grid-2">
            <Field label="Descanso" suffix="s"><input inputMode="numeric" value={f.rest_sec} onChange={set('rest_sec')} /></Field>
            <Field label="Peso de trabajo" suffix="kg"><input inputMode="decimal" value={f.weight ?? ''} onChange={set('weight')} /></Field>
          </div>
          <Field label="Músculos"><input value={f.muscles || ''} onChange={set('muscles')} maxLength={150} /></Field>
          <Field label="Consejos de técnica" hint="Uno por línea"><textarea rows={4} value={f.tips || ''} onChange={set('tips')} /></Field>
          <Field label="Enlace de vídeo"><input type="url" value={f.video_url || ''} onChange={set('video_url')} placeholder="https://…" /></Field>
          <Field label="Notas"><input value={f.notes || ''} onChange={set('notes')} placeholder="Ej. asiento en posición 4" maxLength={500} /></Field>
          <Button block size="lg" onClick={save} loading={busy}>Guardar cambios</Button>
          <div className="grid-2">
            <Button variant="secondary" onClick={() => setReplace(true)}><RefreshCw size={16} /> Sustituir</Button>
            <Button variant="danger" onClick={del}><Trash2 size={16} /> Quitar</Button>
          </div>
        </div>
      )}
      <ExercisePicker open={replace} onClose={() => setReplace(false)} onPick={doReplace} title="Sustituir por…" />
      {confirmEl}
    </Sheet>
  );
}
