import { Router } from 'express';
import { all, get, run } from '../db.js';
import { h, bad, notFound, num, str, uid, dateKey } from '../util.js';
import { getProfile, dayNutrition } from '../stats.js';
import { addDays } from '../../shared/calc.js';

const r = Router();
const MEALS = ['desayuno', 'comida', 'merienda', 'cena', 'snack'];
const SOURCES = ['food', 'manual', 'shake', 'rice_cream'];

// ── Alimentos ───────────────────────────────────────────
r.get('/foods', h((req, res) => {
  const qs = String(req.query.q || '').trim().toLowerCase();
  const rows = all('SELECT * FROM foods WHERE user_id IS NULL OR user_id = ? ORDER BY (user_id IS NULL), name', uid(req));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(qs);
  res.json(nq ? rows.filter((f) => norm(f.name).includes(nq) || norm(f.category || '').includes(nq)) : rows);
}));

function foodFields(b) {
  return {
    name: str(b.name, { max: 80, required: true, field: 'Nombre' }),
    category: str(b.category, { max: 30 }) || 'Mis alimentos',
    kcal: num(b.kcal, { min: 0, max: 1000, field: 'Calorías' }) ?? 0,
    protein: num(b.protein, { min: 0, max: 100, field: 'Proteína' }) ?? 0,
    carbs: num(b.carbs, { min: 0, max: 100, field: 'Carbohidratos' }) ?? 0,
    fat: num(b.fat, { min: 0, max: 100, field: 'Grasas' }) ?? 0,
    unit_label: str(b.unit_label, { max: 30 }),
    unit_g: num(b.unit_g, { min: 0.1, max: 2000, field: 'Gramos por unidad' }),
  };
}

r.post('/foods', h((req, res) => {
  const f = foodFields(req.body);
  const id = run('INSERT INTO foods (user_id, name, category, kcal, protein, carbs, fat, unit_label, unit_g) VALUES (?,?,?,?,?,?,?,?,?)',
    uid(req), f.name, f.category, f.kcal, f.protein, f.carbs, f.fat, f.unit_label, f.unit_g).lastInsertRowid;
  res.status(201).json(get('SELECT * FROM foods WHERE id = ?', id));
}));

r.put('/foods/:id', h((req, res) => {
  const food = get('SELECT id FROM foods WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!food) throw notFound('Alimento no encontrado');
  const f = foodFields(req.body);
  run('UPDATE foods SET name=?, category=?, kcal=?, protein=?, carbs=?, fat=?, unit_label=?, unit_g=? WHERE id = ?',
    f.name, f.category, f.kcal, f.protein, f.carbs, f.fat, f.unit_label, f.unit_g, food.id);
  res.json(get('SELECT * FROM foods WHERE id = ?', food.id));
}));

r.delete('/foods/:id', h((req, res) => {
  const food = get('SELECT id FROM foods WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!food) throw notFound('Alimento no encontrado');
  run('DELETE FROM foods WHERE id = ?', food.id);
  res.json({ ok: true });
}));

// ── Registro diario ─────────────────────────────────────
function entryFields(b) {
  const meal = MEALS.includes(b.meal) ? b.meal : 'comida';
  const source = SOURCES.includes(b.source) ? b.source : 'manual';
  return {
    meal, source,
    name: str(b.name, { max: 120, required: true, field: 'Nombre' }),
    food_id: num(b.food_id, { min: 1, int: true }),
    grams: num(b.grams, { min: 0, max: 5000, field: 'Cantidad' }),
    kcal: num(b.kcal, { min: 0, max: 10000, field: 'Calorías' }) ?? 0,
    protein: num(b.protein, { min: 0, max: 1000, field: 'Proteína' }) ?? 0,
    carbs: num(b.carbs, { min: 0, max: 2000, field: 'Carbohidratos' }) ?? 0,
    fat: num(b.fat, { min: 0, max: 1000, field: 'Grasas' }) ?? 0,
    details: b.details ? JSON.stringify(b.details).slice(0, 4000) : null,
  };
}

r.get('/nutrition/day', h((req, res) => {
  const id = uid(req);
  const date = dateKey(req.query.date);
  const p = getProfile(id);
  res.json({
    date,
    entries: all('SELECT * FROM food_entries WHERE user_id = ? AND date = ? ORDER BY created_at, id', id, date)
      .map((e) => ({ ...e, details: e.details ? JSON.parse(e.details) : null })),
    totals: dayNutrition(id, date),
    targets: { kcal: p?.kcal_target, protein: p?.protein_target, carbs: p?.carbs_target, fat: p?.fat_target },
    day: get('SELECT * FROM day_logs WHERE user_id = ? AND date = ?', id, date) || { date, water_ml: 0 },
  });
}));

r.post('/nutrition/entries', h((req, res) => {
  const f = entryFields(req.body);
  const date = dateKey(req.body.date);
  const id = run(`INSERT INTO food_entries (user_id, date, meal, name, food_id, grams, kcal, protein, carbs, fat, source, details)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, uid(req), date, f.meal, f.name, f.food_id, f.grams, f.kcal, f.protein, f.carbs, f.fat, f.source, f.details).lastInsertRowid;
  res.status(201).json(get('SELECT * FROM food_entries WHERE id = ?', id));
}));

r.put('/nutrition/entries/:id', h((req, res) => {
  const e = get('SELECT * FROM food_entries WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!e) throw notFound('Registro no encontrado');
  const f = entryFields({ ...e, details: e.details ? JSON.parse(e.details) : null, ...req.body });
  run('UPDATE food_entries SET meal=?, name=?, grams=?, kcal=?, protein=?, carbs=?, fat=?, details=? WHERE id = ?',
    f.meal, f.name, f.grams, f.kcal, f.protein, f.carbs, f.fat, f.details, e.id);
  res.json(get('SELECT * FROM food_entries WHERE id = ?', e.id));
}));

r.delete('/nutrition/entries/:id', h((req, res) => {
  const e = get('SELECT id FROM food_entries WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!e) throw notFound('Registro no encontrado');
  run('DELETE FROM food_entries WHERE id = ?', e.id);
  res.json({ ok: true });
}));

/** Totales diarios de los últimos N días (gráficos e historial). */
r.get('/nutrition/history', h((req, res) => {
  const id = uid(req);
  const to = dateKey(req.query.to);
  const days = Math.min(120, Number(req.query.days) || 30);
  const from = addDays(to, -(days - 1));
  const rows = all(`SELECT date, SUM(kcal) kcal, SUM(protein) protein, SUM(carbs) carbs, SUM(fat) fat,
      SUM(CASE WHEN source='shake' THEN 1 ELSE 0 END) shakes, SUM(CASE WHEN source='rice_cream' THEN 1 ELSE 0 END) rice
    FROM food_entries WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date`, id, from, to);
  const logs = all('SELECT * FROM day_logs WHERE user_id = ? AND date BETWEEN ? AND ?', id, from, to);
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const n = rows.find((x) => x.date === d) || {};
    const l = logs.find((x) => x.date === d) || {};
    out.push({
      date: d, kcal: Math.round(n.kcal || 0), protein: Math.round(n.protein || 0), carbs: Math.round(n.carbs || 0), fat: Math.round(n.fat || 0),
      shakes: n.shakes || 0, rice: n.rice || 0, water_ml: l.water_ml || 0, sleep_h: l.sleep_h ?? null, creatine_g: l.creatine_g ?? null,
    });
  }
  res.json(out);
}));

/** Historial de batidos y crema de arroz. */
r.get('/nutrition/log', h((req, res) => {
  const source = SOURCES.includes(req.query.source) ? req.query.source : 'shake';
  res.json(all('SELECT * FROM food_entries WHERE user_id = ? AND source = ? ORDER BY date DESC, id DESC LIMIT 100', uid(req), source)
    .map((e) => ({ ...e, details: e.details ? JSON.parse(e.details) : null })));
}));

/** Comidas frecuentes para añadir en un toque. */
r.get('/nutrition/recent', h((req, res) => {
  res.json(all(`SELECT name, meal, food_id, grams, kcal, protein, carbs, fat, source, COUNT(*) n, MAX(date) last
    FROM food_entries WHERE user_id = ? AND source IN ('food','manual') GROUP BY name, grams ORDER BY n DESC, last DESC LIMIT 12`, uid(req)));
}));

// ── Registro de día: agua, sueño, creatina, pasos ───────
r.get('/day/:date', h((req, res) => {
  const date = dateKey(req.params.date);
  res.json(get('SELECT * FROM day_logs WHERE user_id = ? AND date = ?', uid(req), date) || { date, water_ml: 0 });
}));

r.put('/day/:date', h((req, res) => {
  const id = uid(req);
  const date = dateKey(req.params.date);
  const cur = get('SELECT * FROM day_logs WHERE user_id = ? AND date = ?', id, date) || {};
  const b = req.body;
  const v = {
    water_ml: 'water_ml' in b ? num(b.water_ml, { min: 0, max: 15000, int: true, field: 'Agua' }) ?? 0 : cur.water_ml ?? 0,
    sleep_h: 'sleep_h' in b ? num(b.sleep_h, { min: 0, max: 24, field: 'Sueño' }) : cur.sleep_h ?? null,
    creatine_g: 'creatine_g' in b ? num(b.creatine_g, { min: 0, max: 50, field: 'Creatina' }) : cur.creatine_g ?? null,
    steps: 'steps' in b ? num(b.steps, { min: 0, max: 200000, int: true, field: 'Pasos' }) : cur.steps ?? null,
    energy: 'energy' in b ? num(b.energy, { min: 1, max: 5, int: true }) : cur.energy ?? null,
  };
  if (v.water_ml === null) v.water_ml = 0;
  const creatineAt = 'creatine_g' in b ? (v.creatine_g ? str(b.creatine_at, { max: 30 }) || new Date().toISOString() : null) : cur.creatine_at ?? null;
  run(`INSERT INTO day_logs (user_id, date, water_ml, sleep_h, creatine_g, creatine_at, steps, energy) VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id, date) DO UPDATE SET water_ml=excluded.water_ml, sleep_h=excluded.sleep_h, creatine_g=excluded.creatine_g,
       creatine_at=excluded.creatine_at, steps=excluded.steps, energy=excluded.energy`,
  id, date, v.water_ml, v.sleep_h, v.creatine_g, creatineAt, v.steps, v.energy);
  res.json(get('SELECT * FROM day_logs WHERE user_id = ? AND date = ?', id, date));
}));

r.get('/day-logs', h((req, res) => {
  const to = dateKey(req.query.to);
  const from = dateKey(req.query.from);
  if (from > to) throw bad('Rango no válido');
  res.json(all('SELECT * FROM day_logs WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date', uid(req), from, to));
}));

export default r;
