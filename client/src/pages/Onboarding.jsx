import { useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/store.jsx';
import { today } from '../lib/format.js';
import { Button, Field, Segmented } from '../components/ui.jsx';
import { nutritionTargets, waterTarget, ACTIVITY, GOALS, DAY_SHORT, DAY_NAMES } from '../../../shared/calc.js';

export default function Onboarding() {
  const { user, setProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    sex: 'male', age: '', height_cm: '', start_weight: '', experience: 'beginner', goal: 'muscle', activity: 'light', training_days: [1, 2, 4],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const valid = Number(f.age) >= 12 && Number(f.height_cm) >= 100 && Number(f.start_weight) >= 30 && f.training_days.length > 0;
  const t = useMemo(() => (valid ? nutritionTargets({ sex: f.sex, weight: +f.start_weight, height: +f.height_cm, age: +f.age, activity: f.activity, goal: f.goal }) : null), [f, valid]);

  const toggleDay = (d) => set('training_days', f.training_days.includes(d) ? f.training_days.filter((x) => x !== d) : [...f.training_days, d].sort());

  const finish = async () => {
    setBusy(true);
    setError('');
    try {
      const p = await api.post('/profile/onboarding', {
        ...f, age: +f.age, height_cm: +f.height_cm, start_weight: +f.start_weight,
        today: today(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setProfile(p);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onb-progress"><span style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      {step === 0 && (
        <section className="onb-step">
          <p className="eyebrow">Paso 1 de 3</p>
          <h1>Hola, {user.name.split(' ')[0]}</h1>
          <p className="muted">Con estos datos calculo tus objetivos de calorías, proteína y agua. Puedes cambiarlos cuando quieras.</p>
          <div className="stack">
            <Segmented value={f.sex} onChange={(v) => set('sex', v)} options={[{ value: 'male', label: 'Hombre' }, { value: 'female', label: 'Mujer' }]} />
            <div className="grid-3">
              <Field label="Edad" suffix="años"><input inputMode="numeric" value={f.age} onChange={(e) => set('age', e.target.value)} placeholder="19" /></Field>
              <Field label="Altura" suffix="cm"><input inputMode="numeric" value={f.height_cm} onChange={(e) => set('height_cm', e.target.value)} placeholder="187" /></Field>
              <Field label="Peso" suffix="kg"><input inputMode="decimal" value={f.start_weight} onChange={(e) => set('start_weight', e.target.value.replace(',', '.'))} placeholder="79" /></Field>
            </div>
            <Field label="Experiencia">
              <select value={f.experience} onChange={(e) => set('experience', e.target.value)}>
                <option value="beginner">Principiante absoluto</option>
                <option value="novice">Menos de 1 año</option>
                <option value="intermediate">1-3 años</option>
              </select>
            </Field>
          </div>
          <Button block size="lg" disabled={!valid} onClick={() => setStep(1)}>Continuar</Button>
        </section>
      )}

      {step === 1 && (
        <section className="onb-step">
          <p className="eyebrow">Paso 2 de 3</p>
          <h1>Tu plan</h1>
          <p className="muted">¿Qué días vas al gimnasio y qué buscas?</p>
          <div className="stack">
            <div>
              <span className="field-label">Días de entrenamiento</span>
              <div className="day-picker">
                {DAY_SHORT.map((d, i) => (
                  <button key={i} type="button" className={f.training_days.includes(i + 1) ? 'active' : ''} onClick={() => toggleDay(i + 1)} aria-label={DAY_NAMES[i]}>{d}</button>
                ))}
              </div>
              <p className="field-hint">{f.training_days.length} días por semana · tu objetivo semanal será {f.training_days.length} entrenos</p>
            </div>
            <Field label="Objetivo">
              <select value={f.goal} onChange={(e) => set('goal', e.target.value)}>
                {Object.entries(GOALS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Actividad semanal">
              <select value={f.activity} onChange={(e) => set('activity', e.target.value)}>
                {Object.entries(ACTIVITY).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="row gap">
            <Button variant="secondary" onClick={() => setStep(0)}>Atrás</Button>
            <Button block size="lg" disabled={!f.training_days.length} onClick={() => setStep(2)}>Continuar</Button>
          </div>
        </section>
      )}

      {step === 2 && t && (
        <section className="onb-step">
          <p className="eyebrow">Paso 3 de 3</p>
          <h1>Todo listo</h1>
          <p className="muted">Esto es lo que te he preparado. Son puntos de partida orientativos: ajústalos con tu evolución.</p>
          <div className="onb-targets">
            <div><strong>{t.kcal}</strong><span>kcal/día</span></div>
            <div><strong>{t.protein} g</strong><span>proteína</span></div>
            <div><strong>{(waterTarget(+f.start_weight) / 1000).toLocaleString('es-ES')} L</strong><span>agua</span></div>
          </div>
          <div className="card onb-routine">
            <h3>Rutina full body para principiantes</h3>
            <p className="muted small">3 entrenos de cuerpo completo con máquinas y mancuernas: técnica sencilla, segura y efectiva. Subirás peso cuando completes todas las series en el tope de repeticiones.</p>
            <ul>
              {['Entreno A · Empuje y pierna', 'Entreno B · Tracción y cadena posterior', 'Entreno C · Pierna, hombro y brazos'].map((x, i) => (
                <li key={x}><span className="tag">{DAY_NAMES[[...f.training_days].sort()[i] - 1] || 'Libre'}</span>{x}</li>
              ))}
            </ul>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="row gap">
            <Button variant="secondary" onClick={() => setStep(1)}>Atrás</Button>
            <Button block size="lg" loading={busy} onClick={finish}>Empezar</Button>
          </div>
        </section>
      )}
    </div>
  );
}
