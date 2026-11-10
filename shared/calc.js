// Cálculos compartidos entre cliente y servidor. Todas las fechas son 'YYYY-MM-DD' en hora local del usuario.

export const ACTIVITY = {
  sedentary: { label: 'Sedentario (poco movimiento)', factor: 1.2 },
  light: { label: 'Ligero (2-3 entrenos/semana)', factor: 1.375 },
  moderate: { label: 'Moderado (3-5 entrenos/semana)', factor: 1.55 },
  high: { label: 'Alto (6-7 entrenos o trabajo físico)', factor: 1.725 },
};

export const GOALS = {
  muscle: { label: 'Ganar músculo', kcal: 300, protein: 2.0 },
  recomp: { label: 'Recomposición', kcal: 0, protein: 2.2 },
  cut: { label: 'Perder grasa', kcal: -400, protein: 2.2 },
  maintain: { label: 'Mantener', kcal: 0, protein: 1.8 },
};

/** Mifflin-St Jeor. */
export function bmr({ sex = 'male', weight, height, age }) {
  if (!weight || !height || !age) return 0;
  return 10 * weight + 6.25 * height - 5 * age + (sex === 'female' ? -161 : 5);
}

const r50 = (n) => Math.round(n / 50) * 50;

/** Objetivos orientativos de calorías y macros. */
export function nutritionTargets({ sex, weight, height, age, activity = 'light', goal = 'muscle' }) {
  const base = bmr({ sex, weight, height, age });
  const tdee = base * (ACTIVITY[activity]?.factor ?? 1.375);
  const g = GOALS[goal] ?? GOALS.muscle;
  const kcal = r50(tdee + g.kcal);
  const protein = Math.round(weight * g.protein / 5) * 5;
  const fat = Math.round(weight * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(base), tdee: Math.round(tdee), kcal, protein, fat, carbs };
}

export function waterTarget(weight) {
  if (!weight) return 3000;
  return Math.round((weight * 35) / 250) * 250 + 500;
}

/** Repetición máxima estimada (Epley). */
export const e1rm = (weight, reps) => (weight > 0 && reps > 0 ? weight * (1 + Math.min(reps, 15) / 30) : 0);

// ── Fechas ───────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
export const toKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDays = (k, n) => {
  const d = fromKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return toKey(d);
};
/** 1 = lunes … 7 = domingo */
export const isoDow = (k) => ((fromKey(k).getUTCDay() + 6) % 7) + 1;
export const weekStart = (k) => addDays(k, 1 - isoDow(k));
export const daysBetween = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5);
export const isValidKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && !Number.isNaN(fromKey(k).getTime());

/** Fecha local de hoy (cliente) o en una zona horaria (servidor). */
export function todayKey(timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts;
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
