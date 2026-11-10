import { Router } from 'express';
import { all, get, run } from '../db.js';
import { h, bad, notFound, num, str, uid, dateKey } from '../util.js';
import { getProfile, weeklyConsistency, adherence, dailyStreaks, achievements, monthSummary, dayNutrition } from '../stats.js';
import { addDays, isoDow, weekStart } from '../../shared/calc.js';

const r = Router();

// ── Hábitos ─────────────────────────────────────────────
r.get('/habits', h((req, res) => {
  const id = uid(req);
  const to = dateKey(req.query.to);
  const from = req.query.from ? dateKey(req.query.from) : addDays(to, -6);
  res.json({
    habits: all('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY position, id', id),
    logs: all('SELECT habit_id, date FROM habit_logs WHERE user_id = ? AND date BETWEEN ? AND ?', id, from, to),
  });
}));

r.post('/habits', h((req, res) => {
  const id = uid(req);
  const pos = get('SELECT COALESCE(MAX(position), -1) p FROM habits WHERE user_id = ?', id).p + 1;
  const hid = run('INSERT INTO habits (user_id, name, icon, position) VALUES (?,?,?,?)',
    id, str(req.body.name, { max: 60, required: true, field: 'Nombre' }), str(req.body.icon, { max: 20 }) || 'check', pos).lastInsertRowid;
  res.status(201).json(get('SELECT * FROM habits WHERE id = ?', hid));
}));

r.put('/habits/:id', h((req, res) => {
  const hb = get('SELECT * FROM habits WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!hb) throw notFound();
  run('UPDATE habits SET name = ?, icon = ? WHERE id = ?',
    'name' in req.body ? str(req.body.name, { max: 60, required: true }) : hb.name,
    'icon' in req.body ? str(req.body.icon, { max: 20 }) : hb.icon, hb.id);
  res.json(get('SELECT * FROM habits WHERE id = ?', hb.id));
}));

r.delete('/habits/:id', h((req, res) => {
  const hb = get('SELECT id FROM habits WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!hb) throw notFound();
  run('DELETE FROM habits WHERE id = ?', hb.id);
  res.json({ ok: true });
}));

r.post('/habits/:id/toggle', h((req, res) => {
  const id = uid(req);
  const hb = get('SELECT id FROM habits WHERE id = ? AND user_id = ?', Number(req.params.id), id);
  if (!hb) throw notFound();
  const date = dateKey(req.body.date);
  const exists = get('SELECT 1 x FROM habit_logs WHERE habit_id = ? AND date = ?', hb.id, date);
  if (exists) run('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', hb.id, date);
  else run('INSERT INTO habit_logs (habit_id, user_id, date) VALUES (?,?,?)', hb.id, id, date);
  res.json({ done: !exists });
}));

// ── Objetivos ───────────────────────────────────────────
const CATS = ['fuerza', 'peso', 'constancia', 'nutricion', 'otro'];
r.get('/goals', h((req, res) => res.json(all(`SELECT * FROM goals WHERE user_id = ? ORDER BY done, COALESCE(deadline, '9999'), id`, uid(req)))));

function goalFields(b) {
  return {
    title: str(b.title, { max: 120, required: true, field: 'Título' }),
    category: CATS.includes(b.category) ? b.category : 'otro',
    target_value: num(b.target_value, { min: 0, max: 1e6 }),
    current_value: num(b.current_value, { min: 0, max: 1e6 }),
    unit: str(b.unit, { max: 20 }),
    deadline: b.deadline ? dateKey(b.deadline, 'Fecha límite') : null,
  };
}

r.post('/goals', h((req, res) => {
  const g = goalFields(req.body);
  const gid = run('INSERT INTO goals (user_id, title, category, target_value, current_value, unit, deadline) VALUES (?,?,?,?,?,?,?)',
    uid(req), g.title, g.category, g.target_value, g.current_value, g.unit, g.deadline).lastInsertRowid;
  res.status(201).json(get('SELECT * FROM goals WHERE id = ?', gid));
}));

r.put('/goals/:id', h((req, res) => {
  const cur = get('SELECT * FROM goals WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!cur) throw notFound();
  const g = goalFields({ ...cur, ...req.body });
  const done = 'done' in req.body ? (req.body.done ? 1 : 0) : cur.done;
  run('UPDATE goals SET title=?, category=?, target_value=?, current_value=?, unit=?, deadline=?, done=?, done_at=? WHERE id = ?',
    g.title, g.category, g.target_value, g.current_value, g.unit, g.deadline, done,
    done ? cur.done_at || new Date().toISOString() : null, cur.id);
  res.json(get('SELECT * FROM goals WHERE id = ?', cur.id));
}));

r.delete('/goals/:id', h((req, res) => {
  const g = get('SELECT id FROM goals WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!g) throw notFound();
  run('DELETE FROM goals WHERE id = ?', g.id);
  res.json({ ok: true });
}));

// ── Constancia y logros ─────────────────────────────────
r.get('/stats/consistency', h((req, res) => {
  const id = uid(req);
  const today = dateKey(req.query.today);
  const p = getProfile(id);
  const cons = weeklyConsistency(id, today, p);
  const streaks = dailyStreaks(id, today, p);
  res.json({
    consistency: cons,
    adherence: adherence(id, today, p),
    adherence30: adherence(id, today, p, 30),
    streaks,
    achievements: achievements(id, today, p, cons, streaks),
    month: monthSummary(id, today),
  });
}));

/** Todo lo necesario para la pantalla de inicio en una sola petición. */
r.get('/dashboard', h((req, res) => {
  const id = uid(req);
  const today = dateKey(req.query.today);
  const p = getProfile(id);
  if (!p) throw bad('Perfil no encontrado');
  const routines = all('SELECT * FROM routines WHERE user_id = ? ORDER BY position, id', id);
  const exCount = Object.fromEntries(all('SELECT routine_id, COUNT(*) n FROM routine_exercises WHERE user_id = ? GROUP BY routine_id', id).map((x) => [x.routine_id, x.n]));
  const ws = weekStart(today);
  const weekWorkouts = all('SELECT id, date, routine_id, routine_name, duration_sec, total_volume, prs FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date', id, ws, addDays(ws, 6));
  const doneToday = weekWorkouts.filter((w) => w.date === today);

  // Próximo entrenamiento: hoy si es día de entreno y no está hecho; si no, el siguiente día programado.
  let next = null;
  for (let i = 0; i < 14 && !next; i++) {
    const d = addDays(today, i);
    const dow = isoDow(d);
    const rt = routines.find((x) => x.day_of_week === dow) || (p.training_days.includes(dow) ? routines[0] : null);
    if (!rt && !p.training_days.includes(dow)) continue;
    if (i === 0 && doneToday.length) continue;
    if (rt) next = { date: d, inDays: i, routine: { ...rt, exercises: exCount[rt.id] || 0 } };
  }

  const cons = weeklyConsistency(id, today, p);
  const streaks = dailyStreaks(id, today, p);
  const weights = all('SELECT date, weight FROM body_metrics WHERE user_id = ? AND weight IS NOT NULL ORDER BY date', id);
  const habits = all('SELECT * FROM habits WHERE user_id = ? AND active = 1 ORDER BY position, id', id);
  const habitDone = new Set(all('SELECT habit_id FROM habit_logs WHERE user_id = ? AND date = ?', id, today).map((x) => x.habit_id));
  const ach = achievements(id, today, p, cons, streaks);

  res.json({
    today,
    profile: p,
    next,
    doneToday,
    week: {
      start: ws,
      workouts: weekWorkouts,
      planned: p.training_days,
      goal: p.weekly_goal,
    },
    consistency: cons,
    adherence: adherence(id, today, p),
    streaks,
    weights: weights.slice(-60),
    month: monthSummary(id, today),
    nutrition: { totals: dayNutrition(id, today), targets: { kcal: p.kcal_target, protein: p.protein_target, carbs: p.carbs_target, fat: p.fat_target } },
    day: get('SELECT * FROM day_logs WHERE user_id = ? AND date = ?', id, today) || { date: today, water_ml: 0 },
    habits: habits.map((x) => ({ ...x, done: habitDone.has(x.id) })),
    goals: all(`SELECT * FROM goals WHERE user_id = ? AND done = 0 ORDER BY COALESCE(deadline, '9999'), id LIMIT 4`, id),
    achievements: { unlocked: ach.filter((a) => a.unlocked).length, total: ach.length, next: ach.filter((a) => !a.unlocked).sort((a, b) => b.value / b.target - a.value / a.target)[0] || null },
  });
}));

export default r;
