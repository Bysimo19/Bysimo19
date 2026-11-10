import { useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { n0, n1 } from '../lib/format.js';
import { PageHeader, Card, Field, Segmented, Button } from '../components/ui.jsx';
import { nutritionTargets, ACTIVITY, GOALS, e1rm } from '../../../shared/calc.js';

export default function Calculators() {
  const [tab, setTab] = useState('calorias');
  return (
    <div className="page">
      <PageHeader back="/mas" title="Calculadoras" />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'calorias', label: 'Calorías' }, { value: 'proteina', label: 'Proteína' }, { value: '1rm', label: '1RM' }]} />
      <div className="mt">
        {tab === 'calorias' && <Calories />}
        {tab === 'proteina' && <Protein />}
        {tab === '1rm' && <OneRm />}
      </div>
    </div>
  );
}

function Calories() {
  const { profile, setProfile } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ sex: profile.sex, age: profile.age, height: profile.height_cm, weight: profile.start_weight, activity: profile.activity, goal: profile.goal });
  const t = nutritionTargets({ ...f, weight: Number(f.weight), height: Number(f.height), age: Number(f.age) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const apply = async () => {
    try {
      const p = await api.put('/profile', { kcal_target: t.kcal, protein_target: t.protein, carbs_target: t.carbs, fat_target: t.fat, activity: f.activity, goal: f.goal });
      setProfile(p);
      toast('Objetivos actualizados');
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="stack">
      <Card>
        <div className="stack">
          <div className="grid-3">
            <Field label="Edad"><input inputMode="numeric" value={f.age ?? ''} onChange={set('age')} /></Field>
            <Field label="Altura" suffix="cm"><input inputMode="numeric" value={f.height ?? ''} onChange={set('height')} /></Field>
            <Field label="Peso" suffix="kg"><input inputMode="decimal" value={f.weight ?? ''} onChange={set('weight')} /></Field>
          </div>
          <Segmented value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[{ value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }]} />
          <Field label="Actividad"><select value={f.activity} onChange={set('activity')}>{Object.entries(ACTIVITY).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select></Field>
          <Field label="Objetivo"><select value={f.goal} onChange={set('goal')}>{Object.entries(GOALS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select></Field>
        </div>
      </Card>
      <Card className="calc-result">
        <div className="calc-main"><strong>{n0(t.kcal)}</strong><span>kcal al día</span></div>
        <div className="macro-line">
          <div><strong>{t.protein} g</strong><span>proteína</span></div>
          <div><strong>{t.carbs} g</strong><span>carbos</span></div>
          <div><strong>{t.fat} g</strong><span>grasas</span></div>
        </div>
        <p className="muted small">Metabolismo basal (Mifflin-St Jeor): {n0(t.bmr)} kcal · Gasto total estimado: {n0(t.tdee)} kcal. {f.goal === 'muscle' ? 'Para ganar músculo se suma un superávit ligero (+300 kcal) para minimizar la grasa ganada.' : ''}</p>
        <p className="muted small">Es una estimación. Ajusta cada 2-3 semanas según tu peso: si en volumen no subes 0,2-0,4 kg/semana, añade 150-200 kcal.</p>
        <Button block onClick={apply}>Usar como mis objetivos</Button>
      </Card>
    </div>
  );
}

function Protein() {
  const { profile } = useAuth();
  const [w, setW] = useState(profile.start_weight || 75);
  const [g, setG] = useState('muscle');
  const ranges = { muscle: [1.6, 2.2, 'Ganar músculo'], cut: [2.0, 2.4, 'Perder grasa manteniendo músculo'], maintain: [1.4, 1.8, 'Mantener / salud'] };
  const [lo, hi] = ranges[g];
  const wn = Number(String(w).replace(',', '.')) || 0;
  return (
    <div className="stack">
      <Card>
        <div className="stack">
          <Field label="Peso corporal" suffix="kg"><input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></Field>
          <Segmented value={g} onChange={setG} options={[{ value: 'muscle', label: 'Músculo' }, { value: 'cut', label: 'Definir' }, { value: 'maintain', label: 'Mantener' }]} />
        </div>
      </Card>
      <Card className="calc-result">
        <div className="calc-main"><strong>{n0(wn * lo)}–{n0(wn * hi)} g</strong><span>de proteína al día</span></div>
        <p className="muted small">{ranges[g][2]}: {lo}-{hi} g por kg de peso corporal. Repártela en 3-5 tomas de 25-40 g.</p>
        <div className="list-plain small">
          <p>≈ 30 g = 130 g de pechuga de pollo</p>
          <p>≈ 25 g = 1 batido (30 g de whey)</p>
          <p>≈ 25 g = 4 huevos L</p>
          <p>≈ 20 g = 250 g de queso fresco batido 0%</p>
          <p>≈ 13 g = 1 lata de atún al natural</p>
        </div>
      </Card>
    </div>
  );
}

function OneRm() {
  const [w, setW] = useState(60);
  const [r, setR] = useState(8);
  const max = e1rm(Number(String(w).replace(',', '.')) || 0, Number(r) || 0);
  const pcts = [[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15]];
  return (
    <div className="stack">
      <Card>
        <div className="grid-2">
          <Field label="Peso levantado" suffix="kg"><input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></Field>
          <Field label="Repeticiones"><input inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} /></Field>
        </div>
      </Card>
      <Card className="calc-result">
        <div className="calc-main"><strong>{n1(max)} kg</strong><span>1RM estimado (Epley)</span></div>
        <div className="list-plain small">
          {pcts.map(([p, reps]) => <div key={p} className="row between"><span>{p}% · ~{reps} reps</span><strong>{n1((max * p) / 100)} kg</strong></div>)}
        </div>
        <p className="muted small">Como principiante no necesitas probar tu máximo. Úsalo solo como referencia de progreso.</p>
      </Card>
    </div>
  );
}
