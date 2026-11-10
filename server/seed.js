import { all, get, run, tx } from './db.js';
import { EXERCISE_MAP } from './data/exercises.js';
import { DEFAULT_ROUTINES, DEFAULT_HABITS, DEFAULT_FOODS } from './data/defaults.js';

/** Global food database (user_id NULL). Idempotent. */
export function seedFoods() {
  const n = get('SELECT COUNT(*) n FROM foods WHERE user_id IS NULL').n;
  if (n > 0) return;
  tx(() => {
    for (const [name, category, kcal, protein, carbs, fat, unit_label, unit_g] of DEFAULT_FOODS) {
      run('INSERT INTO foods (user_id, name, category, kcal, protein, carbs, fat, unit_label, unit_g) VALUES (NULL,?,?,?,?,?,?,?,?)',
        name, category, kcal, protein, carbs, fat, unit_label, unit_g);
    }
  });
}

/** Insert a routine exercise from the library or a custom definition. */
export function insertRoutineExercise(userId, routineId, def, position) {
  const lib = def.library_id ? EXERCISE_MAP[def.library_id] : null;
  return run(
    `INSERT INTO routine_exercises (routine_id, user_id, library_id, name, muscles, sets, reps_min, reps_max, rest_sec, weight, tips, video_url, image, notes, position)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    routineId, userId, lib?.id ?? null,
    def.name ?? lib?.name ?? 'Ejercicio',
    def.muscles ?? lib?.muscles ?? null,
    def.sets ?? lib?.sets ?? 3,
    def.reps_min ?? lib?.reps_min ?? 8,
    def.reps_max ?? lib?.reps_max ?? 12,
    def.rest_sec ?? lib?.rest_sec ?? 90,
    def.weight ?? 0,
    def.tips ?? (lib ? lib.tips.join('\n') : null),
    def.video_url ?? lib?.video ?? null,
    def.image ?? lib?.img ?? null,
    def.notes ?? null,
    position,
  ).lastInsertRowid;
}

/** Create the beginner A/B/C programme for a user, mapped onto their training days. */
export function createDefaultRoutines(userId, trainingDays = [1, 2, 4]) {
  const days = [...trainingDays].sort((a, b) => a - b);
  tx(() => {
    const base = get('SELECT COALESCE(MAX(position), -1) p FROM routines WHERE user_id = ?', userId).p + 1;
    DEFAULT_ROUTINES.forEach((r, i) => {
      const rid = run('INSERT INTO routines (user_id, name, subtitle, day_of_week, color, position) VALUES (?,?,?,?,?,?)',
        userId, r.name, r.subtitle, days[i] ?? null, r.color, base + i).lastInsertRowid;
      r.exercises.forEach((e, j) => insertRoutineExercise(userId, rid, {
        library_id: e.id, sets: e.sets, reps_min: e.reps_min, reps_max: e.reps_max, rest_sec: e.rest,
      }, j));
    });
  });
}

export function createDefaultHabits(userId) {
  if (all('SELECT id FROM habits WHERE user_id = ?', userId).length) return;
  DEFAULT_HABITS.forEach((hb, i) => run('INSERT INTO habits (user_id, name, icon, position) VALUES (?,?,?,?)', userId, hb.name, hb.icon, i));
}
