import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, Pill, Milk, Soup, Pencil } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth, useData, useToast } from '../lib/store.jsx';
import { today, addDays, relDay, fmtDate, n0, n1, DAY_SHORT, isoDow } from '../lib/format.js';
import { MEALS, macrosFor, mealByTime } from '../lib/nutrition.js';
import { PageHeader, Card, Ring, Bar, Button, Sheet, Field, Segmented, Icon, Loading, ErrorState, IconButton, Chip, useConfirm } from '../components/ui.jsx';
import { BarChart } from '../components/charts.jsx';
import { ShakeSheet, RiceCreamSheet, CreatineCard, WaterCard, MacroLine } from '../components/quick.jsx';

export default function Nutrition() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'comidas';
  const [date, setDate] = useState(today());
  const { data, error, loading, reload, setData } = useData(`/nutrition/day?date=${date}`);
  const { profile } = useAuth();

  const setTab = (t) => setParams(t === 'comidas' ? {} : { tab: t }, { replace: true });

  return (
    <div className="page">
      <PageHeader title="Nutrición" />
      <div className="date-nav">
        <IconButton label="Día anterior" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={22} /></IconButton>
        <button type="button" className="date-nav-label" onClick={() => setDate(today())}>
          <strong>{relDay(date)}</strong>
          <span>{fmtDate(date, { weekday: date !== today() })}</span>
        </button>
        <IconButton label="Día siguiente" onClick={() => setDate(addDays(date, 1))} disabled={date >= today()}><ChevronRight size={22} /></IconButton>
      </div>

      {loading && !data ? <Loading /> : error && !data ? <ErrorState error={error} retry={reload} /> : (
        <>
          <Summary d={data} />
          <Segmented value={tab} onChange={setTab} className="mt" options={[
            { value: 'comidas', label: 'Comidas' }, { value: 'suplementos', label: 'Suplementos' }, { value: 'historial', label: 'Historial' },
          ]} />
          {tab === 'comidas' && <Meals d={data} date={date} reload={reload} />}
          {tab === 'suplementos' && <Supplements d={data} date={date} reload={reload} profile={profile} setDay={(day) => setData((x) => ({ ...x, day }))} />}
          {tab === 'historial' && <HistoryTab date={date} profile={profile} />}
        </>
      )}
    </div>
  );
}

function Summary({ d }) {
  const { totals: t, targets: g } = d;
  const left = (g.kcal || 0) - t.kcal;
  return (
    <Card className="nutri-summary">
      <Ring value={t.kcal} max={g.kcal || 1} size={112} stroke={10} color="var(--c-kcal)">
        <strong>{n0(Math.abs(left))}</strong>
        <span>{left >= 0 ? 'kcal restantes' : 'kcal de más'}</span>
      </Ring>
      <div className="nutri-macros">
        <div className="macro-bar">
          <div className="row between small"><span>Calorías</span><span><strong>{n0(t.kcal)}</strong><span className="muted"> / {n0(g.kcal)}</span></span></div>
          <Bar value={t.kcal} max={g.kcal || 1} color="var(--c-kcal)" />
        </div>
        {[['Proteína', 'protein', 'var(--c-protein)'], ['Carbos', 'carbs', 'var(--c-carbs)'], ['Grasas', 'fat', 'var(--c-fat)']].map(([l, k, c]) => (
          <div className="macro-bar" key={k}>
            <div className="row between small"><span>{l}</span><span><strong>{n0(t[k])}</strong><span className="muted"> / {n0(g[k])} g</span></span></div>
            <Bar value={t[k]} max={g[k] || 1} color={c} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Meals({ d, date, reload }) {
  const toast = useToast();
  const [add, setAdd] = useState(null);
  const [edit, setEdit] = useState(null);
  const [confirmEl, ask] = useConfirm();
  const del = async (e) => {
    if (!(await ask({ title: `¿Borrar ${e.name}?`, confirm: 'Borrar', danger: true }))) return;
    try { await api.del(`/nutrition/entries/${e.id}`); reload(); } catch (err) { toast(err.message, 'error'); }
  };
  return (
    <div className="stack mt">
      {MEALS.map((m) => {
        const items = d.entries.filter((e) => e.meal === m.id);
        const kcal = items.reduce((a, e) => a + e.kcal, 0);
        const prot = items.reduce((a, e) => a + e.protein, 0);
        if (m.id === 'snack' && !items.length) return null;
        return (
          <Card key={m.id} className="meal-card">
            <div className="meal-head">
              <span className="meal-icon"><Icon name={m.icon} size={18} /></span>
              <div className="grow">
                <strong>{m.label}</strong>
                <span className="muted small">{items.length ? `${n0(kcal)} kcal · ${n0(prot)} g proteína` : 'Sin registrar'}</span>
              </div>
              <IconButton label={`Añadir a ${m.label}`} className="add-round" onClick={() => setAdd(m.id)}><Plus size={20} /></IconButton>
            </div>
            {items.length > 0 && (
              <ul className="entry-list">
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="grow entry-main" onClick={() => setEdit(e)}>
                      <span className="entry-name">{e.name}</span>
                      <span className="muted small">{e.grams ? `${n0(e.grams)} g · ` : ''}{n0(e.kcal)} kcal · P {n1(e.protein)} · C {n1(e.carbs)} · G {n1(e.fat)}</span>
                    </button>
                    <IconButton label="Borrar" onClick={() => del(e)}><Trash2 size={16} /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      <Button variant="secondary" block onClick={() => setAdd('snack')}><Plus size={16} /> Añadir snack</Button>
      <AddFoodSheet meal={add} date={date} onClose={() => setAdd(null)} onSaved={reload} />
      <EditEntrySheet entry={edit} onClose={() => setEdit(null)} onSaved={reload} />
      {confirmEl}
    </div>
  );
}

/** Buscar alimento → cantidad → macros. También entrada manual y alimentos propios. */
function AddFoodSheet({ meal, date, onClose, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState('buscar');
  const [q, setQ] = useState('');
  const [foods, setFoods] = useState([]);
  const [recent, setRecent] = useState([]);
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState('');
  const [byUnit, setByUnit] = useState(false);
  const [manual, setManual] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', save: false, grams: '100' });
  const open = !!meal;

  useEffect(() => {
    if (!open) return;
    setSel(null); setQ(''); setMode('buscar');
    api.get('/foods').then(setFoods).catch(() => {});
    api.get('/nutrition/recent').then(setRecent).catch(() => {});
  }, [open]);

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = useMemo(() => (q ? foods.filter((f) => norm(`${f.name} ${f.category}`).includes(norm(q))) : foods), [foods, q]);
  const grams = sel ? (byUnit && sel.unit_g ? (Number(qty) || 0) * sel.unit_g : Number(String(qty).replace(',', '.')) || 0) : 0;
  const m = sel ? macrosFor(sel, grams) : null;

  const choose = (f) => {
    setSel(f);
    setByUnit(!!f.unit_g);
    setQty(f.unit_g ? '1' : '100');
  };

  const post = async (body) => {
    try {
      await api.post('/nutrition/entries', { date, meal, ...body });
      toast(`${body.name} añadido`);
      onSaved();
      onClose();
    } catch (e) { toast(e.message, 'error'); }
  };

  const addSel = () => post({ name: sel.name, food_id: sel.id, grams, source: 'food', ...m });
  const addRecent = (r) => post({ name: r.name, food_id: r.food_id, grams: r.grams, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, source: r.source });

  const addManual = async () => {
    const num = (v) => Number(String(v).replace(',', '.')) || 0;
    const body = { name: manual.name.trim(), kcal: num(manual.kcal), protein: num(manual.protein), carbs: num(manual.carbs), fat: num(manual.fat) };
    if (manual.save) {
      // Guardado como alimento propio por 100 g
      const g = num(manual.grams) || 100;
      const per100 = (v) => Math.round((v / g) * 1000) / 10;
      try {
        await api.post('/foods', { name: body.name, kcal: per100(body.kcal), protein: per100(body.protein), carbs: per100(body.carbs), fat: per100(body.fat) });
      } catch (e) { toast(e.message, 'error'); return; }
      await post({ ...body, grams: g, source: 'manual' });
    } else {
      await post({ ...body, source: 'manual' });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Añadir a ${MEALS.find((x) => x.id === meal)?.label || ''}`} tall>
      {sel ? (
        <div className="stack">
          <button type="button" className="back-btn" onClick={() => setSel(null)}><ChevronLeft size={18} /> Volver</button>
          <div>
            <h3 style={{ margin: 0 }}>{sel.name}</h3>
            <p className="muted small" style={{ margin: '4px 0 0' }}>Por 100 g: {n0(sel.kcal)} kcal · P {n1(sel.protein)} · C {n1(sel.carbs)} · G {n1(sel.fat)}</p>
          </div>
          {sel.unit_g && (
            <Segmented value={byUnit ? 'u' : 'g'} onChange={(v) => { setByUnit(v === 'u'); setQty(v === 'u' ? '1' : String(Math.round(grams) || 100)); }}
              options={[{ value: 'u', label: `${sel.unit_label} (${n0(sel.unit_g)} g)` }, { value: 'g', label: 'Gramos' }]} />
          )}
          <Field label="Cantidad" suffix={byUnit ? sel.unit_label : 'g'}>
            <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus className="input-xl" />
          </Field>
          {byUnit && <p className="muted small" style={{ margin: 0 }}>= {n0(grams)} g</p>}
          <MacroLine m={m} />
          <Button block size="lg" onClick={addSel} disabled={!grams}>Añadir</Button>
        </div>
      ) : (
        <>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'buscar', label: 'Buscar' }, { value: 'recientes', label: 'Frecuentes' }, { value: 'manual', label: 'Manual' }]} />
          {mode === 'buscar' && (
            <>
              <div className="search-box mt">
                <Search size={18} />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pollo, arroz, yogur…" />
              </div>
              <div className="food-list">
                {list.map((f) => (
                  <button key={f.id} type="button" className="food-row" onClick={() => choose(f)}>
                    <span className="grow">
                      <strong>{f.name}{f.user_id ? <span className="tag">Mío</span> : null}</strong>
                      <span className="muted small">{n0(f.kcal)} kcal · P {n1(f.protein)} · C {n1(f.carbs)} · G {n1(f.fat)} <i>/100 g</i></span>
                    </span>
                    <Plus size={18} className="muted" />
                  </button>
                ))}
                {!list.length && <p className="muted small center">No encontrado. Añádelo en “Manual”.</p>}
              </div>
            </>
          )}
          {mode === 'recientes' && (
            <div className="food-list mt">
              {recent.length ? recent.map((r, i) => (
                <button key={i} type="button" className="food-row" onClick={() => addRecent(r)}>
                  <span className="grow">
                    <strong>{r.name}</strong>
                    <span className="muted small">{r.grams ? `${n0(r.grams)} g · ` : ''}{n0(r.kcal)} kcal · P {n1(r.protein)} g · {r.n}×</span>
                  </span>
                  <Plus size={18} className="muted" />
                </button>
              )) : <p className="muted small center">Aquí aparecerán tus comidas más habituales para añadirlas con un toque.</p>}
            </div>
          )}
          {mode === 'manual' && (
            <div className="stack mt">
              <Field label="Nombre"><input value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} placeholder="Ej. Bocadillo de pavo" maxLength={120} /></Field>
              <div className="grid-2">
                <Field label="Calorías" suffix="kcal"><input inputMode="decimal" value={manual.kcal} onChange={(e) => setManual({ ...manual, kcal: e.target.value })} /></Field>
                <Field label="Proteína" suffix="g"><input inputMode="decimal" value={manual.protein} onChange={(e) => setManual({ ...manual, protein: e.target.value })} /></Field>
                <Field label="Carbohidratos" suffix="g"><input inputMode="decimal" value={manual.carbs} onChange={(e) => setManual({ ...manual, carbs: e.target.value })} /></Field>
                <Field label="Grasas" suffix="g"><input inputMode="decimal" value={manual.fat} onChange={(e) => setManual({ ...manual, fat: e.target.value })} /></Field>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={manual.save} onChange={(e) => setManual({ ...manual, save: e.target.checked })} />
                <span>Guardar en mis alimentos</span>
              </label>
              {manual.save && <Field label="Estos valores corresponden a" suffix="g"><input inputMode="decimal" value={manual.grams} onChange={(e) => setManual({ ...manual, grams: e.target.value })} /></Field>}
              <Button block size="lg" disabled={!manual.name.trim()} onClick={addManual}>Añadir</Button>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

function EditEntrySheet({ entry, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(null);
  useEffect(() => { if (entry) setF({ ...entry }); }, [entry]);
  const save = async () => {
    try {
      await api.put(`/nutrition/entries/${entry.id}`, { meal: f.meal, name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, grams: f.grams });
      onSaved(); onClose();
    } catch (e) { toast(e.message, 'error'); }
  };
  const scale = (g) => {
    const ng = Number(g) || 0;
    if (!entry.grams) return setF({ ...f, grams: g });
    const k = ng / entry.grams;
    const r = (v) => Math.round(v * k * 10) / 10;
    setF({ ...f, grams: g, kcal: Math.round(entry.kcal * k), protein: r(entry.protein), carbs: r(entry.carbs), fat: r(entry.fat) });
  };
  return (
    <Sheet open={!!entry} onClose={onClose} title="Editar registro">
      {f && (
        <div className="stack">
          <Field label="Nombre"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Comida">
            <select value={f.meal} onChange={(e) => setF({ ...f, meal: e.target.value })}>{MEALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </Field>
          {entry.grams ? <Field label="Cantidad" suffix="g" hint="Los macros se recalculan proporcionalmente"><input inputMode="decimal" value={f.grams ?? ''} onChange={(e) => scale(e.target.value)} /></Field> : null}
          <div className="grid-2">
            {[['kcal', 'Calorías'], ['protein', 'Proteína'], ['carbs', 'Carbohidratos'], ['fat', 'Grasas']].map(([k, l]) => (
              <Field key={k} label={l}><input inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
            ))}
          </div>
          <Button block size="lg" onClick={save}>Guardar</Button>
        </div>
      )}
    </Sheet>
  );
}

function Supplements({ d, date, reload, profile, setDay }) {
  const [sheet, setSheet] = useState(null);
  const shakes = useData('/nutrition/log?source=shake');
  const rice = useData('/nutrition/log?source=rice_cream');
  const from = addDays(date, -13);
  const logs = useData(`/day-logs?from=${from}&to=${date}`, [d.day?.creatine_g]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  const taken = new Set((logs.data || []).filter((l) => l.creatine_g > 0).map((l) => l.date));
  let streak = 0;
  for (let x = taken.has(date) ? date : addDays(date, -1); taken.has(x); x = addDays(x, -1)) streak++;
  const refresh = () => { reload(); shakes.reload(); rice.reload(); };
  const proteinToday = d.totals.protein;

  return (
    <div className="stack mt">
      <Card>
        <div className="row between"><h3 className="card-title"><Pill size={17} /> Creatina</h3><span className="muted small">{taken.size}/14 días</span></div>
        <CreatineCard day={d.day} dose={profile?.creatine_dose_g || 5} streak={streak} date={date} onChange={(day) => { setDay(day); logs.reload(); }} />
        <div className="dots-row">
          {days.map((x) => (
            <div key={x} className={`dot-day ${taken.has(x) ? 'on' : ''} ${x === date ? 'today' : ''}`} title={fmtDate(x)}>
              <i /><span>{DAY_SHORT[isoDow(x) - 1]}</span>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ marginBottom: 0 }}>3-5 g al día, todos los días (también los de descanso), a cualquier hora. Lo importante es no saltársela. Configura el aviso diario en Más → Recordatorios.</p>
      </Card>

      <Card>
        <div className="row between"><h3 className="card-title"><Milk size={17} /> Proteína</h3><span className="muted small">{n0(proteinToday)} / {n0(d.targets.protein)} g hoy</span></div>
        <Bar value={proteinToday} max={d.targets.protein || 1} color="var(--c-protein)" height={8} />
        <p className="muted small">{proteinToday >= (d.targets.protein || 0) ? '¡Objetivo de proteína cumplido!' : `Te faltan ${n0((d.targets.protein || 0) - proteinToday)} g. Un batido aporta unos 25 g.`}</p>
        <Button block onClick={() => setSheet('shake')}><Plus size={16} /> Registrar batido</Button>
        <LogList title="Últimos batidos" data={shakes.data} />
      </Card>

      <Card>
        <div className="row between"><h3 className="card-title"><Soup size={17} /> Crema de arroz</h3></div>
        <p className="muted small" style={{ marginTop: 0 }}>Carbohidrato de fácil digestión, ideal 1-2 h antes de entrenar o en el desayuno. Añádele proteína, cacao o crema de cacahuete.</p>
        <Button block onClick={() => setSheet('rice')}><Plus size={16} /> Registrar crema de arroz</Button>
        <LogList title="Historial" data={rice.data} />
      </Card>

      <WaterCard day={d.day} target={profile?.water_target_ml} date={date} onChange={setDay} />

      <ShakeSheet open={sheet === 'shake'} onClose={() => setSheet(null)} onSaved={refresh} date={date} />
      <RiceCreamSheet open={sheet === 'rice'} onClose={() => setSheet(null)} onSaved={refresh} date={date} />
    </div>
  );
}

function LogList({ title, data }) {
  if (!data?.length) return null;
  return (
    <div className="log-list">
      <span className="field-label">{title}</span>
      {data.slice(0, 6).map((e) => (
        <div key={e.id} className="row between small log-row">
          <span className="grow ellipsis">{fmtDate(e.date)} · {e.name}</span>
          <span className="muted">{n0(e.protein)} g prot · {n0(e.kcal)} kcal</span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ date }) {
  const [days, setDays] = useState(14);
  const { data, loading } = useData(`/nutrition/history?to=${date}&days=${days}`);
  const { profile } = useAuth();
  if (loading && !data) return <Loading />;
  const logged = data.filter((x) => x.kcal > 0);
  const avg = (k) => (logged.length ? logged.reduce((a, x) => a + x[k], 0) / logged.length : 0);
  const hitProtein = data.filter((x) => profile?.protein_target && x.protein >= profile.protein_target * 0.9).length;
  const lbl = (x) => (days <= 14 ? DAY_SHORT[isoDow(x.date) - 1] : Number(x.date.slice(8)) % 5 === 0 ? x.date.slice(8) : '');
  return (
    <div className="stack mt">
      <Segmented value={String(days)} onChange={(v) => setDays(Number(v))} options={[{ value: '7', label: '7 días' }, { value: '14', label: '14 días' }, { value: '30', label: '30 días' }]} />
      <div className="stat-row">
        <Card className="stat"><strong>{n0(avg('kcal'))}</strong><span>kcal media</span></Card>
        <Card className="stat"><strong>{n0(avg('protein'))} g</strong><span>proteína media</span></Card>
        <Card className="stat"><strong>{hitProtein}/{days}</strong><span>días con proteína</span></Card>
      </div>
      <Card>
        <h3 className="card-title">Proteína diaria</h3>
        <BarChart data={data.map((x) => ({ label: lbl(x), value: x.protein, tip: `${fmtDate(x.date)}: ${n0(x.protein)} g`, dim: profile?.protein_target && x.protein < profile.protein_target * 0.9 }))}
          target={profile?.protein_target} color="var(--c-protein)" unit="g" />
        <p className="muted small chart-legend"><span className="legend-line" /> Objetivo {n0(profile?.protein_target)} g · barras tenues = por debajo del 90%</p>
      </Card>
      <Card>
        <h3 className="card-title">Calorías diarias</h3>
        <BarChart data={data.map((x) => ({ label: lbl(x), value: x.kcal, tip: `${fmtDate(x.date)}: ${n0(x.kcal)} kcal` }))} target={profile?.kcal_target} color="var(--c-kcal)" unit="kcal" />
      </Card>
      <div className="list-card">
        {[...data].reverse().filter((x) => x.kcal > 0 || x.creatine_g || x.water_ml).map((x) => (
          <div key={x.date} className="list-row">
            <div className="grow">
              <strong>{fmtDate(x.date, { weekday: true })}</strong>
              <span className="muted small">{n0(x.kcal)} kcal · P {n0(x.protein)} · C {n0(x.carbs)} · G {n0(x.fat)}</span>
            </div>
            <span className="small muted">{x.creatine_g ? '💊' : ''}{x.shakes ? ` 🥤${x.shakes > 1 ? x.shakes : ''}` : ''}{x.water_ml ? ` 💧${n1(x.water_ml / 1000)}L` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
