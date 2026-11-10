import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { loadLibrary } from '../lib/library.js';
import { PageHeader, Chip, Loading } from '../components/ui.jsx';
import { ExerciseThumb, ExerciseInfoSheet } from '../components/exercise.jsx';

export default function Guide() {
  const [lib, setLib] = useState(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('Todos');
  const [sel, setSel] = useState(null);
  useEffect(() => { loadLibrary().then(setLib); }, []);
  const list = useMemo(() => {
    if (!lib) return [];
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return lib.exercises.filter((e) => (group === 'Todos' || e.group === group) && norm(`${e.name} ${e.muscles}`).includes(norm(q)));
  }, [lib, q, group]);

  return (
    <div className="page">
      <PageHeader back title="Guía de ejercicios" subtitle="Demostración, músculos implicados, técnica y vídeo" />
      {!lib ? <Loading /> : (
        <>
          <div className="search-box">
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio o músculo" />
          </div>
          <div className="chips scroll-x">{['Todos', ...lib.groups].map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}</div>
          <div className="guide-grid">
            {list.map((e) => (
              <button key={e.id} type="button" className="guide-item" onClick={() => setSel(e)}>
                <ExerciseThumb img={e.img} name={e.name} size={64} />
                <span className="grow">
                  <strong>{e.name}</strong>
                  <span className="muted small">{e.muscles}</span>
                  <span className="guide-tags"><span className="tag">{e.group}</span><span className="tag">{e.equipment}</span>{e.level !== 'principiante' && <span className="tag tag-warn">Intermedio</span>}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <ExerciseInfoSheet open={!!sel} onClose={() => setSel(null)} ex={sel} />
    </div>
  );
}
