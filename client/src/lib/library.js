import { api } from './api.js';

let cache = null;
let pending = null;

/** Biblioteca de ejercicios (estática), cacheada en memoria. */
export function loadLibrary() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api.get('/library').then((d) => {
      cache = { ...d, map: Object.fromEntries(d.exercises.map((e) => [e.id, e])) };
      return cache;
    }).finally(() => { pending = null; });
  }
  return pending;
}

export const libraryCache = () => cache;

export const imgSrc = (img, frame = 0) => (img ? `/exercises/${img}/${frame}.jpg` : null);
