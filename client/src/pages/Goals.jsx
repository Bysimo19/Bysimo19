import { useState } from 'react';
import { Plus, Trash2, CircleCheck, Circle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast } from '../lib/store.jsx';
import { fmtDate, n1, today, daysBetween } from '../lib/format.js';
import { PageHeader, Card, Button, Sheet, Field, Bar, Loading, ErrorState, Empty, IconButton, useConfirm } from '../components/ui.jsx';

const CATS = { fuerza: 'Fuerza', peso: 'Peso', constancia: 'Constancia', nutricion: 'Nutrición', otro: 'Otro' };
const EMPTY = { title: '', category: 'fuerza', target_value: '', current_value: '', unit: '', deadline: '' };
const IDEAS = [
  { title: 'Prensa de piernas: 100 kg × 10', category: 'fuerza', target_value: 100, unit: 'kg' },
  { title: 'Press banca con mancuernas: 24 kg × 10', category: 'fuerza', target_value: 24, unit: 'kg' },
  { title: 'Hacer 1 dominada sin ayuda', category: 'fuerza', target_value: 1, unit: 'reps' },
  { title: 'No fallar ningún entreno este mes', category: 'constancia' },
  { title: 'Creatina 30 días seguidos', category: 'nutricion', target_value: 30, unit: 'días' },
];

export default function Goals() {
  const { data, error, loading, reload } = useData('/goals');
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [confirmEl, ask] = useConfirm();
  if (loading && !data) return <div className="page"><PageHeader back title="Objetivos" /><Loading /></div>;
  if (error && !data) return <div className="page"><PageHeader back title="Objetivos" /><ErrorState error={error} retry={reload} /></div>;

  const save = async () => {
    const body = { ...form, target_value: form.target_value === '' ? null : form.target_value, current_value: form.current_value === '' ? null : form.current_value, deadline: form.deadline || null };
    try {
      if (form.id) await api.put(`/goals/${form.id}`, body); else await api.post('/goals', body);
      setForm(null); reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const toggle = async (g) => {
    try {
      await api.put(`/goals/${g.id}`, { done: !g.done });
      if (!g.done) toast('¡Objetivo cumplido! 🎯');
      reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (g) => {
    if (!(await ask({ title: '¿Eliminar objetivo?', confirm: 'Eliminar', danger: true }))) return;
    try { await api.del(`/goals/${g.id}`); setForm(null); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const pending = data.filter((g) => !g.done);
  const done = data.filter((g) => g.done);

  const Row = (g) => {
    const pct = g.target_value && g.current_value != null ? Math.min(100, (g.current_value / g.target_value) * 100) : null;
    const left = g.deadline ? daysBetween(today(), g.deadline) : null;
    return (
      <Card key={g.id} className={`goal ${g.done ? 'done' : ''}`}>
        <div className="goal-row">
          <IconButton label={g.done ? 'Marcar pendiente' : 'Marcar cumplido'} onClick={() => toggle(g)} className="goal-check">
            {g.done ? <CircleCheck size={24} /> : <Circle size={24} />}
          </IconButton>
          <button type="button" className="grow goal-main" onClick={() => setForm({ ...EMPTY, ...g, target_value: g.target_value ?? '', current_value: g.current_value ?? '', unit: g.unit ?? '', deadline: g.deadline ?? '' })}>
            <strong>{g.title}</strong>
            <span className="muted small">
              {CATS[g.category]}
              {g.target_value != null && ` · ${g.current_value != null ? `${n1(g.current_value)} / ` : 'meta '}${n1(g.target_value)} ${g.unit || ''}`}
              {g.deadline && !g.done && ` · ${left >= 0 ? `${left} días` : 'vencido'}`}
              {g.done && g.done_at && ` · cumplido el ${fmtDate(g.done_at.slice(0, 10))}`}
            </span>
          </button>
        </div>
        {pct != null && !g.done && <Bar value={pct} max={100} height={5} />}
      </Card>
    );
  };

  return (
    <div className="page">
      <PageHeader back title="Objetivos" subtitle="Metas concretas y medibles"
        right={<IconButton label="Nuevo objetivo" onClick={() => setForm({ ...EMPTY })}><Plus size={22} /></IconButton>} />
      {pending.length ? <div className="stack">{pending.map(Row)}</div> : (
        <Empty icon="target" title="Sin objetivos pendientes" action={<Button onClick={() => setForm({ ...EMPTY })}>Crear objetivo</Button>} />
      )}
      <div className="section-head"><h2>Ideas</h2></div>
      <div className="chips wrap">
        {IDEAS.map((i) => <button key={i.title} type="button" className="chip" onClick={() => setForm({ ...EMPTY, ...i, target_value: i.target_value ?? '', unit: i.unit ?? '' })}>+ {i.title}</button>)}
      </div>
      {done.length > 0 && (
        <>
          <div className="section-head"><h2>Cumplidos</h2><span className="muted small">{done.length}</span></div>
          <div className="stack">{done.map(Row)}</div>
        </>
      )}

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar objetivo' : 'Nuevo objetivo'}>
        {form && (
          <div className="stack">
            <Field label="Objetivo"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Prensa 100 kg × 10" maxLength={120} /></Field>
            <Field label="Categoría">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <div className="grid-3">
              <Field label="Actual"><input inputMode="decimal" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value.replace(',', '.') })} /></Field>
              <Field label="Meta"><input inputMode="decimal" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value.replace(',', '.') })} /></Field>
              <Field label="Unidad"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg" maxLength={20} /></Field>
            </div>
            <Field label="Fecha límite (opcional)"><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
            <Button block size="lg" onClick={save} disabled={!form.title.trim()}>Guardar</Button>
            {form.id && <Button variant="danger" block onClick={() => del(form)}><Trash2 size={16} /> Eliminar</Button>}
          </div>
        )}
      </Sheet>
      {confirmEl}
    </div>
  );
}
