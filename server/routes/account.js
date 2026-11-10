import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { all, get, run, tx, UPLOAD_DIR } from '../db.js';
import { hashPassword, verifyPassword, createSession, destroySession, requireAuth, rateLimit, clearRateLimit } from '../auth.js';
import { h, bad, num, str, uid } from '../util.js';
import { getProfile } from '../stats.js';
import { createDefaultRoutines, createDefaultHabits } from '../seed.js';
import { nutritionTargets, waterTarget, todayKey } from '../../shared/calc.js';

const r = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, created_at: u.created_at });

r.post('/auth/register', h((req, res) => {
  const name = str(req.body.name, { max: 60, required: true, field: 'Nombre' });
  const email = str(req.body.email, { max: 120, required: true, field: 'Email' })?.toLowerCase();
  const password = String(req.body.password || '');
  if (!EMAIL.test(email)) throw bad('Email no válido');
  if (password.length < 8) throw bad('La contraseña debe tener al menos 8 caracteres');
  if (!rateLimit(`reg:${req.ip}`)) throw bad('Demasiados intentos. Espera unos minutos.');
  if (get('SELECT id FROM users WHERE email = ?', email)) throw bad('Ya existe una cuenta con ese email');
  const id = tx(() => {
    const userId = run('INSERT INTO users (email, name, password_hash) VALUES (?,?,?)', email, name, hashPassword(password)).lastInsertRowid;
    run('INSERT INTO profiles (user_id) VALUES (?)', userId);
    return userId;
  });
  createSession(res, id);
  res.status(201).json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', id)) });
}));

r.post('/auth/login', h((req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const key = `login:${req.ip}:${email}`;
  if (!rateLimit(key)) throw bad('Demasiados intentos. Espera 10 minutos.');
  const u = get('SELECT * FROM users WHERE email = ?', email);
  if (!u || !verifyPassword(password, u.password_hash)) throw bad('Email o contraseña incorrectos');
  clearRateLimit(key);
  createSession(res, u.id);
  res.json({ user: publicUser(u) });
}));

r.post('/auth/logout', h((req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
}));

r.get('/auth/me', h((req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user, profile: getProfile(req.user.id) });
}));

r.use(requireAuth);

r.post('/auth/password', h((req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', uid(req));
  if (!verifyPassword(String(req.body.current || ''), u.password_hash)) throw bad('La contraseña actual no es correcta');
  const next = String(req.body.password || '');
  if (next.length < 8) throw bad('La nueva contraseña debe tener al menos 8 caracteres');
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(next), u.id);
  res.json({ ok: true });
}));

const PROFILE_FIELDS = {
  sex: (v) => (['male', 'female'].includes(v) ? v : 'male'),
  age: (v) => num(v, { min: 12, max: 100, int: true, field: 'Edad' }),
  height_cm: (v) => num(v, { min: 100, max: 250, field: 'Altura' }),
  start_weight: (v) => num(v, { min: 30, max: 300, field: 'Peso' }),
  target_weight: (v) => num(v, { min: 30, max: 300, field: 'Peso objetivo' }),
  experience: (v) => str(v, { max: 20 }),
  goal: (v) => str(v, { max: 20 }),
  activity: (v) => str(v, { max: 20 }),
  weekly_goal: (v) => num(v, { min: 1, max: 7, int: true, field: 'Objetivo semanal' }),
  kcal_target: (v) => num(v, { min: 800, max: 8000, int: true, field: 'Calorías' }),
  protein_target: (v) => num(v, { min: 20, max: 500, int: true, field: 'Proteína' }),
  carbs_target: (v) => num(v, { min: 0, max: 1500, int: true, field: 'Carbohidratos' }),
  fat_target: (v) => num(v, { min: 0, max: 400, int: true, field: 'Grasas' }),
  water_target_ml: (v) => num(v, { min: 500, max: 8000, int: true, field: 'Agua' }),
  sleep_target_h: (v) => num(v, { min: 4, max: 12, field: 'Sueño' }),
  creatine_dose_g: (v) => num(v, { min: 0, max: 30, field: 'Creatina' }),
  timezone: (v) => {
    try { todayKey(v); return v; } catch { return 'Europe/Madrid'; }
  },
  training_days: (v) => {
    const arr = Array.isArray(v) ? [...new Set(v.map(Number).filter((d) => d >= 1 && d <= 7))].sort() : [1, 2, 4];
    return JSON.stringify(arr);
  },
  reminders: (v) => JSON.stringify(typeof v === 'object' && v ? v : {}),
};

function updateProfile(userId, body) {
  const sets = [], vals = [];
  for (const [k, fn] of Object.entries(PROFILE_FIELDS)) {
    if (k in body) { sets.push(`${k} = ?`); vals.push(fn(body[k])); }
  }
  if (sets.length) run(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`, ...vals, userId);
}

r.get('/profile', h((req, res) => res.json(getProfile(uid(req)))));

r.put('/profile', h((req, res) => {
  updateProfile(uid(req), req.body);
  if (req.body.name) run('UPDATE users SET name = ? WHERE id = ?', str(req.body.name, { max: 60, required: true }), uid(req));
  res.json(getProfile(uid(req)));
}));

/** Primera configuración: perfil, objetivos calculados, rutina inicial, hábitos y primer peso. */
r.post('/profile/onboarding', h((req, res) => {
  const id = uid(req);
  const b = req.body;
  const weight = num(b.start_weight, { min: 30, max: 300, field: 'Peso' });
  const height = num(b.height_cm, { min: 100, max: 250, field: 'Altura' });
  const age = num(b.age, { min: 12, max: 100, int: true, field: 'Edad' });
  if (!weight || !height || !age) throw bad('Completa edad, altura y peso');
  const t = nutritionTargets({ sex: b.sex, weight, height, age, activity: b.activity || 'light', goal: b.goal || 'muscle' });
  const days = Array.isArray(b.training_days) && b.training_days.length ? b.training_days : [1, 2, 4];
  tx(() => {
    updateProfile(id, {
      ...b,
      activity: b.activity || 'light',
      goal: b.goal || 'muscle',
      training_days: days,
      weekly_goal: b.weekly_goal || days.length,
      kcal_target: t.kcal, protein_target: t.protein, carbs_target: t.carbs, fat_target: t.fat,
      water_target_ml: waterTarget(weight),
      reminders: { creatine: { enabled: true, time: '10:00' }, workout: { enabled: true, time: '17:00' }, water: { enabled: false, time: '13:00' } },
    });
    run('UPDATE profiles SET onboarded = 1 WHERE user_id = ?', id);
    const today = b.today || todayKey(b.timezone || 'Europe/Madrid');
    run(`INSERT INTO body_metrics (user_id, date, weight) VALUES (?,?,?)
         ON CONFLICT(user_id, date) DO UPDATE SET weight = excluded.weight`, id, today, weight);
  });
  if (b.create_routine !== false && !get('SELECT id FROM routines WHERE user_id = ?', id)) createDefaultRoutines(id, days);
  createDefaultHabits(id);
  if (!get('SELECT id FROM goals WHERE user_id = ?', id)) {
    const g = [
      ['Entrenar 12 semanas seguidas sin perder la racha', 'constancia', 12, 'semanas'],
      ['Llegar a mi objetivo de proteína 5 días por semana', 'nutricion', null, null],
      [`Alcanzar ${Math.round(weight + 4)} kg de peso corporal`, 'peso', Math.round(weight + 4), 'kg'],
    ];
    for (const [title, category, target, unit] of g) run('INSERT INTO goals (user_id, title, category, target_value, unit) VALUES (?,?,?,?,?)', id, title, category, target, unit);
  }
  res.json(getProfile(id));
}));

/** Exportación completa de los datos del usuario (portabilidad / copia de seguridad). */
r.get('/account/export', h((req, res) => {
  const id = uid(req);
  const T = ['routines', 'routine_exercises', 'workouts', 'workout_exercises', 'workout_sets', 'body_metrics', 'photos', 'food_entries', 'day_logs', 'habits', 'habit_logs', 'goals'];
  const data = { exported_at: new Date().toISOString(), user: req.user, profile: getProfile(id) };
  for (const t of T) data[t] = all(`SELECT * FROM ${t} WHERE user_id = ?`, id);
  data.custom_foods = all('SELECT * FROM foods WHERE user_id = ?', id);
  res.setHeader('Content-Disposition', 'attachment; filename="forja-export.json"');
  res.json(data);
}));

r.delete('/account', h((req, res) => {
  const id = uid(req);
  const u = get('SELECT * FROM users WHERE id = ?', id);
  if (!verifyPassword(String(req.body?.password || ''), u.password_hash)) throw bad('Contraseña incorrecta');
  destroySession(req, res);
  run('DELETE FROM users WHERE id = ?', id);
  fs.rmSync(path.join(UPLOAD_DIR, String(id)), { recursive: true, force: true });
  res.json({ ok: true });
}));

export default r;
