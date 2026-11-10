// Notificaciones push (Web Push / VAPID). En iPhone funcionan con la app instalada en la pantalla de inicio (iOS 16.4+).
import * as webpush from 'web-push';
import { Router } from 'express';
import { all, get, run } from './db.js';
import { h, bad, uid } from './util.js';
import { todayKey, isoDow } from '../shared/calc.js';
import { getProfile, dayNutrition } from './stats.js';

function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const row = get("SELECT value FROM settings WHERE key = 'vapid'");
  if (row) return JSON.parse(row.value);
  const keys = webpush.generateVAPIDKeys();
  run("INSERT INTO settings (key, value) VALUES ('vapid', ?)", JSON.stringify(keys));
  return keys;
}

const keys = vapidKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@forja.app', keys.publicKey, keys.privateKey);

export async function sendToUser(userId, payload) {
  const subs = all('SELECT * FROM push_subscriptions WHERE user_id = ?', userId);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: JSON.parse(s.keys) }, JSON.stringify(payload), { TTL: 3600 });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) run('DELETE FROM push_subscriptions WHERE id = ?', s.id);
    }
  }
  return sent;
}

export const pushRouter = Router();
pushRouter.get('/push/key', (_req, res) => res.json({ publicKey: keys.publicKey }));

pushRouter.post('/push/subscribe', h((req, res) => {
  const { endpoint, keys: k } = req.body || {};
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || !k?.p256dh || !k?.auth) throw bad('Suscripción no válida');
  run(`INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?,?,?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys`,
  uid(req), endpoint, JSON.stringify({ p256dh: k.p256dh, auth: k.auth }));
  res.json({ ok: true });
}));

pushRouter.post('/push/unsubscribe', h((req, res) => {
  run('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', uid(req), String(req.body?.endpoint || ''));
  res.json({ ok: true });
}));

pushRouter.post('/push/test', h(async (req, res) => {
  const n = await sendToUser(uid(req), { title: 'Forja', body: 'Las notificaciones funcionan. ¡A por ello! 💪', url: '/' });
  res.json({ sent: n });
}));

/** Comprueba cada minuto qué recordatorios tocan, en la zona horaria de cada usuario. */
async function tick() {
  const users = all('SELECT DISTINCT user_id FROM push_subscriptions');
  for (const { user_id: id } of users) {
    const p = getProfile(id);
    if (!p) continue;
    const tz = p.timezone || 'Europe/Madrid';
    let today, hhmm;
    try {
      today = todayKey(tz);
      hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    } catch { continue; }
    const rem = p.reminders || {};
    const due = (kind) => rem[kind]?.enabled && rem[kind].time && hhmm >= rem[kind].time
      && !get('SELECT 1 x FROM reminders_sent WHERE user_id = ? AND kind = ? AND date = ?', id, kind, today);
    const mark = (kind) => run('INSERT OR IGNORE INTO reminders_sent (user_id, kind, date) VALUES (?,?,?)', id, kind, today);

    if (due('creatine')) {
      mark('creatine');
      const d = get('SELECT creatine_g FROM day_logs WHERE user_id = ? AND date = ?', id, today);
      if (!(d?.creatine_g > 0)) await sendToUser(id, { title: 'Creatina 💊', body: `¿Ya has tomado tus ${p.creatine_dose_g || 5} g de hoy? Toca para marcarla.`, url: '/nutricion?tab=suplementos', tag: 'creatine' });
    }
    if (due('workout')) {
      mark('workout');
      if (p.training_days.includes(isoDow(today)) && !get('SELECT 1 x FROM workouts WHERE user_id = ? AND date = ?', id, today)) {
        const rt = get('SELECT name FROM routines WHERE user_id = ? AND day_of_week = ?', id, isoDow(today));
        await sendToUser(id, { title: 'Hoy toca gimnasio 🏋️', body: rt ? `${rt.name} te espera. Lo importante es ir.` : 'Lo importante es ir.', url: '/', tag: 'workout' });
      }
    }
    if (due('water')) {
      mark('water');
      const d = get('SELECT water_ml FROM day_logs WHERE user_id = ? AND date = ?', id, today);
      if ((d?.water_ml || 0) < (p.water_target_ml || 3000) / 2) await sendToUser(id, { title: 'Hidratación 💧', body: 'Vas por debajo de la mitad de tu objetivo de agua.', url: '/', tag: 'water' });
    }
    if (due('protein')) {
      mark('protein');
      const t = dayNutrition(id, today);
      if (p.protein_target && t.protein < p.protein_target * 0.8) await sendToUser(id, { title: 'Proteína 🥩', body: `Llevas ${Math.round(t.protein)} de ${p.protein_target} g. Un batido te acerca.`, url: '/nutricion', tag: 'protein' });
    }
  }
  run("DELETE FROM reminders_sent WHERE date < date('now', '-7 day')");
}

export function startScheduler() {
  const loop = () => tick().catch((e) => console.error('[push]', e.message));
  setInterval(loop, 60_000).unref();
  setTimeout(loop, 5000).unref();
}
