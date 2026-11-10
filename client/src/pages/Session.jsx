import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Check, Plus, Minus, Info, X, Timer, Trophy, ChevronDown, Ellipsis, TrendingUp, Trash2, StickyNote, SkipForward, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../lib/api.js';
import { useTimer, useToast, useWorkout } from '../lib/store.jsx';
import { duration, durationWords, n0, n1, fmtDate, localIso, repsUnit } from '../lib/format.js';
import { e1rm } from '../../../shared/calc.js';
import { sessionStats, exerciseCompare, exerciseFromLibrary } from '../lib/workout.js';
import { Button, Sheet, Field, IconButton, useConfirm, Delta, Bar } from '../components/ui.jsx';
import { ExerciseThumb, ExerciseInfoSheet, ExercisePicker } from '../components/exercise.jsx';

const FEELINGS = ['😫', '😕', '😐', '🙂', '🔥'];

function useElapsed(startMs) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, (now - startMs) / 1000);
}

export default function Session() {
  const { draft, update, discard } = useWorkout();
  const timer = useTimer();
  const nav = useNavigate();
  const toast = useToast();
  const [info, setInfo] = useState(null);
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(null);
  const [finish, setFinish] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmEl, ask] = useConfirm();
  const elapsed = useElapsed(draft?.startedAtMs || Date.now());

  if (result) return <ResultView result={result} onClose={(to) => nav(to)} />;
  if (!draft) return <Navigate to="/entreno" replace />;

  const stats = sessionStats(draft);

  const setField = (ei, si, field, value) => update((d) => {
    d.exercises[ei].sets[si][field] = value;
    return d;
  });

  const toggleSet = (ei, si) => {
    const ex = draft.exercises[ei];
    const s = ex.sets[si];
    const completing = !s.completed;
    update((d) => {
      const set = d.exercises[ei].sets[si];
      if (completing) {
        if (set.reps === '' || set.reps == null) set.reps = set.prevReps ?? d.exercises[ei].reps_max ?? '';
        if ((set.weight === '' || set.weight == null) && set.prevWeight != null) set.weight = set.prevWeight;
        // Propaga el peso a las series siguientes vacías o iguales al valor anterior.
        d.exercises[ei].sets.forEach((o, j) => { if (j > si && !o.completed && (o.weight === '' || o.weight == null)) o.weight = set.weight; });
      }
      set.completed = completing;
      return d;
    });
    if (completing) {
      const isLast = draft.exercises[ei].sets.every((x, j) => j === si || x.completed);
      if (!isLast || ei < draft.exercises.length - 1) timer.start(ex.rest_sec, isLast ? draft.exercises[ei + 1]?.name : ex.name);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const addSet = (ei) => update((d) => {
    const sets = d.exercises[ei].sets;
    const last = sets[sets.length - 1];
    sets.push({ weight: last?.weight ?? '', reps: '', completed: false, prevWeight: null, prevReps: last?.reps || null });
    return d;
  });
  const removeSet = (ei) => update((d) => {
    if (d.exercises[ei].sets.length > 1) d.exercises[ei].sets.pop();
    return d;
  });

  const addExercise = async (pick) => {
    setPicker(false);
    try {
      const ex = await exerciseFromLibrary(pick.library_id, pick.name);
      update((d) => { d.exercises.push(ex); return d; });
    } catch (e) { toast(e.message, 'error'); }
  };

  const removeExercise = async (ei) => {
    setMenu(null);
    if (!(await ask({ title: `¿Quitar ${draft.exercises[ei].name} de este entreno?`, confirm: 'Quitar', danger: true }))) return;
    update((d) => { d.exercises.splice(ei, 1); return d; });
  };

  const moveExercise = (ei, dir) => {
    setMenu(null);
    update((d) => {
      const j = ei + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      [d.exercises[ei], d.exercises[j]] = [d.exercises[j], d.exercises[ei]];
      return d;
    });
  };

  const completeAll = (ei) => {
    setMenu(null);
    update((d) => {
      d.exercises[ei].sets.forEach((s) => {
        if (s.reps === '' || s.reps == null) s.reps = s.prevReps ?? d.exercises[ei].reps_max;
        if ((s.weight === '' || s.weight == null) && s.prevWeight != null) s.weight = s.prevWeight;
        s.completed = true;
      });
      return d;
    });
  };

  const cancel = async () => {
    if (!(await ask({ title: '¿Descartar entreno?', message: 'Se perderán los datos de esta sesión.', confirm: 'Descartar', danger: true }))) return;
    timer.stop();
    discard();
    nav('/entreno');
  };

  const save = async ({ feeling, notes }) => {
    const body = {
      routine_id: draft.routine_id,
      routine_name: draft.routine_name,
      date: draft.date,
      started_at: draft.started_at,
      finished_at: localIso(),
      duration_sec: Math.round(elapsed),
      feeling, notes,
      exercises: draft.exercises.map((e) => ({
        routine_exercise_id: e.routine_exercise_id,
        library_id: e.library_id,
        name: e.name,
        notes: e.notes,
        sets: e.sets.map((s) => ({ weight: Number(String(s.weight).replace(',', '.')) || 0, reps: Number(s.reps) || 0, completed: !!s.completed })),
      })),
    };
    const r = await api.post('/workouts', body);
    timer.stop();
    setResult({ ...r, duration: Math.round(elapsed), name: draft.routine_name });
    discard();
  };

  const pct = stats.total ? stats.sets / stats.total : 0;

  return (
    <div className="session">
      <header className="session-head">
        <IconButton label="Minimizar" onClick={() => nav(-1)}><ChevronDown size={24} /></IconButton>
        <div className="session-title">
          <strong>{draft.routine_name}</strong>
          <span>{duration(elapsed)} · {stats.sets}/{stats.total} series</span>
        </div>
        <Button size="sm" onClick={() => setFinish(true)}>Finalizar</Button>
        <div className="session-progress"><span style={{ width: `${pct * 100}%` }} /></div>
      </header>

      <div className="session-body">
        {draft.exercises.map((ex, ei) => (
          <ExerciseBlock key={ex.uid} ex={ex} ei={ei} onField={setField} onToggle={toggleSet} onAddSet={addSet} onRemoveSet={removeSet}
            onInfo={() => setInfo(ex)} onMenu={() => setMenu(ei)} />
        ))}

        <Button variant="secondary" block onClick={() => setPicker(true)}><Plus size={17} /> Añadir ejercicio</Button>
        <Button variant="ghost" block onClick={cancel} className="danger-text"><X size={17} /> Descartar entreno</Button>
      </div>

      <RestBar />

      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} ex={info && { ...info, img: info.image, video: info.video_url, sets: info.sets_target }} />
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={addExercise} />
      <Sheet open={menu != null} onClose={() => setMenu(null)} title={menu != null ? draft.exercises[menu]?.name : ''}>
        {menu != null && draft.exercises[menu] && (
          <div className="stack-sm">
            <Button variant="secondary" block onClick={() => completeAll(menu)}><Check size={16} /> Marcar todas las series</Button>
            <NoteField value={draft.exercises[menu].notes} onChange={(v) => update((d) => { d.exercises[menu].notes = v; return d; })} />
            <div className="grid-2">
              <Button variant="secondary" onClick={() => moveExercise(menu, -1)} disabled={menu === 0}><ArrowUp size={16} /> Subir</Button>
              <Button variant="secondary" onClick={() => moveExercise(menu, 1)} disabled={menu === draft.exercises.length - 1}><ArrowDown size={16} /> Bajar</Button>
            </div>
            <Button variant="danger" block onClick={() => removeExercise(menu)}><Trash2 size={16} /> Quitar del entreno</Button>
          </div>
        )}
      </Sheet>
      <FinishSheet open={finish} onClose={() => setFinish(false)} stats={stats} elapsed={elapsed} onSave={save} />
      {confirmEl}
    </div>
  );
}

function NoteField({ value, onChange }) {
  return (
    <Field label={<><StickyNote size={14} /> Nota del ejercicio</>}>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Ej. molestia en hombro, subir asiento…" maxLength={500} />
    </Field>
  );
}

function ExerciseBlock({ ex, ei, onField, onToggle, onAddSet, onRemoveSet, onInfo, onMenu }) {
  const done = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
  const cmp = exerciseCompare(ex);
  const best = ex.best;
  const unit = repsUnit(ex.unit);
  const showWeight = ex.unit === 'kg' || ex.sets.some((s) => Number(s.weight) > 0);

  return (
    <section className={`ex-block ${done ? 'done' : ''}`}>
      <div className="ex-head">
        <button type="button" className="ex-head-main" onClick={onInfo}>
          <ExerciseThumb img={ex.image} name={ex.name} size={52} />
          <span className="grow">
            <strong>{ex.name}</strong>
            <span className="muted small">{ex.sets_target}×{ex.reps_min}-{ex.reps_max} {unit} · {ex.rest_sec}s descanso <Info size={12} /></span>
          </span>
        </button>
        {done && <span className="ex-done"><Check size={16} strokeWidth={3} /></span>}
        <IconButton label="Opciones" onClick={onMenu}><Ellipsis size={20} /></IconButton>
      </div>

      {ex.suggestion?.type === 'up' && (
        <div className="suggest up"><TrendingUp size={15} /> La última vez completaste todo. Hoy prueba con <b>{n1(ex.suggestion.weight)} kg</b> (antes {n1(ex.suggestion.from)}).</div>
      )}
      {ex.suggestion?.type === 'reps' && <div className="suggest up"><TrendingUp size={15} /> {ex.suggestion.text}</div>}
      {ex.previous ? (
        <p className="ex-prev">
          Última vez ({fmtDate(ex.previous.date)}): {ex.previous.sets.filter((s) => s.completed).map((s) => `${s.weight ? `${n1(s.weight)}×` : ''}${s.reps}`).join(' · ') || 'sin series'}
          {best?.e1rm > 0 && <> · Mejor 1RM est. <b>{n1(best.e1rm)} kg</b></>}
        </p>
      ) : <p className="ex-prev">Primera vez: elige un peso con el que hagas {ex.reps_max} {unit} con buena técnica y te sobren 2.</p>}
      {ex.notes && <p className="ex-note"><StickyNote size={13} /> {ex.notes}</p>}

      <div className={`set-table ${showWeight ? '' : 'no-weight'}`}>
        <div className="set-row set-header">
          <span>Serie</span><span>Anterior</span>{showWeight && <span>kg</span>}<span>{unit === 's' ? 'seg' : 'Reps'}</span><span><Check size={14} /></span>
        </div>
        {ex.sets.map((s, si) => {
          const w = Number(String(s.weight).replace(',', '.')) || 0;
          const r = Number(s.reps) || 0;
          const isPr = s.completed && best && r > 0 && (w > 0 ? (w > best.weight || e1rm(w, r) > best.e1rm + 0.01) : r > best.reps);
          return (
            <div key={si} className={`set-row ${s.completed ? 'completed' : ''}`}>
              <span className="set-idx">{isPr ? <Trophy size={15} className="c-gold" /> : si + 1}</span>
              <span className="set-prev">{s.prevReps != null ? `${s.prevWeight ? `${n1(s.prevWeight)}×` : ''}${s.prevReps}` : '—'}</span>
              {showWeight && (
                <input aria-label={`Peso serie ${si + 1}`} inputMode="decimal" value={s.weight} placeholder={s.prevWeight != null ? n1(s.prevWeight) : '0'}
                  onChange={(e) => onField(ei, si, 'weight', e.target.value.replace(/[^0-9.,]/g, ''))} onFocus={(e) => e.target.select()} />
              )}
              <input aria-label={`Repeticiones serie ${si + 1}`} inputMode="numeric" value={s.reps}
                placeholder={String(s.prevReps ?? ex.reps_max)} onChange={(e) => onField(ei, si, 'reps', e.target.value.replace(/[^0-9]/g, ''))} onFocus={(e) => e.target.select()} />
              <button type="button" className="set-check" aria-label={s.completed ? 'Desmarcar serie' : 'Completar serie'} aria-pressed={s.completed} onClick={() => onToggle(ei, si)}>
                <Check size={18} strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="ex-foot">
        <div className="set-btns">
          <button type="button" onClick={() => onRemoveSet(ei)} disabled={ex.sets.length <= 1} aria-label="Quitar serie"><Minus size={16} /></button>
          <button type="button" onClick={() => onAddSet(ei)}><Plus size={16} /> Serie</button>
        </div>
        {cmp.prev != null && cmp.cur > 0 && (
          <span className="small">{cmp.prev > 0 ? <>vs. última vez <Delta value={cmp.cur - cmp.prev} unit="kg" digits={0} />{cmp.cur === cmp.prev && <span className="delta delta-flat">igual</span>}</> : <>vs. última vez <Delta value={cmp.curReps - (cmp.prevReps || 0)} unit="reps" digits={0} /></>}</span>
        )}
      </div>
    </section>
  );
}

function RestBar() {
  const { timer, remaining, add, stop } = useTimer();
  if (!timer) return null;
  const finished = remaining === 0;
  return (
    <div className={`rest-bar ${finished ? 'finished' : ''}`}>
      <div className="rest-progress"><span style={{ width: `${(1 - remaining / timer.total) * 100}%` }} /></div>
      <div className="rest-row">
        <button type="button" onClick={() => add(-15)} aria-label="Restar 15 segundos">−15</button>
        <div className="rest-center">
          <span className="rest-label"><Timer size={14} /> {finished ? '¡A por la siguiente!' : 'Descanso'}</span>
          <strong>{duration(remaining)}</strong>
          {timer.label && <span className="rest-next">{timer.label}</span>}
        </div>
        <button type="button" onClick={() => add(15)} aria-label="Sumar 15 segundos">+15</button>
        <button type="button" className="rest-skip" onClick={stop} aria-label="Saltar descanso"><SkipForward size={18} /></button>
      </div>
    </div>
  );
}

function FinishSheet({ open, onClose, stats, elapsed, onSave }) {
  const toast = useToast();
  const [feeling, setFeeling] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = stats.total - stats.sets;
  const go = async () => {
    setBusy(true);
    try { await onSave({ feeling, notes }); } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Finalizar entreno">
      <div className="finish-stats">
        <div><strong>{duration(elapsed)}</strong><span>duración</span></div>
        <div><strong>{stats.sets}</strong><span>series</span></div>
        <div><strong>{n0(stats.volume)}</strong><span>kg volumen</span></div>
      </div>
      {pending > 0 && <p className="warn-box">Tienes {pending} serie{pending > 1 ? 's' : ''} sin marcar. Se guardarán como no completadas.</p>}
      {stats.sets === 0 && <p className="warn-box">No has completado ninguna serie todavía.</p>}
      <span className="field-label">¿Cómo te has sentido?</span>
      <div className="feelings">
        {FEELINGS.map((f, i) => <button key={i} type="button" className={feeling === i + 1 ? 'active' : ''} onClick={() => setFeeling(i + 1)} aria-label={`Sensación ${i + 1} de 5`}>{f}</button>)}
      </div>
      <Field label="Notas"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" maxLength={1000} /></Field>
      <Button block size="lg" className="mt" onClick={go} loading={busy} disabled={stats.sets === 0}>
        <Check size={18} /> FINALIZAR ENTRENAMIENTO
      </Button>
    </Sheet>
  );
}

function ResultView({ result, onClose }) {
  return (
    <div className="result">
      <div className="result-burst"><Trophy size={44} /></div>
      <h1>¡Entreno completado!</h1>
      <p className="muted">{result.name} · {durationWords(result.duration)}</p>
      <div className="finish-stats">
        <div><strong>{result.totalSets}</strong><span>series</span></div>
        <div><strong>{n0(result.volume)}</strong><span>kg volumen</span></div>
        <div><strong>{result.prs}</strong><span>récords</span></div>
      </div>
      {result.prList.length > 0 && (
        <div className="card pr-list">
          <h3 className="card-title">🏆 Nuevos récords personales</h3>
          {result.prList.map((p, i) => <div key={i} className="row between"><span>{p.name}</span><strong>{p.weight ? `${n1(p.weight)} kg × ${p.reps}` : `${p.reps} reps`}</strong></div>)}
        </div>
      )}
      <p className="result-quote">Cada entreno cuenta. El de hoy ya nadie te lo quita.</p>
      <Bar value={1} max={1} />
      <div className="stack-sm mt">
        <Button block size="lg" onClick={() => onClose(`/entreno/historial/${result.id}`)}>Ver resumen</Button>
        <Button variant="secondary" block onClick={() => onClose('/')}>Ir a inicio</Button>
      </div>
    </div>
  );
}
