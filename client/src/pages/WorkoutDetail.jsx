import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { useData, useToast } from '../lib/store.jsx';
import { fmtDate, durationWords, n0, n1 } from '../lib/format.js';
import { PageHeader, Card, Loading, ErrorState, Delta, IconButton, useConfirm } from '../components/ui.jsx';

const FEEL = ['', '😫 Muy duro', '😕 Regular', '😐 Normal', '🙂 Bien', '🔥 Increíble'];

export default function WorkoutDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data: w, error, loading, reload } = useData(`/workouts/${id}`);
  const [confirmEl, ask] = useConfirm();

  if (loading && !w) return <div className="page"><PageHeader back /><Loading /></div>;
  if (error && !w) return <div className="page"><PageHeader back /><ErrorState error={error} retry={reload} /></div>;

  const remove = async () => {
    if (!(await ask({ title: '¿Eliminar este entrenamiento?', message: 'Esta acción no se puede deshacer.', confirm: 'Eliminar', danger: true }))) return;
    try { await api.del(`/workouts/${w.id}`); toast('Entrenamiento eliminado'); nav('/entreno/historial', { replace: true }); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="page">
      <PageHeader back title={w.routine_name} subtitle={fmtDate(w.date, { weekday: true, year: true })}
        right={<IconButton label="Eliminar" onClick={remove}><Trash2 size={19} /></IconButton>} />
      <div className="finish-stats card">
        <div><strong>{durationWords(w.duration_sec)}</strong><span>duración</span></div>
        <div><strong>{w.total_sets}</strong><span>series</span></div>
        <div><strong>{n0(w.total_volume)}</strong><span>kg volumen</span></div>
        <div><strong>{w.prs}</strong><span>récords</span></div>
      </div>
      {(w.feeling || w.notes) && (
        <Card>
          {w.feeling && <p style={{ margin: 0 }}>{FEEL[w.feeling]}</p>}
          {w.notes && <p className="muted" style={{ margin: '6px 0 0' }}>{w.notes}</p>}
        </Card>
      )}
      <div className="stack">
        {w.exercises.map((e) => {
          const vol = e.sets.filter((s) => s.completed).reduce((a, s) => a + s.weight * s.reps, 0);
          const prevVol = e.previous ? e.previous.sets.filter((s) => s.completed).reduce((a, s) => a + s.weight * s.reps, 0) : null;
          return (
            <Card key={e.id}>
              <div className="row between">
                <h3 className="card-title">{e.name}</h3>
                {prevVol != null && prevVol > 0 && <Delta value={vol - prevVol} unit="kg" digits={0} />}
              </div>
              {e.notes && <p className="muted small">{e.notes}</p>}
              <div className="detail-sets">
                {e.sets.map((s) => (
                  <div key={s.id} className={`detail-set ${s.completed ? '' : 'skipped'}`}>
                    <span className="set-idx">{s.is_pr ? <Trophy size={14} className="c-gold" /> : s.set_index + 1}</span>
                    <span>{s.weight > 0 ? `${n1(s.weight)} kg × ${s.reps}` : `${s.reps} reps`}</span>
                    {!s.completed && <span className="muted small">no completada</span>}
                  </div>
                ))}
              </div>
              {e.previous && (
                <p className="muted small" style={{ margin: '8px 0 0' }}>
                  Sesión anterior ({fmtDate(e.previous.date)}): {e.previous.sets.filter((s) => s.completed).map((s) => (s.weight ? `${n1(s.weight)}×${s.reps}` : s.reps)).join(' · ')}
                </p>
              )}
            </Card>
          );
        })}
      </div>
      {confirmEl}
    </div>
  );
}
