import { useEffect, useMemo, useState } from 'react';
import { Search, Video, Plus, Dumbbell } from 'lucide-react';
import { loadLibrary, imgSrc } from '../lib/library.js';
import { Sheet, Chip, Button } from './ui.jsx';

/** Demostración animada: alterna posición inicial y final del movimiento. */
export function ExerciseMedia({ img, name, animate = true, className = '' }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!img || !animate) return undefined;
    const id = setInterval(() => setFrame((f) => 1 - f), 1100);
    return () => clearInterval(id);
  }, [img, animate]);
  if (!img) {
    return <div className={`ex-media placeholder ${className}`}><Dumbbell size={40} /></div>;
  }
  return (
    <div className={`ex-media ${className}`}>
      <img src={imgSrc(img, 0)} alt={`${name}: posición inicial`} className={frame === 0 ? 'on' : ''} />
      <img src={imgSrc(img, 1)} alt={`${name}: posición final`} className={frame === 1 ? 'on' : ''} />
      {animate && <span className="ex-media-tag">{frame === 0 ? 'Inicio' : 'Final'}</span>}
    </div>
  );
}

export function ExerciseThumb({ img, name, size = 48 }) {
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      {img ? <img src={imgSrc(img)} alt="" loading="lazy" /> : <span>{name?.[0]}</span>}
    </span>
  );
}

/** Ficha del ejercicio: demostración, músculos, consejos y vídeo. */
export function ExerciseInfoSheet({ open, onClose, ex }) {
  if (!ex) return null;
  const tips = (Array.isArray(ex.tips) ? ex.tips : String(ex.tips || '').split('\n')).filter(Boolean);
  return (
    <Sheet open={open} onClose={onClose} title={ex.name} tall>
      <ExerciseMedia img={ex.img ?? ex.image} name={ex.name} />
      <div className="ex-info">
        {ex.muscles && <p><span className="field-label">Músculos</span>{ex.muscles}</p>}
        {ex.equipment && <p><span className="field-label">Material</span>{ex.equipment}</p>}
        {(ex.reps_min || ex.rest_sec) && (
          <div className="ex-pills">
            {ex.sets && <span>{ex.sets} series</span>}
            {ex.reps_min && <span>{ex.reps_min}-{ex.reps_max} {ex.unit === 's' ? 's' : 'reps'}</span>}
            {ex.rest_sec != null && <span>{ex.rest_sec}s descanso</span>}
          </div>
        )}
        {tips.length > 0 && (
          <>
            <span className="field-label">Técnica</span>
            <ol className="tips">{tips.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </>
        )}
        {(ex.video ?? ex.video_url) && (
          <a className="btn btn-secondary btn-md btn-block" href={ex.video ?? ex.video_url} target="_blank" rel="noreferrer noopener">
            <Video size={17} /> Ver vídeo de la técnica
          </a>
        )}
      </div>
    </Sheet>
  );
}

/** Selector de ejercicios de la biblioteca, con búsqueda, filtro por grupo y ejercicio personalizado. */
export function ExercisePicker({ open, onClose, onPick, title = 'Añadir ejercicio' }) {
  const [lib, setLib] = useState(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('Todos');
  const [info, setInfo] = useState(null);
  useEffect(() => { if (open) { loadLibrary().then(setLib); setQ(''); } }, [open]);
  const list = useMemo(() => {
    if (!lib) return [];
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const nq = norm(q);
    return lib.exercises.filter((e) => (group === 'Todos' || e.group === group) && (!nq || norm(`${e.name} ${e.muscles}`).includes(nq)));
  }, [lib, q, group]);

  return (
    <Sheet open={open} onClose={onClose} title={title} tall>
      <div className="search-box">
        <Search size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio o músculo" />
      </div>
      <div className="chips scroll-x">
        {['Todos', ...(lib?.groups || [])].map((g) => <Chip key={g} active={group === g} onClick={() => setGroup(g)}>{g}</Chip>)}
      </div>
      <div className="picker-list">
        {list.map((e) => (
          <div key={e.id} className="picker-row">
            <button type="button" className="picker-main" onClick={() => setInfo(e)}>
              <ExerciseThumb img={e.img} name={e.name} />
              <span className="grow">
                <strong>{e.name}</strong>
                <span className="muted small">{e.muscles}</span>
                {e.level !== 'principiante' && <span className="tag tag-warn">Intermedio</span>}
              </span>
            </button>
            <button type="button" className="picker-add" aria-label={`Añadir ${e.name}`} onClick={() => onPick({ library_id: e.id, name: e.name })}><Plus size={20} /></button>
          </div>
        ))}
        {q.trim() && (
          <Button variant="secondary" block onClick={() => onPick({ library_id: null, name: q.trim() })}>
            <Plus size={16} /> Crear ejercicio personalizado “{q.trim()}”
          </Button>
        )}
      </div>
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} ex={info} />
    </Sheet>
  );
}
