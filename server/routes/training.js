import { Router } from 'express';
import { all, get, run, tx } from '../db.js';
import { EXERCISES, GROUPS, EXERCISE_MAP } from '../data/exercises.js';
import { h, bad, notFound, num, str, uid, dateKey } from '../util.js';
import { insertRoutineExercise, createDefaultRoutines } from '../seed.js';
import { getProfile } from '../stats.js';
import { e1rm } from '../../shared/calc.js';

const r = Router();

r.get('/library', (_req, res) => res.json({ groups: GROUPS, exercises: EXERCISES }));

// ── Rutinas ─────────────────────────────────────────────
function routinesFor(userId) {
  const routines = all('SELECT * FROM routines WHERE user_id = ? ORDER BY position, id', userId);
  const exs = all('SELECT * FROM routine_exercises WHERE user_id = ? ORDER BY position, id', userId);
  return routines.map((rt) => ({ ...rt, exercises: exs.filter((e) => e.routine_id === rt.id) }));
}

function ownRoutine(userId, id) {
  const rt = get('SELECT * FROM routines WHERE id = ? AND user_id = ?', Number(id), userId);
  if (!rt) throw notFound('Rutina no encontrada');
  return rt;
}

r.get('/routines', h((req, res) => res.json(routinesFor(uid(req)))));

r.post('/routines', h((req, res) => {
  const id = uid(req);
  const name = str(req.body.name, { max: 60, required: true, field: 'Nombre' });
  const pos = get('SELECT COALESCE(MAX(position), -1) p FROM routines WHERE user_id = ?', id).p + 1;
  const rid = run('INSERT INTO routines (user_id, name, subtitle, day_of_week, color, position) VALUES (?,?,?,?,?,?)',
    id, name, str(req.body.subtitle, { max: 80 }), num(req.body.day_of_week, { min: 1, max: 7, int: true }), str(req.body.color, { max: 20 }) || '#7C8CFF', pos).lastInsertRowid;
  res.status(201).json(routinesFor(id).find((x) => x.id === rid));
}));

r.post('/routines/default', h((req, res) => {
  const p = getProfile(uid(req));
  createDefaultRoutines(uid(req), p?.training_days || [1, 2, 4]);
  res.json(routinesFor(uid(req)));
}));

r.put('/routines/:id', h((req, res) => {
  const id = uid(req);
  const rt = ownRoutine(id, req.params.id);
  const b = req.body;
  run('UPDATE routines SET name = ?, subtitle = ?, day_of_week = ?, color = ? WHERE id = ?',
    'name' in b ? str(b.name, { max: 60, required: true, field: 'Nombre' }) : rt.name,
    'subtitle' in b ? str(b.subtitle, { max: 80 }) : rt.subtitle,
    'day_of_week' in b ? num(b.day_of_week, { min: 1, max: 7, int: true }) : rt.day_of_week,
    'color' in b ? str(b.color, { max: 20 }) : rt.color,
    rt.id);
  if (Array.isArray(b.order)) {
    tx(() => b.order.forEach((exId, i) => run('UPDATE routine_exercises SET position = ? WHERE id = ? AND routine_id = ?', i, Number(exId), rt.id)));
  }
  res.json(routinesFor(id).find((x) => x.id === rt.id));
}));

r.delete('/routines/:id', h((req, res) => {
  const rt = ownRoutine(uid(req), req.params.id);
  run('DELETE FROM routines WHERE id = ?', rt.id);
  res.json({ ok: true });
}));

r.post('/routines/:id/duplicate', h((req, res) => {
  const id = uid(req);
  const rt = ownRoutine(id, req.params.id);
  const newId = tx(() => {
    const pos = get('SELECT COALESCE(MAX(position), -1) p FROM routines WHERE user_id = ?', id).p + 1;
    const nid = run('INSERT INTO routines (user_id, name, subtitle, day_of_week, color, position) VALUES (?,?,?,?,?,?)',
      id, `${rt.name} (copia)`, rt.subtitle, null, rt.color, pos).lastInsertRowid;
    all('SELECT * FROM routine_exercises WHERE routine_id = ? ORDER BY position', rt.id)
      .forEach((e, i) => insertRoutineExercise(id, nid, e, i));
    return nid;
  });
  res.status(201).json(routinesFor(id).find((x) => x.id === newId));
}));

// ── Ejercicios de rutina ────────────────────────────────
function exerciseFields(b) {
  const out = {};
  if ('name' in b) out.name = str(b.name, { max: 80, required: true, field: 'Nombre' });
  if ('muscles' in b) out.muscles = str(b.muscles, { max: 150 });
  if ('sets' in b) out.sets = num(b.sets, { min: 1, max: 12, int: true, field: 'Series' }) ?? 3;
  if ('reps_min' in b) out.reps_min = num(b.reps_min, { min: 1, max: 300, int: true, field: 'Repeticiones' }) ?? 8;
  if ('reps_max' in b) out.reps_max = num(b.reps_max, { min: 1, max: 300, int: true, field: 'Repeticiones' }) ?? 12;
  if ('rest_sec' in b) out.rest_sec = num(b.rest_sec, { min: 0, max: 900, int: true, field: 'Descanso' }) ?? 90;
  if ('weight' in b) out.weight = num(b.weight, { min: 0, max: 1000, field: 'Peso' }) ?? 0;
  if ('tips' in b) out.tips = str(b.tips, { max: 2000 });
  if ('notes' in b) out.notes = str(b.notes, { max: 500 });
  if ('video_url' in b) {
    const v = str(b.video_url, { max: 500 });
    if (v && !/^https?:\/\//i.test(v)) throw bad('El enlace de vídeo debe empezar por http(s)://');
    out.video_url = v;
  }
  if (out.reps_min && out.reps_max && out.reps_min > out.reps_max) [out.reps_min, out.reps_max] = [out.reps_max, out.reps_min];
  return out;
}

r.post('/routines/:id/exercises', h((req, res) => {
  const id = uid(req);
  const rt = ownRoutine(id, req.params.id);
  const libId = req.body.library_id && EXERCISE_MAP[req.body.library_id] ? req.body.library_id : null;
  if (!libId && !req.body.name) throw bad('Indica un ejercicio');
  const pos = get('SELECT COALESCE(MAX(position), -1) p FROM routine_exercises WHERE routine_id = ?', rt.id).p + 1;
  const exId = insertRoutineExercise(id, rt.id, { library_id: libId, ...exerciseFields(req.body) }, pos);
  res.status(201).json(get('SELECT * FROM routine_exercises WHERE id = ?', exId));
}));

r.put('/routine-exercises/:id', h((req, res) => {
  const ex = get('SELECT * FROM routine_exercises WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!ex) throw notFound('Ejercicio no encontrado');
  const f = exerciseFields(req.body);
  if ('library_id' in req.body) {
    const lib = EXERCISE_MAP[req.body.library_id];
    if (lib) Object.assign(f, { library_id: lib.id, image: lib.img, name: f.name ?? lib.name, muscles: f.muscles ?? lib.muscles, tips: f.tips ?? lib.tips.join('\n'), video_url: f.video_url ?? lib.video });
  }
  const keys = Object.keys(f);
  if (keys.length) run(`UPDATE routine_exercises SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => f[k]), ex.id);
  res.json(get('SELECT * FROM routine_exercises WHERE id = ?', ex.id));
}));

r.delete('/routine-exercises/:id', h((req, res) => {
  const ex = get('SELECT id FROM routine_exercises WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!ex) throw notFound('Ejercicio no encontrado');
  run('DELETE FROM routine_exercises WHERE id = ?', ex.id);
  res.json({ ok: true });
}));

// ── Historial por ejercicio ─────────────────────────────
const exKey = (libraryId, name) => (libraryId ? `lib:${libraryId}` : `name:${String(name).trim().toLowerCase()}`);

/** Última sesión y mejores marcas para una lista de ejercicios. */
function historyFor(userId, keys, excludeWorkoutId = 0) {
  const out = {};
  for (const key of keys) {
    const last = get(
      `SELECT we.id, w.date, w.id wid FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
       WHERE we.user_id = ? AND we.ex_key = ? AND w.id != ? ORDER BY w.date DESC, w.id DESC LIMIT 1`, userId, key, excludeWorkoutId);
    const best = get(
      `SELECT MAX(ws.weight) max_weight, MAX(ws.weight * (1 + MIN(ws.reps, 15) / 30.0)) best_e1rm, MAX(ws.reps) max_reps
       FROM workout_sets ws JOIN workout_exercises we ON we.id = ws.workout_exercise_id
       WHERE we.user_id = ? AND we.ex_key = ? AND ws.completed = 1 AND we.workout_id != ?`, userId, key, excludeWorkoutId);
    out[key] = {
      last: last ? { date: last.date, workout_id: last.wid, sets: all('SELECT set_index, weight, reps, completed FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_index', last.id) } : null,
      best: best?.max_weight != null || best?.max_reps != null
        ? { weight: best.max_weight || 0, e1rm: Math.round((best.best_e1rm || 0) * 10) / 10, reps: best.max_reps || 0 } : null,
    };
  }
  return out;
}

r.get('/exercise-history', h((req, res) => {
  const keys = String(req.query.keys || '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 50);
  res.json(historyFor(uid(req), keys));
}));

/** Serie temporal de un ejercicio para gráficos de fuerza. */
r.get('/exercise-progress', h((req, res) => {
  const key = String(req.query.key || '');
  const rows = all(
    `SELECT w.date, MAX(ws.weight) top_weight, MAX(ws.weight * (1 + MIN(ws.reps, 15) / 30.0)) e1rm,
            SUM(ws.weight * ws.reps) volume, MAX(ws.reps) max_reps
     FROM workout_sets ws JOIN workout_exercises we ON we.id = ws.workout_exercise_id JOIN workouts w ON w.id = we.workout_id
     WHERE we.user_id = ? AND we.ex_key = ? AND ws.completed = 1 GROUP BY w.id ORDER BY w.date, w.id`, uid(req), key);
  res.json(rows.map((x) => ({ ...x, e1rm: Math.round(x.e1rm * 10) / 10 })));
}));

/** Ejercicios que el usuario ha registrado alguna vez (para el selector de gráficos). */
r.get('/exercise-keys', h((req, res) => {
  res.json(all(
    `SELECT we.ex_key key, we.name, we.library_id, COUNT(DISTINCT we.workout_id) sessions, MAX(w.date) last_date
     FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id WHERE we.user_id = ?
       AND EXISTS (SELECT 1 FROM workout_sets ws WHERE ws.workout_exercise_id = we.id AND ws.completed = 1)
     GROUP BY we.ex_key ORDER BY sessions DESC, last_date DESC`, uid(req)));
}));

// ── Entrenamientos ──────────────────────────────────────
r.get('/workouts', h((req, res) => {
  const limit = Math.min(200, Number(req.query.limit) || 50);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const rows = all('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?', uid(req), limit, offset);
  const ids = rows.map((w) => w.id);
  const exs = ids.length ? all(`SELECT workout_id, name, completed FROM workout_exercises WHERE workout_id IN (${ids.map(() => '?').join(',')}) ORDER BY position`, ...ids) : [];
  res.json(rows.map((w) => ({ ...w, exercises: exs.filter((e) => e.workout_id === w.id).map((e) => e.name) })));
}));

r.get('/workouts/dates', h((req, res) => {
  res.json(all('SELECT id, date, routine_name FROM workouts WHERE user_id = ? ORDER BY date', uid(req)));
}));

r.get('/workouts/:id', h((req, res) => {
  const w = get('SELECT * FROM workouts WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!w) throw notFound('Entrenamiento no encontrado');
  const exs = all('SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position', w.id);
  const sets = all('SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY set_index', w.id);
  const hist = historyFor(uid(req), exs.map((e) => e.ex_key), w.id);
  res.json({
    ...w,
    exercises: exs.map((e) => ({ ...e, sets: sets.filter((s) => s.workout_exercise_id === e.id), previous: hist[e.ex_key]?.last ?? null })),
  });
}));

/**
 * FINALIZAR ENTRENAMIENTO: guarda sesión, ejercicios y series en una transacción,
 * detecta récords personales y actualiza el peso de trabajo de la rutina.
 */
r.post('/workouts', h((req, res) => {
  const userId = uid(req);
  const b = req.body;
  const date = dateKey(b.date);
  const exercises = Array.isArray(b.exercises) ? b.exercises.slice(0, 40) : [];
  if (!exercises.length) throw bad('El entrenamiento no tiene ejercicios');
  const routine = b.routine_id ? get('SELECT * FROM routines WHERE id = ? AND user_id = ?', Number(b.routine_id), userId) : null;

  const result = tx(() => {
    const wid = run(
      `INSERT INTO workouts (user_id, routine_id, routine_name, date, started_at, finished_at, duration_sec, feeling, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      userId, routine?.id ?? null, str(b.routine_name, { max: 80 }) || routine?.name || 'Entrenamiento libre', date,
      str(b.started_at, { max: 30 }), str(b.finished_at, { max: 30 }),
      num(b.duration_sec, { min: 0, max: 86400, int: true }) ?? 0,
      num(b.feeling, { min: 1, max: 5, int: true }), str(b.notes, { max: 1000 }),
    ).lastInsertRowid;

    let volume = 0, totalSets = 0, prs = 0;
    const prList = [];
    exercises.forEach((ex, i) => {
      const libId = ex.library_id && EXERCISE_MAP[ex.library_id] ? ex.library_id : null;
      const name = str(ex.name, { max: 80, required: true, field: 'Ejercicio' });
      const key = exKey(libId, name);
      const sets = (Array.isArray(ex.sets) ? ex.sets : []).slice(0, 20).map((s, j) => ({
        set_index: j,
        weight: num(s.weight, { min: 0, max: 1000, field: 'Peso' }) ?? 0,
        reps: num(s.reps, { min: 0, max: 1000, int: true, field: 'Repeticiones' }) ?? 0,
        completed: s.completed ? 1 : 0,
      }));
      const done = sets.filter((s) => s.completed && s.reps > 0);
      const prev = get(
        `SELECT MAX(ws.weight) mw, MAX(ws.weight * (1 + MIN(ws.reps, 15) / 30.0)) me, MAX(ws.reps) mr, COUNT(*) n FROM workout_sets ws
         JOIN workout_exercises we ON we.id = ws.workout_exercise_id WHERE we.user_id = ? AND we.ex_key = ? AND ws.completed = 1`, userId, key);
      const routineEx = ex.routine_exercise_id ? get('SELECT id FROM routine_exercises WHERE id = ? AND user_id = ?', Number(ex.routine_exercise_id), userId) : null;
      const weId = run('INSERT INTO workout_exercises (workout_id, user_id, routine_exercise_id, library_id, ex_key, name, position, completed, notes) VALUES (?,?,?,?,?,?,?,?,?)',
        wid, userId, routineEx?.id ?? null, libId, key, name, i, done.length === sets.length && sets.length ? 1 : 0, str(ex.notes, { max: 500 })).lastInsertRowid;

      // Récord: solo si había historial previo; marca la mejor serie del ejercicio.
      let prIdx = -1;
      if (prev?.n > 0 && done.length) {
        let bestScore = 0;
        sets.forEach((s, j) => {
          if (!s.completed || s.reps <= 0) return;
          const isPr = s.weight > 0 ? (s.weight > (prev.mw || 0) || e1rm(s.weight, s.reps) > (prev.me || 0) + 0.01) : s.reps > (prev.mr || 0);
          const score = s.weight > 0 ? e1rm(s.weight, s.reps) : s.reps;
          if (isPr && score > bestScore) { bestScore = score; prIdx = j; }
        });
      }
      sets.forEach((s, j) => {
        run('INSERT INTO workout_sets (workout_exercise_id, workout_id, user_id, set_index, weight, reps, completed, is_pr) VALUES (?,?,?,?,?,?,?,?)',
          weId, wid, userId, s.set_index, s.weight, s.reps, s.completed, j === prIdx ? 1 : 0);
        if (s.completed) { totalSets++; volume += s.weight * s.reps; }
      });
      if (prIdx >= 0) { prs++; prList.push({ name, weight: sets[prIdx].weight, reps: sets[prIdx].reps }); }

      // Peso de trabajo de la rutina = mayor peso completado hoy.
      if (routineEx && done.length) {
        const top = Math.max(...done.map((s) => s.weight));
        if (top > 0) run('UPDATE routine_exercises SET weight = ? WHERE id = ?', top, routineEx.id);
      }
    });
    run('UPDATE workouts SET total_volume = ?, total_sets = ?, prs = ? WHERE id = ?', Math.round(volume), totalSets, prs, wid);
    return { id: wid, volume: Math.round(volume), totalSets, prs, prList };
  });
  res.status(201).json(result);
}));

r.put('/workouts/:id', h((req, res) => {
  const w = get('SELECT * FROM workouts WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!w) throw notFound('Entrenamiento no encontrado');
  run('UPDATE workouts SET notes = ?, feeling = ?, date = ? WHERE id = ?',
    'notes' in req.body ? str(req.body.notes, { max: 1000 }) : w.notes,
    'feeling' in req.body ? num(req.body.feeling, { min: 1, max: 5, int: true }) : w.feeling,
    'date' in req.body ? dateKey(req.body.date) : w.date, w.id);
  res.json({ ok: true });
}));

r.delete('/workouts/:id', h((req, res) => {
  const w = get('SELECT id FROM workouts WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!w) throw notFound('Entrenamiento no encontrado');
  run('DELETE FROM workouts WHERE id = ?', w.id);
  res.json({ ok: true });
}));

export default r;
