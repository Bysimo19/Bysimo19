import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Play, Check, Trophy, Target, Plus, Scale, CircleCheck, Circle, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useData, useToast, useWorkout } from '../lib/store.jsx';
import { today, relDay, greeting, n0, n1, addDays, DAY_SHORT, fmtDate, durationWords, daysBetween } from '../lib/format.js';
import { startWorkout } from '../lib/workout.js';
import { Card, Ring, Bar, Delta, Icon, Loading, ErrorState, Button } from '../components/ui.jsx';
import { Sparkline } from '../components/charts.jsx';
import { WeightSheet, CreatineCard, WaterCard, SleepSheet, SleepCard, ShakeSheet } from '../components/quick.jsx';

function motivation(d) {
  const c = d.consistency;
  if (c.totalWorkouts === 0) return 'El primer entreno es el más difícil. Hoy empieza todo.';
  const last = c.weeks[c.weeks.length - 2];
  const since = c.lastWorkout ? daysBetween(c.lastWorkout, d.today) : 0;
  if (since >= 7) return `Llevas ${since} días sin entrenar. No pasa nada: ${c.totalWorkouts} entrenos siguen contando. Vuelve hoy, aunque sea suave.`;
  if (last?.status === 'missed') return `Una semana floja no borra ${c.totalWorkouts} entrenos. Lo que cuenta es volver.`;
  if (last?.status === 'saved') return 'Usaste un comodín la semana pasada y tu racha sigue viva. ¡A por esta!';
  if (c.thisWeek >= c.goal) return 'Objetivo semanal cumplido. Descansa bien, come bien y repite.';
  if (c.streak >= 2) return `${c.streak} semanas seguidas cumpliendo. Esto ya es un hábito.`;
  return 'Constancia antes que perfección. Un entreno cada vez.';
}

export default function Dashboard() {
  const { user } = useAuth();
  const t = today();
  const { data: d, error, loading, reload, setData } = useData(`/dashboard?today=${t}`);
  const { draft, setDraft } = useWorkout();
  const nav = useNavigate();
  const toast = useToast();
  const [sheet, setSheet] = useState(null);
  const [starting, setStarting] = useState(false);

  if (loading && !d) return <div className="page"><Loading /></div>;
  if (error && !d) return <div className="page"><ErrorState error={error} retry={reload} /></div>;

  const p = d.profile;
  const setDay = (day) => setData((x) => ({ ...x, day }));

  const start = async () => {
    if (draft) return nav('/entreno/sesion');
    setStarting(true);
    try {
      const routines = await api.get('/routines');
      const rt = routines.find((r) => r.id === d.next.routine.id);
      await startWorkout(rt, setDraft);
      nav('/entreno/sesion');
    } catch (e) { toast(e.message, 'error'); setStarting(false); }
  };

  const toggleHabit = async (hb) => {
    setData((x) => ({ ...x, habits: x.habits.map((y) => (y.id === hb.id ? { ...y, done: !y.done } : y)) }));
    try { await api.post(`/habits/${hb.id}/toggle`, { date: t }); } catch (e) { toast(e.message, 'error'); reload(); }
  };

  const weights = d.weights;
  const lastW = weights[weights.length - 1];
  const firstW = weights[0];
  const nut = d.nutrition;
  const c = d.consistency;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(d.week.start, i));
  const isToday = d.next?.inDays === 0;

  return (
    <div className="page dashboard">
      <header className="dash-head">
        <div>
          <p className="eyebrow">{fmtDate(t, { weekday: true })}</p>
          <h1>{greeting()}, {user.name.split(' ')[0]}</h1>
        </div>
        <Link to="/mas" className="avatar" aria-label="Perfil">{user.name[0]?.toUpperCase()}</Link>
      </header>

      <p className="motivation"><Sparkles size={15} /> {motivation(d)}</p>

      {/* Próximo entreno */}
      {d.doneToday.length > 0 && (
        <Card className="done-today" onClick={() => nav(`/entreno/historial/${d.doneToday[0].id}`)}>
          <span className="done-check"><Check size={22} /></span>
          <div className="grow">
            <strong>{d.doneToday[0].routine_name} completado</strong>
            <span className="muted small">{durationWords(d.doneToday[0].duration_sec)} · {n0(d.doneToday[0].total_volume)} kg{d.doneToday[0].prs ? ` · ${d.doneToday[0].prs} récord${d.doneToday[0].prs > 1 ? 's' : ''} 🏆` : ''}</span>
          </div>
          <ChevronRight size={18} className="muted" />
        </Card>
      )}
      {d.next ? (
        <Card className="hero-workout" style={{ '--rc': (draft ? draft.color : d.next.routine.color) || 'var(--accent)' }}>
          <div className="hero-top">
            <span className="hero-when">{draft ? 'En curso' : isToday ? 'Hoy toca' : `Próximo · ${relDay(d.next.date, t)}`}</span>
            <span className="hero-count">{draft ? `${draft.exercises.length} ejercicios` : `${d.next.routine.exercises} ejercicios`}</span>
          </div>
          <h2>{draft ? draft.routine_name : d.next.routine.name}</h2>
          <p>{draft ? 'Tienes un entreno sin finalizar. Tus series están guardadas en este dispositivo.' : d.next.routine.subtitle}</p>
          <div className="hero-actions">
            <Button size="lg" onClick={start} loading={starting}>
              <Play size={18} fill="currentColor" /> {draft ? 'Continuar entreno' : isToday ? 'Empezar entreno' : 'Entrenar ahora'}
            </Button>
            {!draft && <Button variant="glass" size="lg" onClick={() => nav(`/entreno/rutina/${d.next.routine.id}`)}>Ver</Button>}
          </div>
        </Card>
      ) : (
        <Card className="hero-workout">
          <h2>Crea tu primera rutina</h2>
          <p>Elige ejercicios o genera la rutina recomendada para principiantes.</p>
          <div className="hero-actions"><Button size="lg" onClick={() => nav('/entreno')}>Ir a rutinas</Button></div>
        </Card>
      )}

      {/* Semana */}
      <Card className="week-card" onClick={() => nav('/progreso')}>
        <div className="row between">
          <h3 className="card-title">Esta semana</h3>
          <span className="muted small"><strong className="text">{c.thisWeek}</strong> / {c.goal} entrenos</span>
        </div>
        <div className="week-strip">
          {weekDays.map((day, i) => {
            const done = d.week.workouts.some((w) => w.date === day);
            const planned = d.week.planned.includes(i + 1);
            const cls = done ? 'done' : planned ? (day < t ? 'missed' : 'planned') : 'rest';
            return (
              <div key={day} className={`week-day ${cls} ${day === t ? 'today' : ''}`}>
                <span>{DAY_SHORT[i]}</span>
                <i>{done ? <Check size={14} strokeWidth={3} /> : null}</i>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Constancia */}
      <div className="stat-row">
        <Card className="stat" onClick={() => nav('/progreso')}>
          <Flame size={20} className="c-flame" />
          <strong>{c.streak}</strong>
          <span>{c.streak === 1 ? 'semana' : 'semanas'} de racha</span>
          {c.tokens > 0 && <em className="token">🛡 {c.tokens} comodín{c.tokens > 1 ? 'es' : ''}</em>}
        </Card>
        <Card className="stat" onClick={() => nav('/progreso')}>
          <Ring value={d.adherence.pct} max={100} size={40} stroke={5} color="var(--accent)" />
          <strong>{d.adherence.pct}%</strong>
          <span>entrenos cumplidos</span>
        </Card>
        <Card className="stat" onClick={() => nav('/entreno/historial')}>
          <Trophy size={20} className="c-gold" />
          <strong>{c.totalWorkouts}</strong>
          <span>entrenos totales</span>
        </Card>
      </div>

      {/* Nutrición */}
      <Card className="nutri-card">
        <div className="row between">
          <h3 className="card-title">Nutrición de hoy</h3>
          <Link to="/nutricion" className="link-sm">Abrir <ChevronRight size={14} /></Link>
        </div>
        <div className="nutri-main">
          <Ring value={nut.totals.kcal} max={nut.targets.kcal || 1} size={96} stroke={9} color="var(--c-kcal)">
            <strong>{n0(nut.totals.kcal)}</strong>
            <span>/ {n0(nut.targets.kcal)} kcal</span>
          </Ring>
          <div className="nutri-macros">
            <MacroBar label="Proteína" v={nut.totals.protein} t={nut.targets.protein} color="var(--c-protein)" />
            <MacroBar label="Carbohidratos" v={nut.totals.carbs} t={nut.targets.carbs} color="var(--c-carbs)" />
            <MacroBar label="Grasas" v={nut.totals.fat} t={nut.targets.fat} color="var(--c-fat)" />
          </div>
        </div>
        <div className="quick-grid">
          <CreatineCard day={d.day} dose={p.creatine_dose_g} streak={d.streaks.creatine} onChange={(day) => { setDay(day); reload(); }} />
          <button type="button" className="quick-card shake" onClick={() => setSheet('shake')}>
            <span className="quick-icon"><Plus size={20} /></span>
            <span className="quick-text"><strong>Batido</strong><span>Añadir proteína</span></span>
          </button>
        </div>
      </Card>

      <div className="stack-sm">
        <WaterCard day={d.day} target={p.water_target_ml} onChange={setDay} />
        <SleepCard day={d.day} target={p.sleep_target_h} onClick={() => setSheet('sleep')} />
      </div>

      {/* Peso */}
      <Card className="weight-card" onClick={() => nav('/progreso?tab=cuerpo')}>
        <div className="row between">
          <h3 className="card-title">Peso corporal</h3>
          <button type="button" className="link-sm" onClick={(e) => { e.stopPropagation(); setSheet('weight'); }}><Scale size={14} /> Registrar</button>
        </div>
        <div className="row between align-end">
          <div>
            <div className="big-number">{lastW ? n1(lastW.weight) : '–'}<small> kg</small></div>
            {lastW && firstW && lastW !== firstW && <span className="small"><Delta value={lastW.weight - firstW.weight} unit="kg" /> <span className="muted">desde {fmtDate(firstW.date)}</span></span>}
            {lastW && <p className="muted small" style={{ margin: '2px 0 0' }}>Último: {relDay(lastW.date, t).toLowerCase()}</p>}
          </div>
          <Sparkline values={weights.map((w) => w.weight)} width={120} height={44} />
        </div>
      </Card>

      {/* Mes */}
      <Card>
        <h3 className="card-title">Progreso del mes</h3>
        <div className="month-grid">
          <div><strong>{d.month.workouts}</strong><span>entrenos</span><Delta value={d.month.workouts - d.month.prevWorkouts} digits={0} /></div>
          <div><strong>{n0(d.month.volume / 1000)}<small>t</small></strong><span>volumen</span>{d.month.prevVolume > 0 && <Delta value={((d.month.volume - d.month.prevVolume) / d.month.prevVolume) * 100} unit="%" digits={0} />}</div>
          <div><strong>{d.month.prs}</strong><span>récords</span></div>
          <div><strong>{d.month.weightChange != null ? `${d.month.weightChange > 0 ? '+' : ''}${n1(d.month.weightChange)}` : '–'}</strong><span>kg este mes</span></div>
        </div>
      </Card>

      {/* Hábitos */}
      {d.habits.length > 0 && (
        <Card>
          <div className="row between">
            <h3 className="card-title">Hábitos de hoy</h3>
            <span className="muted small">{d.habits.filter((x) => x.done).length}/{d.habits.length}</span>
          </div>
          <div className="habit-list">
            {d.habits.map((hb) => (
              <button key={hb.id} type="button" className={`habit ${hb.done ? 'done' : ''}`} onClick={() => toggleHabit(hb)}>
                <Icon name={hb.icon} size={18} />
                <span>{hb.name}</span>
                {hb.done ? <CircleCheck size={22} className="habit-check" /> : <Circle size={22} className="habit-check" />}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Objetivos */}
      <Card onClick={() => nav('/mas/objetivos')}>
        <div className="row between">
          <h3 className="card-title">Objetivos pendientes</h3>
          <ChevronRight size={18} className="muted" />
        </div>
        {d.goals.length ? (
          <ul className="goal-mini">
            {d.goals.map((g) => (
              <li key={g.id}>
                <Target size={16} />
                <span className="grow">{g.title}</span>
                {g.target_value != null && g.current_value != null && <span className="muted small">{Math.round((g.current_value / g.target_value) * 100)}%</span>}
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Sin objetivos pendientes. Añade uno para tener un rumbo.</p>}
      </Card>

      {/* Logro siguiente */}
      {d.achievements.next && (
        <Card className="ach-next" onClick={() => nav('/progreso')}>
          <span className="ach-icon"><Icon name={d.achievements.next.icon} size={20} /></span>
          <div className="grow">
            <strong>{d.achievements.next.title}</strong>
            <span className="muted small">{d.achievements.next.desc}</span>
            <Bar value={d.achievements.next.value} max={d.achievements.next.target} height={5} />
          </div>
          <span className="muted small">{d.achievements.unlocked}/{d.achievements.total}</span>
        </Card>
      )}

      <WeightSheet open={sheet === 'weight'} onClose={() => setSheet(null)} onSaved={reload} initial={lastW?.weight} />
      <ShakeSheet open={sheet === 'shake'} onClose={() => setSheet(null)} onSaved={reload} />
      <SleepSheet open={sheet === 'sleep'} onClose={() => setSheet(null)} day={d.day} onSaved={setDay} />
    </div>
  );
}

function MacroBar({ label, v, t, color }) {
  return (
    <div className="macro-bar">
      <div className="row between small"><span>{label}</span><span><strong>{n0(v)}</strong><span className="muted"> / {n0(t)} g</span></span></div>
      <Bar value={v} max={t || 1} color={color} />
    </div>
  );
}
