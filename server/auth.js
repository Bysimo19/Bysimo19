import crypto from 'node:crypto';
import { get, run } from './db.js';

const SESSION_DAYS = 60;
export const COOKIE = 'forja_session';
const SCRYPT = { N: 16384, r: 8, p: 1 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [alg, saltB64, hashB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(expected, actual);
}

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');

export function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', sha(token), userId, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIE !== '1',
    maxAge: SESSION_DAYS * 864e5,
    path: '/',
  });
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', sha(token));
  res.clearCookie(COOKIE, { path: '/' });
}

/** Attaches req.user when a valid session cookie exists. */
export function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (token) {
    const row = get(
      `SELECT u.id, u.email, u.name, u.created_at, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
      sha(token),
    );
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  next();
}

/** Mutating requests must carry a custom header: blocks cross-site form posts (CSRF). */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'forja') return res.status(403).json({ error: 'Petición no permitida' });
  next();
}

const attempts = new Map();
/** In-memory rate limit for auth endpoints: 10 tries / 10 min per key. */
export function rateLimit(key) {
  const now = Date.now();
  const rec = attempts.get(key) || { n: 0, t: now };
  if (now - rec.t > 10 * 60e3) {
    rec.n = 0;
    rec.t = now;
  }
  rec.n++;
  attempts.set(key, rec);
  return rec.n <= 10;
}
export const clearRateLimit = (key) => attempts.delete(key);

export function purgeExpiredSessions() {
  run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
}
