import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth, useToast } from '../lib/store.jsx';
import { PageHeader, Card, Button, Field, Sheet } from '../components/ui.jsx';
import { nutritionTargets, waterTarget, ACTIVITY, GOALS, DAY_SHORT, DAY_NAMES } from '../../../shared/calc.js';

export default function Profile() {
  const { user, profile, setProfile, setUser, logout } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState(null);
  const [del, setDel] = useState(null);
  useEffect(() => { setF({ ...profile, name: user.name }); }, [profile, user]);
  if (!f) return null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleDay = (d) => setF((x) => ({ ...x, training_days: x.training_days.includes(d) ? x.training_days.filter((y) => y !== d) : [...x.training_days, d].sort() }));

  const recalc = () => {
    const t = nutritionTargets({ sex: f.sex, weight: Number(f.start_weight), height: Number(f.height_cm), age: Number(f.age), activity: f.activity, goal: f.goal });
    setF((x) => ({ ...x, kcal_target: t.kcal, protein_target: t.protein, carbs_target: t.carbs, fat_target: t.fat, water_target_ml: waterTarget(Number(f.start_weight)) }));
    toast(`Recalculado: ${t.kcal} kcal · ${t.protein} g proteína`);
  };

  const save = async () => {
    setBusy(true);
    try {
      const keys = ['sex', 'age', 'height_cm', 'start_weight', 'target_weight', 'experience', 'goal', 'activity', 'training_days', 'weekly_goal', 'kcal_target', 'protein_target', 'carbs_target', 'fat_target', 'water_target_ml', 'sleep_target_h', 'creatine_dose_g'];
      const body = Object.fromEntries(keys.map((k) => [k, typeof f[k] === 'string' ? f[k].replace(',', '.') : f[k]]));
      body.name = f.name;
      body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const p = await api.put('/profile', body);
      setProfile(p);
      setUser({ ...user, name: f.name });
      toast('Perfil guardado');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="page">
      <PageHeader back="/mas" title="Perfil" />
      <Card>
        <h3 className="card-title">Datos personales</h3>
        <div className="stack">
          <Field label="Nombre"><input value={f.name} onChange={set('name')} maxLength={60} /></Field>
          <div className="grid-3">
            <Field label="Edad"><input inputMode="numeric" value={f.age ?? ''} onChange={set('age')} /></Field>
            <Field label="Altura" suffix="cm"><input inputMode="numeric" value={f.height_cm ?? ''} onChange={set('height_cm')} /></Field>
            <Field label="Sexo">
              <select value={f.sex} onChange={set('sex')}><option value="male">Hombre</option><option value="female">Mujer</option></select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Peso de referencia" suffix="kg"><input inputMode="decimal" value={f.start_weight ?? ''} onChange={set('start_weight')} /></Field>
            <Field label="Peso objetivo" suffix="kg"><input inputMode="decimal" value={f.target_weight ?? ''} onChange={set('target_weight')} /></Field>
          </div>
          <Field label="Experiencia">
            <select value={f.experience} onChange={set('experience')}>
              <option value="beginner">Principiante absoluto</option><option value="novice">Menos de 1 año</option><option value="intermediate">1-3 años</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <h3 className="card-title">Entrenamiento</h3>
        <span className="field-label">Días de gimnasio</span>
        <div className="day-picker">
          {DAY_SHORT.map((d, i) => <button key={i} type="button" aria-label={DAY_NAMES[i]} className={f.training_days.includes(i + 1) ? 'active' : ''} onClick={() => toggleDay(i + 1)}>{d}</button>)}
        </div>
        <Field label="Objetivo semanal" suffix="entrenos" hint="Lo que cuenta para tu racha. Si dudas, pon uno menos de los días que planeas: mejor cumplir que fallar." className="mt">
          <input inputMode="numeric" value={f.weekly_goal} onChange={set('weekly_goal')} />
        </Field>
      </Card>

      <Card>
        <div className="row between"><h3 className="card-title">Objetivos diarios</h3><button type="button" className="link-sm" onClick={recalc}>Recalcular</button></div>
        <div className="stack">
          <div className="grid-2">
            <Field label="Objetivo">
              <select value={f.goal} onChange={set('goal')}>{Object.entries(GOALS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}</select>
            </Field>
            <Field label="Actividad">
              <select value={f.activity} onChange={set('activity')}>{Object.entries(ACTIVITY).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}</select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Calorías" suffix="kcal"><input inputMode="numeric" value={f.kcal_target ?? ''} onChange={set('kcal_target')} /></Field>
            <Field label="Proteína" suffix="g"><input inputMode="numeric" value={f.protein_target ?? ''} onChange={set('protein_target')} /></Field>
            <Field label="Carbohidratos" suffix="g"><input inputMode="numeric" value={f.carbs_target ?? ''} onChange={set('carbs_target')} /></Field>
            <Field label="Grasas" suffix="g"><input inputMode="numeric" value={f.fat_target ?? ''} onChange={set('fat_target')} /></Field>
            <Field label="Agua" suffix="ml"><input inputMode="numeric" value={f.water_target_ml ?? ''} onChange={set('water_target_ml')} /></Field>
            <Field label="Sueño" suffix="h"><input inputMode="decimal" value={f.sleep_target_h ?? ''} onChange={set('sleep_target_h')} /></Field>
            <Field label="Creatina" suffix="g/día"><input inputMode="decimal" value={f.creatine_dose_g ?? ''} onChange={set('creatine_dose_g')} /></Field>
          </div>
        </div>
      </Card>

      <Button block size="lg" onClick={save} loading={busy}>Guardar cambios</Button>

      <div className="stack-sm mt">
        <Button variant="secondary" block onClick={() => setPw({ current: '', password: '' })}>Cambiar contraseña</Button>
        <Button variant="ghost" block className="danger-text" onClick={() => setDel({ password: '' })}>Eliminar cuenta</Button>
      </div>

      <Sheet open={!!pw} onClose={() => setPw(null)} title="Cambiar contraseña">
        {pw && (
          <div className="stack">
            <Field label="Contraseña actual"><input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="Nueva contraseña" hint="Mínimo 8 caracteres"><input type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
            <Button block onClick={async () => { try { await api.post('/auth/password', pw); toast('Contraseña cambiada'); setPw(null); } catch (e) { toast(e.message, 'error'); } }}>Guardar</Button>
          </div>
        )}
      </Sheet>
      <Sheet open={!!del} onClose={() => setDel(null)} title="Eliminar cuenta">
        {del && (
          <div className="stack">
            <p className="muted">Se borrarán para siempre tus rutinas, entrenos, comidas, medidas y fotos. Puedes exportar tus datos antes desde Más.</p>
            <Field label="Confirma con tu contraseña"><input type="password" value={del.password} onChange={(e) => setDel({ password: e.target.value })} /></Field>
            <Button variant="danger" block onClick={async () => { try { await api.del('/account', del); await logout(); } catch (e) { toast(e.message, 'error'); } }}>Eliminar definitivamente</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
