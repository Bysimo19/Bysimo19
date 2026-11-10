import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { all, get, run, UPLOAD_DIR } from '../db.js';
import { h, bad, notFound, num, str, uid, dateKey } from '../util.js';

const r = Router();
const FIELDS = ['weight', 'chest', 'arm', 'waist', 'hips', 'thigh', 'calf', 'shoulders', 'body_fat'];
const LIMITS = { weight: [30, 300], body_fat: [2, 70] };

r.get('/body/metrics', h((req, res) => {
  res.json(all('SELECT * FROM body_metrics WHERE user_id = ? ORDER BY date', uid(req)));
}));

/** Upsert por fecha: solo sobrescribe los campos enviados. */
r.post('/body/metrics', h((req, res) => {
  const id = uid(req);
  const date = dateKey(req.body.date);
  const cur = get('SELECT * FROM body_metrics WHERE user_id = ? AND date = ?', id, date) || {};
  const v = {};
  for (const f of FIELDS) {
    const [min, max] = LIMITS[f] || [5, 250];
    v[f] = f in req.body ? num(req.body[f], { min, max, field: f }) : cur[f] ?? null;
  }
  if (FIELDS.every((f) => v[f] == null)) throw bad('Introduce al menos un dato');
  const notes = 'notes' in req.body ? str(req.body.notes, { max: 500 }) : cur.notes ?? null;
  run(`INSERT INTO body_metrics (user_id, date, ${FIELDS.join(', ')}, notes) VALUES (?,?,${FIELDS.map(() => '?').join(',')},?)
       ON CONFLICT(user_id, date) DO UPDATE SET ${FIELDS.map((f) => `${f}=excluded.${f}`).join(', ')}, notes=excluded.notes`,
  id, date, ...FIELDS.map((f) => v[f]), notes);
  res.json(get('SELECT * FROM body_metrics WHERE user_id = ? AND date = ?', id, date));
}));

r.delete('/body/metrics/:id', h((req, res) => {
  const m = get('SELECT id FROM body_metrics WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!m) throw notFound();
  run('DELETE FROM body_metrics WHERE id = ?', m.id);
  res.json({ ok: true });
}));

// ── Fotos de progreso (privadas: solo se sirven al propietario) ──
const userDir = (userId) => {
  const d = path.join(UPLOAD_DIR, String(Number(userId)));
  fs.mkdirSync(d, { recursive: true });
  return d;
};

r.get('/body/photos', h((req, res) => {
  res.json(all('SELECT id, date, pose, weight, notes, created_at FROM photos WHERE user_id = ? ORDER BY date DESC, id DESC', uid(req)));
}));

r.post('/body/photos', h((req, res) => {
  const id = uid(req);
  const date = dateKey(req.body.date);
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.image || ''));
  if (!m) throw bad('Imagen no válida');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) throw bad('La imagen es demasiado grande (máx. 6 MB)');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(userDir(id), filename), buf);
  const pose = ['frente', 'lado', 'espalda', 'otra'].includes(req.body.pose) ? req.body.pose : 'frente';
  const pid = run('INSERT INTO photos (user_id, date, pose, filename, weight, notes) VALUES (?,?,?,?,?,?)',
    id, date, pose, filename, num(req.body.weight, { min: 30, max: 300 }), str(req.body.notes, { max: 300 })).lastInsertRowid;
  res.status(201).json(get('SELECT id, date, pose, weight, notes, created_at FROM photos WHERE id = ?', pid));
}));

r.get('/body/photos/:id/file', h((req, res) => {
  const p = get('SELECT * FROM photos WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!p) throw notFound();
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  res.sendFile(path.join(userDir(p.user_id), path.basename(p.filename)));
}));

r.delete('/body/photos/:id', h((req, res) => {
  const p = get('SELECT * FROM photos WHERE id = ? AND user_id = ?', Number(req.params.id), uid(req));
  if (!p) throw notFound();
  fs.rmSync(path.join(userDir(p.user_id), path.basename(p.filename)), { force: true });
  run('DELETE FROM photos WHERE id = ?', p.id);
  res.json({ ok: true });
}));

export default r;
