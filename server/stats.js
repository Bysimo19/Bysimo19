import { all, get } from './db.js';
import { addDays, weekStart, isoDow, daysBetween, toKey, fromKey } from '../shared/calc.js';

export function getProfile(userId) {
  const p = get('SELECT * FROM profiles WHERE user_id = ?', userId);
  if (!p) return null;
  return { ...p, training_days: JSON.parse(p.training_days || '[]'), reminders: JSON.parse(p.reminders || '{}') };
}

/**
 * Constancia semanal con comodines: cada 4 semanas cumplidas seguidas ganas un comodín (máx. 2)
 * que salva automáticamente una semana fallida. Así una mala semana no borra el progreso.
 */
export function weeklyConsistency(userId, today, profile) {
  const goal = Math.max(1, profile?.weekly_goal || 3);
  const rows = all('SELECT date FROM workouts WHERE user_id = ? ORDER BY date', userId);
  const user = get('SELECT created_at FROM users WHERE id = ?', userId);
  const counts = new Map();
  for (const r of rows) {
    const w = weekStart(r.date);
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const currentWeek = weekStart(today);
  const createdKey = user?.created_at?.slice(0, 10) || today;
  const firstKey = rows.length && rows[0].date < createdKey ? rows[0].date : createdKey;
  let w = weekStart(firstKey);
  let streak = 0, best = 0, tokens = 0, run = 0, weeksMet = 0, weeksTotal = 0;
  const weeks = [];
  let guard = 0;
  while (w < currentWeek && guard++ < 1000) {
    const n = counts.get(w) || 0;
    let status;
    const introWeek = w === weekStart(firstKey);
    if (introWeek && n < goal) {
      // La semana de alta no penaliza: puede empezar a mitad de semana.
      weeks.push({ week: w, count: n, status: 'intro' });
      w = addDays(w, 7);
      continue;
    }
    weeksTotal++;
    if (n >= goal) {
      status = 'met';
      streak++; run++; weeksMet++;
      if (run % 4 === 0) tokens = Math.min(2, tokens + 1);
    } else if (tokens > 0) {
      status = 'saved';
      tokens--; run = 0;
    } else {
      status = 'missed';
      streak = 0; run = 0;
    }
    best = Math.max(best, streak);
    weeks.push({ week: w, count: n, status });
    w = addDays(w, 7);
  }
  const thisWeekCount = counts.get(currentWeek) || 0;
  const currentMet = thisWeekCount >= goal;
  const liveStreak = streak + (currentMet ? 1 : 0);
  best = Math.max(best, liveStreak);
  weeks.push({ week: currentWeek, count: thisWeekCount, status: currentMet ? 'met' : 'current' });
  return {
    goal,
    streak: liveStreak,
    best,
    tokens,
    weeksMet: weeksMet + (currentMet ? 1 : 0),
    weeksTotal: weeksTotal + 1,
    thisWeek: thisWeekCount,
    weeks: weeks.slice(-16),
    totalWorkouts: rows.length,
    lastWorkout: rows.length ? rows[rows.length - 1].date : null,
  };
}

/** Porcentaje de sesiones planificadas que se han hecho desde el inicio (máx. 100). */
export function adherence(userId, today, profile, days = null) {
  const tdays = profile?.training_days?.length ? profile.training_days : [1, 2, 4];
  const user = get('SELECT created_at FROM users WHERE id = ?', userId);
  let start = user?.created_at?.slice(0, 10) || today;
  const first = get('SELECT MIN(date) d FROM workouts WHERE user_id = ?', userId)?.d;
  if (first && first < start) start = first;
  if (days) {
    const s = addDays(today, -(days - 1));
    if (s > start) start = s;
  }
  let planned = 0;
  for (let d = start, i = 0; d <= today && i < 4000; d = addDays(d, 1), i++) if (tdays.includes(isoDow(d))) planned++;
  const done = get('SELECT COUNT(*) n FROM workouts WHERE user_id = ? AND date >= ? AND date <= ?', userId, start, today).n;
  return { planned, done, pct: planned ? Math.min(100, Math.round((done / planned) * 100)) : done ? 100 : 0 };
}

/** Racha de días consecutivos que cumplen una condición; hoy no rompe la racha si aún no se cumple. */
function dayStreak(dateSet, today) {
  let d = dateSet.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dateSet.has(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

export function dailyStreaks(userId, today, profile) {
  const since = addDays(today, -400);
  const creatine = new Set(all('SELECT date FROM day_logs WHERE user_id = ? AND creatine_g > 0 AND date >= ?', userId, since).map((r) => r.date));
  const pt = profile?.protein_target || 0;
  const proteinDays = new Set(
    pt
      ? all('SELECT date, SUM(protein) p FROM food_entries WHERE user_id = ? AND date >= ? GROUP BY date', userId, since)
          .filter((r) => r.p >= pt * 0.9)
          .map((r) => r.date)
      : [],
  );
  const wt = profile?.water_target_ml || 0;
  const waterDays = new Set(wt ? all('SELECT date FROM day_logs WHERE user_id = ? AND water_ml >= ? AND date >= ?', userId, wt, since).map((r) => r.date) : []);
  return {
    creatine: dayStreak(creatine, today),
    protein: dayStreak(proteinDays, today),
    water: dayStreak(waterDays, today),
    creatineDays: creatine.size,
    proteinDays: proteinDays.size,
    waterDays: waterDays.size,
  };
}

export function achievements(userId, today, profile, cons, streaks) {
  const total = cons.totalWorkouts;
  const prs = get('SELECT COALESCE(SUM(prs),0) n FROM workouts WHERE user_id = ?', userId).n;
  const volume = get('SELECT COALESCE(SUM(total_volume),0) v FROM workouts WHERE user_id = ?', userId).v;
  const photos = get('SELECT COUNT(*) n FROM photos WHERE user_id = ?', userId).n;
  const metrics = get('SELECT COUNT(*) n FROM body_metrics WHERE user_id = ?', userId).n;
  const goalsDone = get('SELECT COUNT(*) n FROM goals WHERE user_id = ? AND done = 1', userId).n;
  const dates = all('SELECT date FROM workouts WHERE user_id = ? ORDER BY date', userId).map((r) => r.date);
  let comeback = 0;
  for (let i = 1; i < dates.length; i++) if (daysBetween(dates[i - 1], dates[i]) >= 10) comeback++;
  const perfectWeeks = cons.weeksMet;
  const earlyBird = get("SELECT COUNT(*) n FROM workouts WHERE user_id = ? AND CAST(substr(started_at, 12, 2) AS INTEGER) < 9", userId).n;

  const A = (id, icon, title, desc, value, target) => ({
    id, icon, title, desc, value: Math.min(value, target), target, unlocked: value >= target,
  });
  return [
    A('first', 'flag', 'Primer paso', 'Completa tu primer entrenamiento', total, 1),
    A('w5', 'dumbbell', 'Calentando motores', '5 entrenamientos completados', total, 5),
    A('w10', 'dumbbell', 'Ya es un hábito', '10 entrenamientos completados', total, 10),
    A('w25', 'medal', 'Constante', '25 entrenamientos completados', total, 25),
    A('w50', 'medal', 'Medio centenar', '50 entrenamientos completados', total, 50),
    A('w100', 'trophy', 'Club de los 100', '100 entrenamientos completados', total, 100),
    A('week1', 'calendar', 'Semana perfecta', 'Cumple tu objetivo semanal', perfectWeeks, 1),
    A('streak4', 'flame', 'Un mes sin fallar', 'Racha de 4 semanas', cons.best, 4),
    A('streak8', 'flame', 'Dos meses on fire', 'Racha de 8 semanas', cons.best, 8),
    A('streak12', 'flame', 'Trimestre de hierro', 'Racha de 12 semanas', cons.best, 12),
    A('pr1', 'zap', 'Nuevo récord', 'Consigue tu primer récord personal', prs, 1),
    A('pr25', 'zap', 'Máquina de récords', '25 récords personales', prs, 25),
    A('vol10k', 'weight', '10 toneladas', 'Levanta 10.000 kg en total', Math.round(volume), 10000),
    A('vol100k', 'weight', '100 toneladas', 'Levanta 100.000 kg en total', Math.round(volume), 100000),
    A('crea7', 'pill', 'Creatina en vena', '7 días seguidos tomando creatina', streaks.creatine, 7),
    A('crea30', 'pill', 'Saturado', '30 días tomando creatina', streaks.creatineDays, 30),
    A('prot7', 'beef', 'Proteína al día', 'Llega a tu proteína 7 días', streaks.proteinDays, 7),
    A('water7', 'droplet', 'Bien hidratado', 'Cumple el objetivo de agua 7 días', streaks.waterDays, 7),
    A('photo1', 'camera', 'Foto del antes', 'Sube tu primera foto de progreso', photos, 1),
    A('measure1', 'ruler', 'Punto de partida', 'Registra tus primeras medidas', metrics, 1),
    A('goal1', 'target', 'Objetivo cumplido', 'Completa un objetivo', goalsDone, 1),
    A('comeback', 'rotate', 'Vuelta al ruedo', 'Vuelve a entrenar tras 10 días parado', comeback, 1),
    A('early', 'sunrise', 'Madrugador', 'Entrena antes de las 9:00', earlyBird, 1),
  ];
}

export function monthSummary(userId, today) {
  const mStart = today.slice(0, 8) + '01';
  const prevStart = (() => {
    const d = fromKey(mStart);
    d.setUTCMonth(d.getUTCMonth() - 1);
    return toKey(d);
  })();
  const cur = get('SELECT COUNT(*) n, COALESCE(SUM(total_volume),0) v, COALESCE(SUM(prs),0) p FROM workouts WHERE user_id = ? AND date >= ? AND date <= ?', userId, mStart, today);
  const prev = get('SELECT COUNT(*) n, COALESCE(SUM(total_volume),0) v FROM workouts WHERE user_id = ? AND date >= ? AND date < ?', userId, prevStart, mStart);
  const wFirst = get('SELECT weight FROM body_metrics WHERE user_id = ? AND weight IS NOT NULL AND date < ? ORDER BY date DESC LIMIT 1', userId, mStart)?.weight
    ?? get('SELECT weight FROM body_metrics WHERE user_id = ? AND weight IS NOT NULL AND date >= ? ORDER BY date LIMIT 1', userId, mStart)?.weight;
  const wLast = get('SELECT weight FROM body_metrics WHERE user_id = ? AND weight IS NOT NULL AND date <= ? ORDER BY date DESC LIMIT 1', userId, today)?.weight;
  return {
    workouts: cur.n, volume: Math.round(cur.v), prs: cur.p,
    prevWorkouts: prev.n, prevVolume: Math.round(prev.v),
    weightChange: wFirst != null && wLast != null ? Math.round((wLast - wFirst) * 10) / 10 : null,
  };
}

export function dayNutrition(userId, date) {
  return get(
    `SELECT COALESCE(SUM(kcal),0) kcal, COALESCE(SUM(protein),0) protein, COALESCE(SUM(carbs),0) carbs, COALESCE(SUM(fat),0) fat
     FROM food_entries WHERE user_id = ? AND date = ?`, userId, date,
  );
}
