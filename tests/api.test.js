import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forja-test-'));
process.env.DATA_DIR = dir;

let server, base;
before(async () => {
  const { createApp } = await import('../server/index.js');
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

/** Cliente mínimo con cookie de sesión. */
function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'forja', cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b || {}), del: (u) => call('DELETE', u) };
}

const workout = (date, routineId, rexId, weight, reps) => ({
  date, routine_id: routineId, duration_sec: 3000,
  exercises: [{ library_id: 'Leg_Press', name: 'Prensa de piernas', routine_exercise_id: rexId, sets: [1, 2, 3].map(() => ({ weight, reps, completed: true })) }],
});

let a, b, routine;

test('registro, onboarding y rutina inicial', async () => {
  a = client();
  assert.equal((await a.post('/auth/register', { name: 'Simó', email: 'simo@x.com', password: 'password123' })).status, 201);
  const p = await a.post('/profile/onboarding', { age: 19, height_cm: 187, start_weight: 79, training_days: [1, 2, 4], today: '2026-11-02' });
  assert.equal(p.status, 200);
  assert.equal(p.body.protein_target, 160);
  assert.deepEqual(p.body.training_days, [1, 2, 4]);
  const r = await a.get('/routines');
  assert.equal(r.body.length, 3);
  assert.deepEqual(r.body.map((x) => x.day_of_week), [1, 2, 4]);
  routine = r.body[0];
});

test('rechaza contraseñas cortas, emails duplicados y peticiones sin cabecera CSRF', async () => {
  const c = client();
  assert.equal((await c.post('/auth/register', { name: 'X', email: 'x@x.com', password: '123' })).status, 400);
  assert.equal((await c.post('/auth/register', { name: 'X', email: 'SIMO@x.com', password: 'password123' })).status, 400);
  const raw = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(raw.status, 403);
  assert.equal((await c.post('/auth/login', { email: 'simo@x.com', password: 'mala' })).status, 400);
});

test('guardar entrenamiento, récord personal y peso de trabajo', async () => {
  const rex = routine.exercises[0];
  const w1 = await a.post('/workouts', workout('2026-11-02', routine.id, rex.id, 60, 12));
  assert.equal(w1.status, 201);
  assert.equal(w1.body.prs, 0, 'la primera sesión no es récord');
  assert.equal(w1.body.volume, 2160);
  const w2 = await a.post('/workouts', workout('2026-11-03', routine.id, rex.id, 65, 10));
  assert.equal(w2.body.prs, 1);
  const r = await a.get('/routines');
  assert.equal(r.body[0].exercises[0].weight, 65);
  const h = await a.get('/exercise-history?keys=lib:Leg_Press');
  assert.equal(h.body['lib:Leg_Press'].last.date, '2026-11-03');
  assert.equal(h.body['lib:Leg_Press'].best.weight, 65);
});

test('aislamiento total entre usuarios', async () => {
  b = client();
  await b.post('/auth/register', { name: 'Amigo', email: 'amigo@x.com', password: 'password123' });
  assert.equal((await b.get('/workouts')).body.length, 0);
  assert.equal((await b.get('/routines')).body.length, 0);
  const wid = (await a.get('/workouts')).body[0].id;
  assert.equal((await b.get(`/workouts/${wid}`)).status, 404);
  assert.equal((await b.del(`/workouts/${wid}`)).status, 404);
  assert.equal((await b.put(`/routines/${routine.id}`, { name: 'hack' })).status, 404);
  assert.equal((await b.post(`/routines/${routine.id}/exercises`, { name: 'x' })).status, 404);
  assert.equal((await client().get('/workouts')).status, 401);
});

test('constancia: semanas cumplidas, racha y comodín', async () => {
  const rex = routine.exercises[0];
  // Semana 2026-11-02 ya tiene 2; añadimos una para cumplir 3.
  await a.post('/workouts', workout('2026-11-05', routine.id, rex.id, 65, 10));
  // 4 semanas más cumplidas → gana comodín; luego una semana vacía que se salva.
  for (const wk of ['2026-11-09', '2026-11-16', '2026-11-23']) {
    for (const d of [0, 1, 3]) {
      const day = new Date(`${wk}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + d);
      await a.post('/workouts', workout(day.toISOString().slice(0, 10), routine.id, rex.id, 65, 10));
    }
  }
  let s = await a.get('/stats/consistency?today=2026-12-01');
  assert.equal(s.body.consistency.streak, 4);
  assert.equal(s.body.consistency.tokens, 1);
  // La semana del 30-nov queda vacía: con comodín la racha sigue en 4.
  s = await a.get('/stats/consistency?today=2026-12-08');
  assert.equal(s.body.consistency.streak, 4);
  assert.equal(s.body.consistency.tokens, 0);
  assert.equal(s.body.consistency.weeks.find((w) => w.week === '2026-11-30').status, 'saved');
});

test('nutrición y registro diario', async () => {
  await a.post('/nutrition/entries', { date: '2026-11-10', meal: 'comida', name: 'Pollo', kcal: 220, protein: 46, carbs: 0, fat: 3, source: 'food' });
  await a.post('/nutrition/entries', { date: '2026-11-10', meal: 'merienda', name: 'Batido', kcal: 114, protein: 23, carbs: 2, fat: 1.5, source: 'shake' });
  await a.put('/day/2026-11-10', { creatine_g: 5, water_ml: 1500 });
  const d = await a.get('/nutrition/day?date=2026-11-10');
  assert.equal(d.body.totals.protein, 69);
  assert.equal(d.body.day.creatine_g, 5);
  assert.equal(d.body.day.water_ml, 1500);
  const shakes = await a.get('/nutrition/log?source=shake');
  assert.equal(shakes.body.length, 1);
  assert.equal((await b.get('/nutrition/day?date=2026-11-10')).body.entries.length, 0);
});
