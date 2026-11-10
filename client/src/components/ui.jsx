import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Flag, Dumbbell, Medal, Trophy, Calendar, Flame, Zap, Weight, Pill, Beef, Droplet, Camera, Ruler, Target, RotateCcw,
  Sunrise, Moon, Footprints, Leaf, StretchHorizontal, Check, BookOpen, Coffee, Heart, Star, Bed, Apple, X, ChevronLeft, Minus, Plus, Sun,
  Activity, Smartphone, GlassWater, Salad,
} from 'lucide-react';

export const ICONS = {
  flag: Flag, dumbbell: Dumbbell, medal: Medal, trophy: Trophy, calendar: Calendar, flame: Flame, zap: Zap, weight: Weight,
  pill: Pill, beef: Beef, droplet: Droplet, camera: Camera, ruler: Ruler, target: Target, rotate: RotateCcw, sunrise: Sunrise,
  moon: Moon, footprints: Footprints, leaf: Leaf, stretch: StretchHorizontal, check: Check, book: BookOpen, coffee: Coffee,
  heart: Heart, star: Star, bed: Bed, apple: Apple, sun: Sun, activity: Activity, phone: Smartphone, water: GlassWater, salad: Salad,
};
export const HABIT_ICONS = ['check', 'moon', 'footprints', 'stretch', 'leaf', 'book', 'water', 'apple', 'salad', 'sun', 'heart', 'phone', 'activity', 'coffee'];

export function Icon({ name, size = 18, ...p }) {
  const C = ICONS[name] || Check;
  return <C size={size} strokeWidth={2} {...p} />;
}

export function Card({ className = '', children, onClick, as: Tag = 'div', ...p }) {
  return (
    <Tag className={`card ${onClick ? 'card-tap' : ''} ${className}`} onClick={onClick} {...p}>
      {children}
    </Tag>
  );
}

export function Button({ variant = 'primary', size = 'md', block, loading, className = '', children, ...p }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`} disabled={loading || p.disabled} {...p}>
      {loading ? <span className="spinner" aria-hidden /> : children}
    </button>
  );
}

export function IconButton({ label, className = '', children, ...p }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...p}>
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, back, right, large = true }) {
  const nav = useNavigate();
  return (
    <header className={`page-header ${large ? 'large' : ''}`}>
      <div className="page-header-row">
        {back ? (
          <button type="button" className="back-btn" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
            <ChevronLeft size={22} /> <span>Atrás</span>
          </button>
        ) : <span />}
        <div className="page-header-actions">{right}</div>
      </div>
      {title && <h1 className="page-title">{title}</h1>}
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </header>
  );
}

/** Hoja inferior estilo iOS. */
export function Sheet({ open, onClose, title, children, footer, tall }) {
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setVisible(true); setClosing(false); }
    else if (visible) {
      setClosing(true);
      const t = setTimeout(() => { setVisible(false); setClosing(false); }, 220);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [visible, onClose]);

  if (!visible) return null;
  return createPortal(
    <div className={`sheet-root ${closing ? 'closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className={`sheet ${tall ? 'sheet-tall' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grabber" />
        {title && (
          <div className="sheet-head">
            <h2>{title}</h2>
            <IconButton label="Cerrar" onClick={onClose}><X size={20} /></IconButton>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Diálogo de confirmación basado en promesas. */
export function useConfirm() {
  const [cfg, setCfg] = useState(null);
  const resolver = useRef(null);
  const ask = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setCfg(typeof opts === 'string' ? { title: opts } : opts);
  }), []);
  const close = (v) => { resolver.current?.(v); setCfg(null); };
  const el = (
    <Sheet open={!!cfg} onClose={() => close(false)} title={cfg?.title}>
      {cfg?.message && <p className="muted" style={{ marginTop: 0 }}>{cfg.message}</p>}
      <div className="stack-sm" style={{ marginTop: 16 }}>
        <Button variant={cfg?.danger ? 'danger' : 'primary'} block onClick={() => close(true)}>{cfg?.confirm || 'Confirmar'}</Button>
        <Button variant="secondary" block onClick={() => close(false)}>Cancelar</Button>
      </div>
    </Sheet>
  );
  return [el, ask];
}

export function Field({ label, hint, suffix, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      <span className="field-control">
        {children}
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Ring({ value = 0, max = 1, size = 64, stroke = 7, color = 'var(--accent)', children, track = 'var(--ring-track)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-progress" />
      </svg>
      {children && <div className="ring-center">{children}</div>}
    </div>
  );
}

export function Bar({ value = 0, max = 1, color = 'var(--accent)', height = 6 }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="bar" style={{ height }}>
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, format = (v) => v, label }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" aria-label="Menos" onClick={() => set((value || 0) - step)}><Minus size={18} /></button>
      <span className="stepper-value">{format(value)}</span>
      <button type="button" aria-label="Más" onClick={() => set((value || 0) + step)}><Plus size={18} /></button>
    </div>
  );
}

export function Empty({ icon = 'dumbbell', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <div className="skeleton" style={{ height: 120 }} />
      <div className="skeleton" style={{ height: 80 }} />
      <div className="skeleton" style={{ height: 160 }} />
    </div>
  );
}

export function ErrorState({ error, retry }) {
  return (
    <Empty icon="rotate" title="No se ha podido cargar" text={error?.message} action={retry && <Button variant="secondary" onClick={retry}>Reintentar</Button>} />
  );
}

export function Delta({ value, unit = '', invert = false, digits = 1 }) {
  if (value == null || Number.isNaN(value)) return null;
  const v = Math.round(value * 10 ** digits) / 10 ** digits;
  if (v === 0) return null;
  const good = invert ? v < 0 : v > 0;
  return <span className={`delta ${good ? 'delta-up' : 'delta-down'}`}>{v > 0 ? '+' : '−'}{Math.abs(v).toLocaleString('es-ES')}{unit && ` ${unit}`}</span>;
}

export function Chip({ active, children, ...p }) {
  return <button type="button" className={`chip ${active ? 'active' : ''}`} {...p}>{children}</button>;
}
