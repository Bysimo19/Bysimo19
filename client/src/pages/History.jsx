import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useData } from '../lib/store.jsx';
import { fmtDate, durationWords, n0, monthLabel } from '../lib/format.js';
import { PageHeader, Loading, ErrorState, Empty, Button } from '../components/ui.jsx';

const FEEL = ['', '😫', '😕', '😐', '🙂', '🔥'];

export default function History() {
  const [limit, setLimit] = useState(30);
  const { data, error, loading, reload } = useData(`/workouts?limit=${limit}`);

  if (loading && !data) return <div className="page"><PageHeader back="/entreno" title="Historial" /><Loading /></div>;
  if (error && !data) return <div className="page"><PageHeader back="/entreno" title="Historial" /><ErrorState error={error} retry={reload} /></div>;

  const groups = [];
  for (const w of data) {
    const m = w.date.slice(0, 7);
    let g = groups.find((x) => x.m === m);
    if (!g) { g = { m, items: [] }; groups.push(g); }
    g.items.push(w);
  }

  return (
    <div className="page">
      <PageHeader back="/entreno" title="Historial" subtitle={`${data.length}${data.length === limit ? '+' : ''} entrenamientos`} />
      {!data.length && <Empty title="Sin entrenamientos todavía" text="Cuando finalices tu primer entreno aparecerá aquí con todos sus datos." />}
      {groups.map((g) => (
        <section key={g.m}>
          <h2 className="month-title">{monthLabel(`${g.m}-01`)} <span className="muted">· {g.items.length}</span></h2>
          <div className="list-card">
            {g.items.map((w) => (
              <Link key={w.id} to={`/entreno/historial/${w.id}`} className="list-row history-row">
                <div className="date-badge"><b>{Number(w.date.slice(8))}</b><span>{fmtDate(w.date).split(' ')[1]}</span></div>
                <div className="grow">
                  <strong>{w.routine_name} {w.feeling ? FEEL[w.feeling] : ''}</strong>
                  <span className="muted small">{durationWords(w.duration_sec)} · {w.total_sets} series · {n0(w.total_volume)} kg</span>
                  <span className="muted small ellipsis">{w.exercises.join(', ')}</span>
                </div>
                {w.prs > 0 && <span className="pr-badge">🏆 {w.prs}</span>}
                <ChevronRight size={16} className="muted" />
              </Link>
            ))}
          </div>
        </section>
      ))}
      {data.length === limit && <Button variant="secondary" block onClick={() => setLimit((l) => l + 30)}>Cargar más</Button>}
    </div>
  );
}
