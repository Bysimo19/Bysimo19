import { useEffect, useMemo, useRef, useState, useId } from 'react';

/** Ancho real del contenedor para dibujar el SVG sin deformar el texto. */
function useWidth(fallback = 340) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(160, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
import { fmtDate, n1 } from '../lib/format.js';

/** Escala "bonita" para el eje Y. */
function niceRange(min, max, ticks = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step0 = span / ticks;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks: out };
}

/**
 * Gráfico de línea con área, cruz y tooltip al tocar/pasar.
 * data: [{ x: 'YYYY-MM-DD', y: number }]
 */
export function LineChart({ data, height = 180, unit = '', color = 'var(--accent)', target, formatY = n1, zeroBased = false }) {
  const ref = useRef(null);
  const [wrapRef, W] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');
  const H = height, PL = 34, PR = 10, PT = 12, PB = 22;

  const pts = useMemo(() => data.filter((d) => d.y != null && !Number.isNaN(d.y)), [data]);
  if (pts.length === 0) return <div ref={wrapRef} className="chart-empty">Sin datos todavía</div>;

  const ys = pts.map((p) => p.y);
  if (target != null) ys.push(target);
  const rng = niceRange(zeroBased ? 0 : Math.min(...ys), Math.max(...ys));
  const xs = pts.map((_, i) => (pts.length === 1 ? (W - PL - PR) / 2 + PL : PL + (i / (pts.length - 1)) * (W - PL - PR)));
  const yOf = (v) => PT + (1 - (v - rng.lo) / (rng.hi - rng.lo)) * (H - PT - PB);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${yOf(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${H - PB} L${xs[0].toFixed(1)},${H - PB} Z`;

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = ((e.touches?.[0]?.clientX ?? e.clientX) - rect.left) * (W / rect.width);
    let best = 0;
    xs.forEach((x, i) => { if (Math.abs(x - cx) < Math.abs(xs[best] - cx)) best = i; });
    setHover(best);
  };

  const labelIdx = pts.length <= 1 ? [0] : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  const h = hover != null ? pts[hover] : null;

  return (
    <div className="chart" ref={wrapRef}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="chart-svg"
        onMouseMove={onMove} onTouchStart={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)} role="img"
        aria-label={`Gráfico: ${pts.length} registros, último ${formatY(pts[pts.length - 1].y)} ${unit}`}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {rng.ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={yOf(t)} y2={yOf(t)} className="chart-grid" />
            <text x={PL - 6} y={yOf(t) + 3} textAnchor="end" className="chart-axis">{formatY(t)}</text>
          </g>
        ))}
        {target != null && <line x1={PL} x2={W - PR} y1={yOf(target)} y2={yOf(target)} className="chart-target" />}
        {pts.length > 1 && <path d={area} fill={`url(#g${gid})`} />}
        {pts.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.length <= 12 && pts.map((p, i) => <circle key={i} cx={xs[i]} cy={yOf(p.y)} r="3" fill={color} className="chart-dot" />)}
        {labelIdx.map((i) => (
          <text key={i} x={xs[i]} y={H - 6} textAnchor={i === 0 && pts.length > 1 ? 'start' : i === pts.length - 1 && pts.length > 1 ? 'end' : 'middle'} className="chart-axis">
            {fmtDate(pts[i].x)}
          </text>
        ))}
        {h && (
          <g>
            <line x1={xs[hover]} x2={xs[hover]} y1={PT} y2={H - PB} className="chart-cross" />
            <circle cx={xs[hover]} cy={yOf(h.y)} r="5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: `${(xs[hover] / W) * 100}%` }}>
          <strong>{formatY(h.y)} {unit}</strong>
          <span>{fmtDate(h.x, { year: true })}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Barras verticales. data: [{ label, value, tip?, highlight? }]
 */
export function BarChart({ data, height = 140, color = 'var(--accent)', target, unit = '', format = n1 }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value || 0), target || 0);
  return (
    <div className="barchart" style={{ height }}>
      {target != null && <div className="barchart-target" style={{ bottom: `calc(${(target / max) * 100}% * (1 - 22 / ${height}) + 22px)` }} />}
      {data.map((d, i) => (
        <button type="button" key={i} className={`barchart-col ${hover === i ? 'hover' : ''}`}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(hover === i ? null : i)}
          aria-label={`${d.label}: ${format(d.value)} ${unit}`}>
          <div className="barchart-track">
            <div className="barchart-bar" style={{ height: `${((d.value || 0) / max) * 100}%`, background: d.color || color, opacity: d.dim ? 0.35 : 1 }} />
          </div>
          <span className="barchart-label">{d.label}</span>
          {hover === i && <span className="barchart-tip">{d.tip || `${format(d.value)} ${unit}`}</span>}
        </button>
      ))}
    </div>
  );
}

export function Sparkline({ values, width = 90, height = 32, color = 'var(--accent)' }) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return null;
  const min = Math.min(...v), max = Math.max(...v);
  const span = max - min || 1;
  const d = v.map((y, i) => `${i ? 'L' : 'M'}${((i / (v.length - 1)) * width).toFixed(1)},${(height - 3 - ((y - min) / span) * (height - 6)).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
