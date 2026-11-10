import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '../components/ui.jsx';

const TIPS = [
  {
    t: 'Técnica antes que peso',
    b: ['Las primeras 4-6 semanas son para aprender los movimientos. Usa pesos con los que controles cada repetición.',
      'Si la técnica se rompe en las últimas repeticiones, el peso es demasiado alto.',
      'Graba alguna serie con el móvil y compárala con el vídeo de la guía.'],
  },
  {
    t: 'Cómo progresar: doble progresión',
    b: ['Cada ejercicio tiene un rango (por ejemplo 8-12 reps).',
      'Mantén el mismo peso hasta completar todas las series en el tope del rango (3×12).',
      'Entonces sube el peso lo mínimo posible (1-2,5 kg mancuernas, 2,5-5 kg máquinas) y vuelve a la parte baja del rango.',
      'La app te lo sugiere automáticamente al empezar cada entreno.'],
  },
  {
    t: '¿Cuánto debe costar cada serie?',
    b: ['Termina cada serie dejando 1-3 repeticiones “en la recámara” (RIR 1-3).',
      'No hace falta llegar al fallo, sobre todo en ejercicios grandes como sentadilla o peso muerto.'],
  },
  {
    t: 'Calentamiento en 5 minutos',
    b: ['3-5 minutos de cardio suave (bici, elíptica, caminar en cinta inclinada).',
      'Antes del primer ejercicio: 1-2 series ligeras de aproximación (50% y 75% del peso de trabajo) de 5-8 repeticiones.'],
  },
  {
    t: 'Descansos',
    b: ['Ejercicios grandes (prensa, sentadilla, press): 2 minutos.',
      'Ejercicios pequeños (curl, elevaciones, gemelos): 60-90 segundos.',
      'El temporizador arranca solo al marcar una serie.'],
  },
  {
    t: 'Agujetas y dolor',
    b: ['Las agujetas las primeras semanas son normales y bajan a medida que te adaptas. No son señal de buen entreno.',
      'Dolor punzante o en articulaciones no es normal: para, baja peso o cambia el ejercicio.'],
  },
  {
    t: 'Comer para crecer',
    b: ['Lo más importante: llegar a tu proteína diaria (≈2 g por kg) y comer suficiente (ligero superávit).',
      'Reparte la proteína en 3-5 comidas. Un batido es una herramienta cómoda, no magia.',
      'Si en 3 semanas tu peso no sube nada, añade unas 150-200 kcal al día (ej. crema de arroz con plátano).'],
  },
  {
    t: 'Creatina',
    b: ['Creatina monohidrato, 3-5 g al día, todos los días. No hace falta fase de carga.',
      'La hora da igual; lo importante es la constancia. Activa el recordatorio diario.',
      'Es el suplemento con más evidencia para ganar fuerza y masa muscular. Puede subir 1-2 kg de agua intramuscular al principio: es normal.'],
  },
  {
    t: 'Dormir es entrenar',
    b: ['7-9 horas. Con menos de 6 h la fuerza y la recuperación caen claramente.',
      'Horario regular, habitación oscura y fresca, pantallas fuera 30 min antes.'],
  },
  {
    t: 'Constancia: el factor nº 1',
    b: ['Un entreno mediocre que haces vale más que uno perfecto que te saltas.',
      'Si un día no tienes ganas, ve y haz solo los 2 primeros ejercicios. Casi siempre acabarás el entreno.',
      'Una mala semana no rompe nada: tienes comodines de racha y el total de entrenos nunca se resetea.'],
  },
  {
    t: 'Expectativas realistas',
    b: ['Primer año bien hecho: en torno a 0,5-1 kg de músculo al mes al principio, después menos.',
      'La fuerza subirá rápido los primeros meses (adaptación neural). Disfrútalo.',
      'Compara fotos y medidas cada 4 semanas, no el espejo de cada día.'],
  },
  {
    t: 'Normas del gimnasio',
    b: ['Recoge los discos y mancuernas. Limpia la máquina después de usarla.',
      'Si alguien está usando una máquina, pregunta si puedes alternar series.',
      'Pide ayuda al monitor para ajustar las máquinas la primera vez.'],
  },
];

export default function Tips() {
  const [open, setOpen] = useState(0);
  return (
    <div className="page">
      <PageHeader back title="Consejos para principiantes" subtitle="Lo esencial para empezar bien y no abandonar" />
      <div className="accordion">
        {TIPS.map((x, i) => (
          <div key={x.t} className={`acc-item ${open === i ? 'open' : ''}`}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span>{x.t}</span><ChevronDown size={18} />
            </button>
            {open === i && <ul>{x.b.map((b) => <li key={b}>{b}</li>)}</ul>}
          </div>
        ))}
      </div>
    </div>
  );
}
