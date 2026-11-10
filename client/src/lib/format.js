import { toKey, fromKey, addDays, isoDow, weekStart, daysBetween, DAY_NAMES, DAY_SHORT } from '../../../shared/calc.js';

export { toKey, fromKey, addDays, isoDow, weekStart, daysBetween, DAY_NAMES, DAY_SHORT };

/** Fecha local del dispositivo como 'YYYY-MM-DD'. */
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fecha/hora local ISO sin zona: 'YYYY-MM-DDTHH:MM:SS'. */
export function localIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export { MONTHS };

export function fmtDate(key, { weekday = false, year = false } = {}) {
  if (!key) return '';
  const d = fromKey(key);
  const s = `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`;
  return weekday ? `${DAY_NAMES[isoDow(key) - 1].toLowerCase()}, ${s}` : s;
}

export function relDay(key, ref = today()) {
  const diff = daysBetween(ref, key);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return DAY_NAMES[isoDow(key) - 1];
  return fmtDate(key, { weekday: true });
}

export const monthLabel = (key) => {
  const d = fromKey(key);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
export const n1 = (v) => (v == null || Number.isNaN(v) ? '–' : nf.format(v));
export const n0 = (v) => (v == null || Number.isNaN(v) ? '–' : nf0.format(v));

export function duration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function durationWords(sec) {
  const m = Math.round((sec || 0) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const exKey = (libraryId, name) => (libraryId ? `lib:${libraryId}` : `name:${String(name).trim().toLowerCase()}`);

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
};

/** Unidad mostrada según el tipo de ejercicio. */
export const repsUnit = (unit) => (unit === 's' ? 's' : 'reps');

/** Comprime una imagen a JPEG (máx. lado `max`) y devuelve un dataURL. */
export function compressImage(file, max = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
