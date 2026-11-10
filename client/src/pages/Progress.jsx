import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Flame, ChevronLeft, ChevronRight, Plus, Camera, Trash2, Columns2, Lock, Shield } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast } from '../lib/store.jsx';
import { today, addDays, fmtDate, monthLabel, n0, n1, DAY_SHORT, isoDow, fromKey, toKey, weekStart, compressImage } from '../lib/format.js';
import { PageHeader, Card, Segmented, Ring, Bar, Button, Sheet, Field, Icon, Loading, ErrorState, Empty, Delta, Chip, IconButton, useConfirm } from '../components/ui.jsx';
import { LineChart, BarChart } from '../components/charts.jsx';
import { WeightSheet } from '../components/quick.jsx';

export default function Progress() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'constancia';
  return (
    <div className="page">
      <PageHeader title="Progreso" />
      <Segmented value={tab} onChange={(t) => setParams(t === 'constancia' ? {} : { tab: t }, { replace: true })}
        options={[{ value: 'constancia', label: 'Constancia' }, { value: 'cuerpo', label: 'Cuerpo' }, { value: 'fuerza', label: 'Fuerza' }, { value: 'fotos', label: 'Fotos' }]} />
      <div className="mt">
        {tab === 'constancia' && <Consistency />}
        {tab === 'cuerpo' && <Body />}
        {tab === 'fuerza' && <Strength />}
        {tab === 'fotos' && <Photos />}
      </div>
    </div>
  );
}

// ── Constancia ──────────────────────────────────────────
function Consistency() {
  const t = today();
  const { data: d, error, loading, reload } = useData(`/stats/consistency?today=${t}`);
  const dates = useData('/workouts/dates');
  const habits = useData(`/habits?from=${addDays(t, -27)}&to=${t}`);
  const [month, setMonth] = useState(t.slice(0, 7));
  if (loading && !d) return <Loading />;
  if (error && !d) return <ErrorState error={error} retry={reload} />;
  const c = d.consistency;
  const wset = new Map((dates.data || []).map((w) => [w.date, w]));

  const msg = c.streak > 0
    ? `Llevas ${c.streak} ${c.streak === 1 ? 'semana' : 'semanas'} cumpliendo tu objetivo de ${c.goal} entrenos.`
    : c.totalWorkouts > 0 ? `Llevas ${c.totalWorkouts} entrenos en total. Cumple ${c.goal} esta semana para empezar una nueva racha.` : 'Completa tu primera semana para empezar tu racha.';

  return (
    <div className="stack">
      <Card className="streak-hero">
        <div className="streak-flame"><Flame size={34} /></div>
        <div className="grow">
          <div className="big-number">{c.streak}<small> {c.streak === 1 ? 'semana' : 'semanas'}</small></div>
          <p className="small" style={{ margin: 0 }}>{msg}</p>
          <p className="muted small" style={{ margin: '6px 0 0' }}>Mejor racha: {c.best} · Esta semana: {c.thisWeek}/{c.goal}</p>
        </div>
      </Card>
      <Card className="token-card">
        <Shield size={20} />
        <div className="grow">
          <strong>{c.tokens} comodín{c.tokens === 1 ? '' : 'es'} disponible{c.tokens === 1 ? '' : 's'}</strong>
          <span className="muted small">Ganas uno cada 4 semanas cumplidas (máx. 2). Si una semana no llegas, se usa solo y tu racha sigue viva.</span>
        </div>
      </Card>

      <div className="stat-row">
        <Card className="stat"><Ring value={d.adherence.pct} max={100} size={44} stroke={5} /><strong>{d.adherence.pct}%</strong><span>cumplimiento total</span></Card>
        <Card className="stat"><Ring value={d.adherence30.pct} max={100} size={44} stroke={5} color="var(--c-water)" /><strong>{d.adherence30.pct}%</strong><span>últimos 30 días</span></Card>
        <Card className="stat"><strong className="stat-big">{c.totalWorkouts}</strong><span>entrenos totales</span></Card>
      </div>

      <Card>
        <div className="row between">
          <IconButton label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={20} /></IconButton>
          <h3 className="card-title cap" style={{ margin: 0 }}>{monthLabel(`${month}-01`)}</h3>
          <IconButton label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= t.slice(0, 7)}><ChevronRight size={20} /></IconButton>
        </div>
        <MonthCalendar month={month} today={t} workouts={wset} />
        <div className="cal-legend small muted"><span><i className="cal-dot done" /> Entreno</span><span><i className="cal-dot today" /> Hoy</span></div>
      </Card>

      <Card>
        <h3 className="card-title">Entrenos por semana</h3>
        <BarChart height={130} target={c.goal}
          data={c.weeks.map((w) => ({ label: fmtDate(w.week).split(' ')[0], value: w.count, tip: `Semana del ${fmtDate(w.week)}: ${w.count} entrenos${w.status === 'saved' ? ' (comodín)' : ''}`, dim: w.status === 'missed' || w.status === 'intro' }))}
          unit="entrenos" format={n0} />
        <p className="muted small chart-legend"><span className="legend-line" /> Objetivo semanal: {c.goal}</p>
      </Card>

      <Card>
        <h3 className="card-title">Rachas diarias</h3>
        <div className="mini-streaks">
          <div><Icon name="pill" size={18} /><strong>{d.streaks.creatine}</strong><span>días creatina</span></div>
          <div><Icon name="beef" size={18} /><strong>{d.streaks.protein}</strong><span>días proteína</span></div>
          <div><Icon name="droplet" size={18} /><strong>{d.streaks.water}</strong><span>días agua</span></div>
        </div>
      </Card>

      {habits.data?.habits?.length > 0 && <HabitGrid data={habits.data} t={t} />}

      <div className="section-head"><h2>Logros</h2><span className="muted small">{d.achievements.filter((a) => a.unlocked).length}/{d.achievements.length}</span></div>
      <div className="ach-grid">
        {d.achievements.map((a) => (
          <div key={a.id} className={`ach ${a.unlocked ? 'unlocked' : ''}`}>
            <span className="ach-icon">{a.unlocked ? <Icon name={a.icon} size={22} /> : <Lock size={18} />}</span>
            <strong>{a.title}</strong>
            <span className="muted small">{a.desc}</span>
            {!a.unlocked && <Bar value={a.value} max={a.target} height={4} />}
            {!a.unlocked && <span className="ach-progress">{n0(a.value)}/{n0(a.target)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function shiftMonth(m, delta) {
  const d = fromKey(`${m}-01`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return toKey(d).slice(0, 7);
}

function MonthCalendar({ month, today: t, workouts }) {
  const nav = useNavigate();
  const first = `${month}-01`;
  const start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)).filter((d, i) => i < 35 || d.slice(0, 7) === month);
  return (
    <div className="calendar">
      {DAY_SHORT.map((d) => <span key={d} className="cal-h">{d}</span>)}
      {cells.map((d) => {
        const w = workouts.get(d);
        const inMonth = d.slice(0, 7) === month;
        return (
          <button key={d} type="button" className={`cal-d ${inMonth ? '' : 'out'} ${w ? 'done' : ''} ${d === t ? 'today' : ''}`}
            onClick={() => w && nav(`/entreno/historial/${w.id}`)} disabled={!w} aria-label={`${fmtDate(d)}${w ? `: ${w.routine_name}` : ''}`}>
            {Number(d.slice(8))}
          </button>
        );
      })}
    </div>
  );
}

function HabitGrid({ data, t }) {
  const days = Array.from({ length: 28 }, (_, i) => addDays(t, i - 27));
  const set = new Set(data.logs.map((l) => `${l.habit_id}|${l.date}`));
  return (
    <Card>
      <h3 className="card-title">Hábitos · últimas 4 semanas</h3>
      <div className="habit-grid">
        {data.habits.map((h) => {
          const n = days.filter((d) => set.has(`${h.id}|${d}`)).length;
          return (
            <div key={h.id} className="habit-grid-row">
              <span className="habit-grid-name"><Icon name={h.icon} size={14} /> {h.name}</span>
              <div className="habit-grid-cells">{days.map((d) => <i key={d} className={set.has(`${h.id}|${d}`) ? 'on' : ''} title={fmtDate(d)} />)}</div>
              <span className="muted small">{Math.round((n / 28) * 100)}%</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Cuerpo ──────────────────────────────────────────────
const MEASURES = [
  { k: 'weight', l: 'Peso', u: 'kg' },
  { k: 'arm', l: 'Brazo', u: 'cm', up: true },
  { k: 'chest', l: 'Pecho', u: 'cm', up: true },
  { k: 'shoulders', l: 'Hombros', u: 'cm', up: true },
  { k: 'waist', l: 'Cintura', u: 'cm', up: false },
  { k: 'hips', l: 'Cadera', u: 'cm' },
  { k: 'thigh', l: 'Muslo', u: 'cm', up: true },
  { k: 'calf', l: 'Gemelo', u: 'cm', up: true },
  { k: 'body_fat', l: '% grasa', u: '%', up: false },
];

function Body() {
  const { data, error, loading, reload } = useData('/body/metrics');
  const [metric, setMetric] = useState('weight');
  const [range, setRange] = useState('all');
  const [sheet, setSheet] = useState(null);
  const toast = useToast();
  const [confirmEl, ask] = useConfirm();
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} retry={reload} />;

  const M = MEASURES.find((m) => m.k === metric);
  const from = range === 'all' ? '0000' : addDays(today(), range === '1m' ? -30 : -90);
  const series = data.filter((r) => r[metric] != null && r.date >= from).map((r) => ({ x: r.date, y: r[metric] }));
  const firstOf = (k) => data.find((r) => r[k] != null);
  const lastOf = (k) => [...data].reverse().find((r) => r[k] != null);

  const del = async (r) => {
    if (!(await ask({ title: `¿Borrar registro del ${fmtDate(r.date)}?`, confirm: 'Borrar', danger: true }))) return;
    try { await api.del(`/body/metrics/${r.id}`); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="stack">
      <div className="grid-2">
        <Button onClick={() => setSheet('weight')}><Plus size={16} /> Peso</Button>
        <Button variant="secondary" onClick={() => setSheet('measures')}><Plus size={16} /> Medidas</Button>
      </div>

      <div className="measure-grid">
        {MEASURES.map((m) => {
          const last = lastOf(m.k);
          const first = firstOf(m.k);
          return (
            <button key={m.k} type="button" className={`measure ${metric === m.k ? 'active' : ''}`} onClick={() => setMetric(m.k)}>
              <span className="muted small">{m.l}</span>
              <strong>{last ? n1(last[m.k]) : '–'}<small> {m.u}</small></strong>
              {last && first && last !== first ? <Delta value={last[m.k] - first[m.k]} unit={m.u} invert={m.up === false} /> : <span className="delta delta-flat">&nbsp;</span>}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="row between">
          <h3 className="card-title">{M.l}</h3>
          <div className="chips">{[['1m', '1M'], ['3m', '3M'], ['all', 'Todo']].map(([v, l]) => <Chip key={v} active={range === v} onClick={() => setRange(v)}>{l}</Chip>)}</div>
        </div>
        <LineChart data={series} unit={M.u} color={metric === 'weight' ? 'var(--accent)' : 'var(--c-water)'} />
        {series.length >= 2 && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            {fmtDate(series[0].x)} → {fmtDate(series[series.length - 1].x)}: <Delta value={series[series.length - 1].y - series[0].y} unit={M.u} invert={M.up === false} />
            {metric === 'weight' && (() => {
              const weeks = (fromKey(series[series.length - 1].x) - fromKey(series[0].x)) / (7 * 864e5);
              return weeks >= 2 ? <> · {n1((series[series.length - 1].y - series[0].y) / weeks)} kg/semana (ideal en volumen: +0,2 a +0,4)</> : null;
            })()}
          </p>
        )}
      </Card>

      <div className="section-head"><h2>Registros</h2></div>
      {data.length ? (
        <div className="list-card">
          {[...data].reverse().slice(0, 40).map((r) => (
            <div key={r.id} className="list-row">
              <div className="grow">
                <strong>{fmtDate(r.date, { weekday: true, year: true })}</strong>
                <span className="muted small">{MEASURES.filter((m) => r[m.k] != null).map((m) => `${m.l} ${n1(r[m.k])}${m.u === '%' ? '%' : ''}`).join(' · ')}</span>
              </div>
              <IconButton label="Borrar" onClick={() => del(r)}><Trash2 size={16} /></IconButton>
            </div>
          ))}
        </div>
      ) : <Empty icon="ruler" title="Sin registros" text="Registra tu peso y medidas cada 2-4 semanas para ver tu evolución." />}

      <WeightSheet open={sheet === 'weight'} onClose={() => setSheet(null)} onSaved={reload} initial={lastOf('weight')?.weight} />
      <MeasuresSheet open={sheet === 'measures'} onClose={() => setSheet(null)} onSaved={reload} last={data[data.length - 1]} />
      {confirmEl}
    </div>
  );
}

function MeasuresSheet({ open, onClose, onSaved, last }) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [v, setV] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setDate(today()); setV({}); } }, [open]);
  const save = async () => {
    const body = { date };
    for (const m of MEASURES) if (v[m.k]) body[m.k] = Number(String(v[m.k]).replace(',', '.'));
    setBusy(true);
    try { await api.post('/body/metrics', body); toast('Medidas guardadas'); onSaved(); onClose(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar medidas" tall>
      <div className="stack">
        <Field label="Fecha"><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
        <div className="grid-2">
          {MEASURES.map((m) => (
            <Field key={m.k} label={m.l} suffix={m.u}>
              <input inputMode="decimal" value={v[m.k] || ''} placeholder={last?.[m.k] != null ? n1(last[m.k]) : ''} onChange={(e) => setV({ ...v, [m.k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <p className="muted small">Mide siempre en las mismas condiciones: por la mañana, relajado, cinta sin apretar. Brazo: contraído en la parte más ancha. Cintura: a la altura del ombligo.</p>
        <Button block size="lg" onClick={save} loading={busy} disabled={!Object.values(v).some(Boolean)}>Guardar</Button>
      </div>
    </Sheet>
  );
}

// ── Fuerza ──────────────────────────────────────────────
function Strength() {
  const keys = useData('/exercise-keys');
  const [key, setKey] = useState(null);
  const [metric, setMetric] = useState('e1rm');
  const sel = key || keys.data?.[0]?.key;
  const prog = useData(sel ? `/exercise-progress?key=${encodeURIComponent(sel)}` : null);
  const workouts = useData('/workouts?limit=120');
  const weekly = useMemo(() => {
    if (!workouts.data) return [];
    const ws = weekStart(today());
    return Array.from({ length: 12 }, (_, i) => {
      const w = addDays(ws, (i - 11) * 7);
      const vol = workouts.data.filter((x) => weekStart(x.date) === w).reduce((a, x) => a + x.total_volume, 0);
      return { label: fmtDate(w).split(' ')[0], value: Math.round(vol / 100) / 10, tip: `Semana del ${fmtDate(w)}: ${n0(vol)} kg` };
    });
  }, [workouts.data]);

  if (keys.loading && !keys.data) return <Loading />;
  if (!keys.data?.length) return <Empty icon="dumbbell" title="Aún no hay datos de fuerza" text="Completa entrenos y aquí verás cómo suben tus marcas en cada ejercicio." />;
  const p = prog.data || [];
  const last = p[p.length - 1];
  const first = p[0];
  const best = p.reduce((a, x) => Math.max(a, x.top_weight || 0), 0);
  const M = { e1rm: ['1RM estimado', 'kg'], top_weight: ['Peso máximo', 'kg'], volume: ['Volumen por sesión', 'kg'], max_reps: ['Repeticiones máx.', 'reps'] }[metric];

  return (
    <div className="stack">
      <Field label="Ejercicio">
        <select value={sel} onChange={(e) => setKey(e.target.value)}>
          {keys.data.map((k) => <option key={k.key} value={k.key}>{k.name} ({k.sessions})</option>)}
        </select>
      </Field>
      <div className="stat-row">
        <Card className="stat"><strong>{last ? n1(last.e1rm) : '–'}</strong><span>1RM estimado</span>{first && last && first !== last && <Delta value={last.e1rm - first.e1rm} unit="kg" />}</Card>
        <Card className="stat"><strong>{n1(best)}</strong><span>mejor peso (kg)</span></Card>
        <Card className="stat"><strong>{p.length}</strong><span>sesiones</span></Card>
      </div>
      <Card>
        <div className="chips scroll-x">{[['e1rm', '1RM est.'], ['top_weight', 'Peso máx.'], ['volume', 'Volumen'], ['max_reps', 'Reps']].map(([v, l]) => <Chip key={v} active={metric === v} onClick={() => setMetric(v)}>{l}</Chip>)}</div>
        <h3 className="card-title mt">{M[0]}</h3>
        <LineChart data={p.map((x) => ({ x: x.date, y: x[metric] }))} unit={M[1]} />
        <p className="muted small" style={{ marginBottom: 0 }}>1RM estimado con la fórmula de Epley a partir de tu mejor serie de cada sesión. No necesitas probar tu máximo real.</p>
      </Card>
      <Card>
        <h3 className="card-title">Volumen semanal total (toneladas)</h3>
        <BarChart data={weekly} unit="t" />
      </Card>
    </div>
  );
}

// ── Fotos ───────────────────────────────────────────────
function Photos() {
  const { data, error, loading, reload } = useData('/body/photos');
  const toast = useToast();
  const fileRef = useRef(null);
  const [pose, setPose] = useState('frente');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [compare, setCompare] = useState(false);
  const [pick, setPick] = useState([]);
  const [confirmEl, ask] = useConfirm();

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const image = await compressImage(file);
      await api.post('/body/photos', { date: today(), pose, image });
      toast('Foto guardada');
      reload();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const del = async (p) => {
    if (!(await ask({ title: '¿Borrar esta foto?', confirm: 'Borrar', danger: true }))) return;
    try { await api.del(`/body/photos/${p.id}`); setView(null); reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const togglePick = (p) => setPick((x) => (x.find((y) => y.id === p.id) ? x.filter((y) => y.id !== p.id) : [...x.slice(-1), p]));

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} retry={reload} />;

  return (
    <div className="stack">
      <Card>
        <span className="field-label">Nueva foto</span>
        <Segmented value={pose} onChange={setPose} options={[{ value: 'frente', label: 'Frente' }, { value: 'lado', label: 'Lado' }, { value: 'espalda', label: 'Espalda' }]} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
        <Button block className="mt" loading={busy} onClick={() => fileRef.current?.click()}><Camera size={17} /> Hacer o subir foto</Button>
        <p className="muted small" style={{ marginBottom: 0 }}>Misma luz, misma hora y misma postura cada 2-4 semanas. Las fotos son privadas: solo tú puedes verlas.</p>
      </Card>

      {data.length >= 2 && (
        <Button variant={compare ? 'primary' : 'secondary'} block onClick={() => { setCompare(!compare); setPick([]); }}>
          <Columns2 size={16} /> {compare ? 'Elige 2 fotos para comparar' : 'Comparar fotos'}
        </Button>
      )}

      {data.length ? (
        <div className="photo-grid">
          {data.map((p) => {
            const picked = pick.findIndex((x) => x.id === p.id);
            return (
              <button key={p.id} type="button" className={`photo ${picked >= 0 ? 'picked' : ''}`} onClick={() => (compare ? togglePick(p) : setView(p))}>
                <img src={`/api/body/photos/${p.id}/file`} alt={`Foto de ${p.pose} del ${fmtDate(p.date)}`} loading="lazy" />
                <span className="photo-cap">{fmtDate(p.date)} · {p.pose}</span>
                {picked >= 0 && <span className="photo-num">{picked + 1}</span>}
              </button>
            );
          })}
        </div>
      ) : <Empty icon="camera" title="Sin fotos todavía" text="Hazte hoy la foto del “antes”. Dentro de unos meses te alegrarás de tenerla." />}

      <Sheet open={!!view} onClose={() => setView(null)} title={view ? `${fmtDate(view.date, { year: true })} · ${view.pose}` : ''} tall>
        {view && (
          <div className="stack">
            <img className="photo-full" src={`/api/body/photos/${view.id}/file`} alt="" />
            <Button variant="danger" block onClick={() => del(view)}><Trash2 size={16} /> Borrar foto</Button>
          </div>
        )}
      </Sheet>
      <Sheet open={compare && pick.length === 2} onClose={() => setPick([])} title="Comparación" tall>
        {pick.length === 2 && <CompareSlider a={[...pick].sort((x, y) => (x.date < y.date ? -1 : 1))[0]} b={[...pick].sort((x, y) => (x.date < y.date ? -1 : 1))[1]} />}
      </Sheet>
      {confirmEl}
    </div>
  );
}

function CompareSlider({ a, b }) {
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState('slider');
  return (
    <div className="stack">
      <Segmented value={mode} onChange={setMode} options={[{ value: 'slider', label: 'Deslizar' }, { value: 'side', label: 'Lado a lado' }]} />
      {mode === 'slider' ? (
        <>
          <div className="compare">
            <img src={`/api/body/photos/${b.id}/file`} alt="Después" />
            <div className="compare-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
              <img src={`/api/body/photos/${a.id}/file`} alt="Antes" />
            </div>
            <div className="compare-line" style={{ left: `${pos}%` }} />
            <span className="compare-tag l">{fmtDate(a.date, { year: true })}</span>
            <span className="compare-tag r">{fmtDate(b.date, { year: true })}</span>
          </div>
          <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Comparar" className="range" />
        </>
      ) : (
        <div className="grid-2">
          {[a, b].map((p) => (
            <figure key={p.id} className="side-photo">
              <img src={`/api/body/photos/${p.id}/file`} alt="" />
              <figcaption>{fmtDate(p.date, { year: true })}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
