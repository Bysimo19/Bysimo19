import { useState } from 'react';
import { Plus, Trash2, CircleCheck, Circle } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast } from '../lib/store.jsx';
import { today, addDays, DAY_SHORT, isoDow } from '../lib/format.js';
import { PageHeader, Card, Button, Sheet, Field, Icon, HABIT_ICONS, Loading, ErrorState, Empty, IconButton, useConfirm } from '../components/ui.jsx';

export default function Habits() {
  const t = today();
  const from = addDays(t, -6);
  const { data, error, loading, reload, setData } = useData(`/habits?from=${from}&to=${t}`);
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [confirmEl, ask] = useConfirm();
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  if (loading && !data) return <div className="page"><PageHeader back="/mas" title="Hábitos" /><Loading /></div>;
  if (error && !data) return <div className="page"><PageHeader back="/mas" title="Hábitos" /><ErrorState error={error} retry={reload} /></div>;
  const done = new Set(data.logs.map((l) => `${l.habit_id}|${l.date}`));

  const toggle = async (h, d) => {
    const key = `${h.id}|${d}`;
    setData((x) => ({ ...x, logs: done.has(key) ? x.logs.filter((l) => !(l.habit_id === h.id && l.date === d)) : [...x.logs, { habit_id: h.id, date: d }] }));
    try { await api.post(`/habits/${h.id}/toggle`, { date: d }); } catch (e) { toast(e.message, 'error'); reload(); }
  };
  const save = async () => {
    try {
      if (form.id) await api.put(`/habits/${form.id}`, form); else await api.post('/habits', form);
      setForm(null); reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (h) => {
    if (!(await ask({ title: `¿Eliminar “${h.name}”?`, confirm: 'Eliminar', danger: true }))) return;
    try { await api.del(`/habits/${h.id}`); setForm(null); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="page">
      <PageHeader back="/mas" title="Hábitos" subtitle="Pequeñas acciones diarias que suman. Marca también días pasados."
        right={<IconButton label="Nuevo hábito" onClick={() => setForm({ name: '', icon: 'check' })}><Plus size={22} /></IconButton>} />
      {!data.habits.length ? (
        <Empty icon="check" title="Sin hábitos" text="Añade 2-4 hábitos sencillos. Menos es más." action={<Button onClick={() => setForm({ name: '', icon: 'check' })}>Añadir hábito</Button>} />
      ) : (
        <div className="stack">
          {data.habits.map((h) => {
            const n = days.filter((d) => done.has(`${h.id}|${d}`)).length;
            return (
              <Card key={h.id} className="habit-week">
                <div className="row between">
                  <button type="button" className="habit-title" onClick={() => setForm({ ...h })}><Icon name={h.icon} size={18} /> <strong>{h.name}</strong></button>
                  <span className="muted small">{n}/7</span>
                </div>
                <div className="habit-days">
                  {days.map((d) => (
                    <button key={d} type="button" className={`${done.has(`${h.id}|${d}`) ? 'on' : ''} ${d === t ? 'today' : ''}`} onClick={() => toggle(h, d)} aria-label={`${h.name} ${d}`}>
                      <span>{DAY_SHORT[isoDow(d) - 1]}</span>
                      {done.has(`${h.id}|${d}`) ? <CircleCheck size={24} /> : <Circle size={24} />}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="muted small mt">La creatina, el agua, la proteína y el sueño se registran automáticamente desde Hoy y Nutrición; aquí solo van tus hábitos personales.</p>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar hábito' : 'Nuevo hábito'}>
        {form && (
          <div className="stack">
            <Field label="Nombre"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Leer 10 minutos" maxLength={60} autoFocus /></Field>
            <div>
              <span className="field-label">Icono</span>
              <div className="icon-picker">
                {HABIT_ICONS.map((i) => <button key={i} type="button" className={form.icon === i ? 'active' : ''} onClick={() => setForm({ ...form, icon: i })} aria-label={i}><Icon name={i} size={20} /></button>)}
              </div>
            </div>
            <Button block size="lg" onClick={save} disabled={!form.name.trim()}>Guardar</Button>
            {form.id && <Button variant="danger" block onClick={() => del(form)}><Trash2 size={16} /> Eliminar</Button>}
          </div>
        )}
      </Sheet>
      {confirmEl}
    </div>
  );
}
