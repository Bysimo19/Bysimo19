import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'forja.db');
export const db = new DatabaseSync(DB_FILE);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex TEXT DEFAULT 'male',
  age INTEGER,
  height_cm REAL,
  start_weight REAL,
  target_weight REAL,
  experience TEXT DEFAULT 'beginner',
  goal TEXT DEFAULT 'muscle',
  activity TEXT DEFAULT 'moderate',
  training_days TEXT NOT NULL DEFAULT '[1,2,4]',
  weekly_goal INTEGER NOT NULL DEFAULT 3,
  kcal_target INTEGER,
  protein_target INTEGER,
  carbs_target INTEGER,
  fat_target INTEGER,
  water_target_ml INTEGER DEFAULT 3000,
  sleep_target_h REAL DEFAULT 8,
  creatine_dose_g REAL DEFAULT 5,
  timezone TEXT DEFAULT 'Europe/Madrid',
  reminders TEXT NOT NULL DEFAULT '{}',
  onboarded INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subtitle TEXT,
  day_of_week INTEGER,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id INTEGER PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id TEXT,
  name TEXT NOT NULL,
  muscles TEXT,
  sets INTEGER NOT NULL DEFAULT 3,
  reps_min INTEGER NOT NULL DEFAULT 8,
  reps_max INTEGER NOT NULL DEFAULT 12,
  rest_sec INTEGER NOT NULL DEFAULT 90,
  weight REAL DEFAULT 0,
  tips TEXT,
  video_url TEXT,
  image TEXT,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rex_routine ON routine_exercises(routine_id);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id INTEGER,
  routine_name TEXT,
  date TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  duration_sec INTEGER DEFAULT 0,
  total_volume REAL DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  prs INTEGER DEFAULT 0,
  feeling INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_exercise_id INTEGER,
  library_id TEXT,
  ex_key TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_wex_user_key ON workout_exercises(user_id, ex_key);

CREATE TABLE IF NOT EXISTS workout_sets (
  id INTEGER PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight REAL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  is_pr INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wsets_wex ON workout_sets(workout_exercise_id);

CREATE TABLE IF NOT EXISTS body_metrics (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  weight REAL, chest REAL, arm REAL, waist REAL, hips REAL, thigh REAL, calf REAL, shoulders REAL, body_fat REAL,
  notes TEXT,
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  pose TEXT DEFAULT 'frente',
  filename TEXT NOT NULL,
  weight REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit_label TEXT,
  unit_g REAL,
  kcal REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_foods_user ON foods(user_id);

CREATE TABLE IF NOT EXISTS food_entries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal TEXT NOT NULL DEFAULT 'comida',
  name TEXT NOT NULL,
  food_id INTEGER,
  grams REAL,
  kcal REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'food',
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fe_user_date ON food_entries(user_id, date);

CREATE TABLE IF NOT EXISTS day_logs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  water_ml INTEGER NOT NULL DEFAULT 0,
  sleep_h REAL,
  creatine_g REAL,
  creatine_at TEXT,
  steps INTEGER,
  energy INTEGER,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'check',
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'otro',
  target_value REAL,
  current_value REAL,
  unit TEXT,
  deadline TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders_sent (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  date TEXT NOT NULL,
  PRIMARY KEY (user_id, kind, date)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

/** Run fn inside a transaction. */
export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

const cache = new Map();
/** Cached prepared statement. */
export function q(sql) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

export const all = (sql, ...p) => q(sql).all(...p);
export const get = (sql, ...p) => q(sql).get(...p);
export const run = (sql, ...p) => q(sql).run(...p);
