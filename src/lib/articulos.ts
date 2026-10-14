import { getCollection, type CollectionEntry } from 'astro:content';
import { C, MESES } from './datos.js';

export type Articulo = ReturnType<typeof enriquecer>;

function enriquecer(a: CollectionEntry<'educacion'>) {
  const palabras = (a.body ?? '').split(/\s+/).filter(Boolean).length;
  const autor = C.profesional(a.data.autor);
  const especialidad = C.especialidad(a.data.especialidad);
  const f = a.data.fecha;
  return {
    ...a,
    slug: a.id,
    minutosLectura: Math.max(1, Math.round(palabras / 200)),
    autor,
    especialidadNombre: especialidad?.nombre ?? '',
    fechaTexto: `${f.getUTCDate()} de ${MESES[f.getUTCMonth()]} de ${f.getUTCFullYear()}`,
    fechaIso: f.toISOString().slice(0, 10),
  };
}

/** Artículos ordenados del más reciente al más antiguo. */
export async function obtenerArticulos() {
  const lista = await getCollection('educacion');
  return lista.map(enriquecer).sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
}
