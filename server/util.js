import { isValidKey } from '../shared/calc.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (msg) => new HttpError(400, msg);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);

/** Number in range, or null when empty. Throws on invalid. */
export function num(v, { min = -1e9, max = 1e9, int = false, field = 'valor' } = {}) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw bad(`${field} no válido`);
  return int ? Math.round(n) : Math.round(n * 100) / 100;
}

export function str(v, { max = 500, required = false, field = 'texto' } = {}) {
  if (v === null || v === undefined) {
    if (required) throw bad(`${field} es obligatorio`);
    return null;
  }
  const s = String(v).trim().slice(0, max);
  if (required && !s) throw bad(`${field} es obligatorio`);
  return s || null;
}

export function dateKey(v, field = 'fecha') {
  if (!isValidKey(v)) throw bad(`${field} no válida`);
  return v;
}

/** Wrap a sync/async handler so thrown errors reach the error middleware. */
export const h = (fn) => (req, res, next) => {
  try {
    const r = fn(req, res, next);
    if (r && typeof r.catch === 'function') r.catch(next);
  } catch (e) {
    next(e);
  }
};

export const uid = (req) => req.user.id;
