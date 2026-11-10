import { useEffect, useState } from 'react';
import { Pill, Droplet, Moon, Check, Plus, Minus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/store.jsx';
import { n1, today, fmtDate } from '../lib/format.js';
import { recipe, LIQUIDS, EXTRAS, mealByTime } from '../lib/nutrition.js';
import { Button, Field, Sheet, Stepper, Segmented, Chip, Bar } from './ui.jsx';

/** Registrar peso corporal (upsert por fecha). */
export function WeightSheet({ open, onClose, onSaved, initial }) {
  const toast = useToast();
  const [date, setDate] = useState(today());
  const [w, setW] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setDate(today()); setW(initial ? String(initial) : ''); } }, [open, initial]);
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/body/metrics', { date, weight: Number(String(w).replace(',', '.')) });
      toast('Peso guardado');
      onSaved?.();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <div className="stack">
        <Field label="Peso" suffix="kg">
          <input inputMode="decimal" autoFocus value={w} onChange={(e) => setW(e.target.value)} placeholder="79,0" className="input-xl" />
        </Field>
        <Field label="Fecha"><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></Field>
        <p className="muted small">Pésate por la mañana, en ayunas y tras ir al baño. Fíjate en la tendencia semanal, no en el dato de un día.</p>
        <Button block size="lg" loading={busy} disabled={!(Number(String(w).replace(',', '.')) > 0)} onClick={save}>Guardar</Button>
      </div>
    </Sheet>
  );
}

/** Batido de proteína: scoops + líquido. */
export function ShakeSheet({ open, onClose, onSaved, date = today() }) {
  const toast = useToast();
  const [scoops, setScoops] = useState(1);
  const [scoopG, setScoopG] = useState(30);
  const [liquid, setLiquid] = useState('water');
  const [ml, setMl] = useState(300);
  const [extras, setExtras] = useState([]);
  const [busy, setBusy] = useState(false);
  const items = [{ id: 'whey', grams: scoops * scoopG }, { id: liquid, grams: ml }, ...extras.map((id) => ({ id, grams: EXTRAS.find((e) => e.id === id).grams }))];
  const { total } = recipe(items);
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/nutrition/entries', {
        date, meal: mealByTime(), source: 'shake', name: `Batido de proteína${scoops !== 1 ? ` (${scoops} scoops)` : ''}`,
        grams: scoops * scoopG, ...total, details: { scoops, scoop_g: scoopG, liquid, ml, extras },
      });
      toast(`Batido añadido · +${n1(total.protein)} g proteína`);
      onSaved?.();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Batido de proteína">
      <div className="stack">
        <div className="row between">
          <span>Scoops</span>
          <Stepper value={scoops} onChange={setScoops} step={0.5} min={0.5} max={4} format={(v) => n1(v)} />
        </div>
        <Field label="Gramos por scoop" suffix="g"><input inputMode="numeric" value={scoopG} onChange={(e) => setScoopG(Number(e.target.value) || 0)} /></Field>
        <div>
          <span className="field-label">Líquido</span>
          <Segmented value={liquid} onChange={setLiquid} options={LIQUIDS.map((l) => ({ value: l.id, label: l.label }))} />
        </div>
        <div className="row between">
          <span>Cantidad de líquido</span>
          <Stepper value={ml} onChange={setMl} step={50} min={0} max={1000} format={(v) => `${v} ml`} />
        </div>
        <div>
          <span className="field-label">Extras</span>
          <div className="chips">
            {EXTRAS.filter((e) => e.id !== 'whey').map((e) => (
              <Chip key={e.id} active={extras.includes(e.id)} onClick={() => setExtras((x) => (x.includes(e.id) ? x.filter((i) => i !== e.id) : [...x, e.id]))}>{e.label}</Chip>
            ))}
          </div>
        </div>
        <MacroLine m={total} />
        <Button block size="lg" loading={busy} onClick={save}>Añadir batido</Button>
      </div>
    </Sheet>
  );
}

/** Crema de arroz con ingredientes opcionales. */
export function RiceCreamSheet({ open, onClose, onSaved, date = today() }) {
  const toast = useToast();
  const [grams, setGrams] = useState(60);
  const [liquid, setLiquid] = useState('water');
  const [ml, setMl] = useState(250);
  const [extras, setExtras] = useState({ whey: 0 });
  const [busy, setBusy] = useState(false);
  const items = [{ id: 'rice_cream', grams }, { id: liquid, grams: ml }, ...Object.entries(extras).filter(([, n]) => n > 0).map(([id, n]) => ({ id, grams: EXTRAS.find((e) => e.id === id).grams * n }))];
  const { total, parts } = recipe(items);
  const setExtra = (id, n) => setExtras((x) => ({ ...x, [id]: Math.max(0, n) }));
  const save = async () => {
    setBusy(true);
    try {
      const desc = parts.filter((p) => !['water'].includes(p.id) && p.id !== 'rice_cream').map((p) => p.name.toLowerCase());
      await api.post('/nutrition/entries', {
        date, meal: mealByTime(), source: 'rice_cream', name: `Crema de arroz ${grams} g${desc.length ? ` + ${desc.join(', ')}` : ''}`,
        grams, ...total, details: { grams, liquid, ml, extras },
      });
      toast('Crema de arroz añadida');
      onSaved?.();
      onClose();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="Crema de arroz" tall>
      <div className="stack">
        <div className="row between">
          <span>Crema de arroz</span>
          <Stepper value={grams} onChange={setGrams} step={10} min={10} max={300} format={(v) => `${v} g`} />
        </div>
        <div>
          <span className="field-label">Preparada con</span>
          <Segmented value={liquid} onChange={setLiquid} options={LIQUIDS.map((l) => ({ value: l.id, label: l.label }))} />
        </div>
        <div className="row between">
          <span>Líquido</span>
          <Stepper value={ml} onChange={setMl} step={50} min={0} max={800} format={(v) => `${v} ml`} />
        </div>
        <div>
          <span className="field-label">Añadidos</span>
          <div className="list-plain">
            {EXTRAS.map((e) => (
              <div key={e.id} className="row between extra-row">
                <span>{e.label} <span className="muted small">({e.grams} g/{e.unit})</span></span>
                <Stepper value={extras[e.id] || 0} onChange={(v) => setExtra(e.id, v)} step={e.id === 'banana' ? 0.5 : 1} min={0} max={6} format={(v) => (v ? `${n1(v)} ${e.unit}` : '–')} />
              </div>
            ))}
          </div>
        </div>
        <MacroLine m={total} />
        <Button block size="lg" loading={busy} onClick={save}>Añadir crema de arroz</Button>
      </div>
    </Sheet>
  );
}

export function MacroLine({ m }) {
  return (
    <div className="macro-line">
      <div><strong>{Math.round(m.kcal)}</strong><span>kcal</span></div>
      <div><strong>{n1(m.protein)}</strong><span>prot</span></div>
      <div><strong>{n1(m.carbs)}</strong><span>carb</span></div>
      <div><strong>{n1(m.fat)}</strong><span>grasa</span></div>
    </div>
  );
}

/** Tarjeta de creatina con un toque. */
export function CreatineCard({ day, dose = 5, streak = 0, onChange, date = today(), compact }) {
  const toast = useToast();
  const taken = day?.creatine_g > 0;
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const d = await api.put(`/day/${date}`, { creatine_g: taken ? null : dose, creatine_at: new Date().toISOString() });
      if (!taken) toast(`Creatina registrada (${n1(dose)} g) 💪`);
      onChange?.(d);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <button type="button" className={`quick-card creatine ${taken ? 'done' : ''} ${compact ? 'compact' : ''}`} onClick={toggle} disabled={busy}>
      <span className="quick-icon">{taken ? <Check size={20} /> : <Pill size={20} />}</span>
      <span className="quick-text">
        <strong>{taken ? 'Creatina tomada' : 'Tomar creatina'}</strong>
        <span>{taken ? `${n1(day.creatine_g)} g · racha ${streak} ${streak === 1 ? 'día' : 'días'}` : `${n1(dose)} g · ${streak ? `racha de ${streak} días` : 'toca para marcar'}`}</span>
      </span>
    </button>
  );
}

/** Agua: vasos de 250 ml. */
export function WaterCard({ day, target = 3000, onChange, date = today() }) {
  const toast = useToast();
  const ml = day?.water_ml || 0;
  const change = async (delta) => {
    const next = Math.max(0, ml + delta);
    onChange?.({ ...day, water_ml: next });
    try {
      const d = await api.put(`/day/${date}`, { water_ml: next });
      onChange?.(d);
      if (ml < target && next >= target) toast('¡Objetivo de agua cumplido! 💧');
    } catch (e) { toast(e.message, 'error'); onChange?.(day); }
  };
  return (
    <div className="quick-card water">
      <span className="quick-icon"><Droplet size={20} /></span>
      <span className="quick-text">
        <strong>{n1(ml / 1000)} / {n1(target / 1000)} L</strong>
        <Bar value={ml} max={target} color="var(--c-water)" height={5} />
      </span>
      <div className="water-btns">
        <button type="button" aria-label="Quitar vaso" onClick={() => change(-250)} disabled={!ml}><Minus size={16} /></button>
        <button type="button" aria-label="Añadir vaso de 250 ml" className="primary" onClick={() => change(250)}><Plus size={16} /></button>
      </div>
    </div>
  );
}

/** Sueño de anoche. */
export function SleepSheet({ open, onClose, day, date = today(), onSaved }) {
  const toast = useToast();
  const [h, setH] = useState(8);
  useEffect(() => { if (open) setH(day?.sleep_h ?? 8); }, [open, day]);
  const save = async () => {
    try {
      const d = await api.put(`/day/${date}`, { sleep_h: h });
      toast('Sueño registrado');
      onSaved?.(d);
      onClose();
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Sheet open={open} onClose={onClose} title="¿Cuánto has dormido?">
      <div className="stack center">
        <p className="muted small">Noche del {fmtDate(date)}. Dormir 7-9 h es clave para ganar músculo y recuperar.</p>
        <Stepper value={h} onChange={setH} step={0.5} min={0} max={14} format={(v) => `${n1(v)} h`} />
        <Button block size="lg" onClick={save}>Guardar</Button>
      </div>
    </Sheet>
  );
}

export function SleepCard({ day, target = 8, onClick }) {
  const h = day?.sleep_h;
  return (
    <button type="button" className={`quick-card sleep ${h != null && h >= target - 0.5 ? 'done' : ''}`} onClick={onClick}>
      <span className="quick-icon"><Moon size={20} /></span>
      <span className="quick-text">
        <strong>{h != null ? `${n1(h)} h de sueño` : 'Registrar sueño'}</strong>
        <span>{h != null ? (h >= target - 0.5 ? 'Bien descansado' : `Objetivo ${n1(target)} h`) : `Objetivo ${n1(target)} h`}</span>
      </span>
    </button>
  );
}
