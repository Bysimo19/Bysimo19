import { api } from './api.js';
import { loadLibrary } from './library.js';
import { exKey, localIso, today } from './format.js';

/** Sugerencia de progresión doble: si en la última sesión todas las series llegaron al tope, sube peso. */
export function suggestion(ex, last) {
  if (!last?.sets?.length) return null;
  const done = last.sets.filter((s) => s.completed);
  if (!done.length) return null;
  const topW = Math.max(...done.map((s) => s.weight || 0));
  const allTop = done.length >= ex.sets && done.every((s) => s.reps >= ex.reps_max);
  if (allTop && ex.increment > 0 && topW > 0) return { type: 'up', weight: Math.round((topW + ex.increment) * 100) / 100, from: topW };
  if (allTop && (!topW || !ex.increment)) return { type: 'reps', text: 'Intenta 1-2 repeticiones más por serie' };
  return { type: 'keep', weight: topW };
}

let uidSeq = 0;
export const newUid = () => `${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

/** Convierte un ejercicio de rutina en ejercicio de sesión, con historial y sugerencia. */
export function buildExercise(rex, lib, hist) {
  const L = rex.library_id ? lib.map[rex.library_id] : null;
  const key = exKey(rex.library_id, rex.name);
  const h = hist?.[key] || {};
  const base = {
    uid: newUid(),
    routine_exercise_id: rex.id ?? null,
    library_id: rex.library_id ?? null,
    key,
    name: rex.name,
    muscles: rex.muscles ?? L?.muscles ?? '',
    image: rex.image ?? L?.img ?? null,
    tips: rex.tips ?? L?.tips?.join('\n') ?? '',
    video_url: rex.video_url ?? L?.video ?? null,
    rest_sec: rex.rest_sec ?? L?.rest_sec ?? 90,
    reps_min: rex.reps_min ?? L?.reps_min ?? 8,
    reps_max: rex.reps_max ?? L?.reps_max ?? 12,
    sets_target: rex.sets ?? 3,
    unit: L?.unit ?? 'kg',
    increment: L?.increment ?? 2.5,
    previous: h.last || null,
    best: h.best || null,
    notes: '',
  };
  const sug = suggestion({ ...base, sets: base.sets_target }, h.last);
  base.suggestion = sug;
  const startWeight = sug?.type === 'up' ? sug.weight : (rex.weight || sug?.weight || '');
  base.sets = Array.from({ length: base.sets_target }, (_, i) => {
    const prev = h.last?.sets?.[i];
    return {
      weight: base.unit === 'kg' ? (startWeight || prev?.weight || '') : (prev?.weight || ''),
      reps: '',
      completed: false,
      prevWeight: prev?.weight ?? null,
      prevReps: prev?.reps ?? null,
    };
  });
  return base;
}

export async function startWorkout(routine, setDraft) {
  const lib = await loadLibrary();
  const keys = routine ? routine.exercises.map((e) => exKey(e.library_id, e.name)) : [];
  const hist = keys.length ? await api.get(`/exercise-history?keys=${encodeURIComponent(keys.join(','))}`) : {};
  const draft = {
    routine_id: routine?.id ?? null,
    routine_name: routine?.name ?? 'Entreno libre',
    color: routine?.color ?? null,
    date: today(),
    started_at: localIso(),
    startedAtMs: Date.now(),
    exercises: routine ? routine.exercises.map((e) => buildExercise(e, lib, hist)) : [],
  };
  setDraft(draft);
  return draft;
}

/** Añade un ejercicio de la biblioteca (o personalizado) a la sesión. */
export async function exerciseFromLibrary(libId, customName) {
  const lib = await loadLibrary();
  const L = libId ? lib.map[libId] : null;
  const rex = L
    ? { library_id: L.id, name: L.name, sets: L.sets, reps_min: L.reps_min, reps_max: L.reps_max, rest_sec: L.rest_sec }
    : { name: customName, sets: 3, reps_min: 8, reps_max: 12, rest_sec: 90 };
  const key = exKey(rex.library_id, rex.name);
  const hist = await api.get(`/exercise-history?keys=${encodeURIComponent(key)}`).catch(() => ({}));
  return buildExercise(rex, lib, hist);
}

export function sessionStats(draft) {
  let sets = 0, volume = 0, total = 0;
  for (const ex of draft.exercises) {
    for (const s of ex.sets) {
      total++;
      if (s.completed) { sets++; volume += (Number(s.weight) || 0) * (Number(s.reps) || 0); }
    }
  }
  return { sets, total, volume: Math.round(volume) };
}

/** Volumen de un ejercicio en la sesión actual vs la anterior, comparando el mismo número de series. */
export function exerciseCompare(ex) {
  const done = ex.sets.filter((s) => s.completed);
  const prevDone = (ex.previous?.sets || []).filter((s) => s.completed).slice(0, done.length);
  const cur = done.reduce((a, s) => a + (Number(String(s.weight).replace(',', '.')) || 0) * (Number(s.reps) || 0), 0);
  const curReps = done.reduce((a, s) => a + (Number(s.reps) || 0), 0);
  if (!ex.previous || !prevDone.length) return { cur, prev: null, curReps, prevReps: null };
  const prev = prevDone.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
  const prevReps = prevDone.reduce((a, s) => a + (s.reps || 0), 0);
  return { cur, prev, curReps, prevReps };
}
