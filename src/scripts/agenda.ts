// Lógica pura del flujo de reserva: disponibilidad determinística, validación, códigos e .ics.
// No hace llamadas de red: todo ocurre en el navegador.

export interface Especialidad { slug: string; nombre: string; duracion: number; valorTexto: string; valorNota: string }
export interface Profesional { id: string; nombre: string; nombreCorto: string; titulo: string; especialidad: string; dias: number[]; imagen: string }
export interface HorarioDia { dia: number; abre: string; cierra: string }
export interface DatosAgenda {
  especialidades: Especialidad[];
  equipo: Profesional[];
  horario: HorarioDia[];
  festivos: string[];
  centro: { nombreCorto: string; nombre: string; direccion: string; whatsapp: string; sitio: string };
}
export interface Bloque { hora: string; libre: boolean; profesionalId: string | null }
export interface Reserva {
  codigo: string; especialidad: string; profesionalId: string; fecha: string; hora: string; duracion: number;
  nombre: string; telefono: string; correo: string; motivo: string; recordatorios: boolean; aceptaPrivacidad: true; creada: string;
}

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const dos = (n: number) => String(n).padStart(2, '0');
export const fechaIso = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const desdeIso = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
export const aMinutos = (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; };
export const aHora = (min: number) => `${dos(Math.floor(min / 60))}:${dos(min % 60)}`;
export const horaTexto = (h: string) => h.replace(/^0/, '');
export const fechaLarga = (s: string) => { const d = desdeIso(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };

/** Hash FNV-1a: el mismo texto siempre da el mismo número (disponibilidad sin aleatoriedad). */
function hash(texto: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const PORCENTAJE_OCUPADO = 38;

/** Próximos `n` días a partir de hoy (incluido). */
export function proximosDias(n = 14, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Array.from({ length: n }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
}

export function crearAgenda(datos: DatosAgenda, reservasPropias: () => Reserva[]) {
  const especialidad = (slug: string) => datos.especialidades.find((e) => e.slug === slug)!;
  const profesional = (id: string) => datos.equipo.find((p) => p.id === id);
  const profesionalesDe = (slug: string) => datos.equipo.filter((p) => p.especialidad === slug);

  /** Bloques de un día para una especialidad y un profesional (o «cualquiera» = null). */
  function bloques(slug: string, profesionalId: string | null, fecha: Date, ahora = new Date()): Bloque[] {
    const iso = fechaIso(fecha);
    const h = datos.horario.find((x) => x.dia === fecha.getDay());
    if (!h || datos.festivos.includes(iso)) return [];
    const candidatos = (profesionalId ? [profesional(profesionalId)!] : profesionalesDe(slug)).filter((p) => p.dias.includes(fecha.getDay()));
    if (!candidatos.length) return [];

    const dur = especialidad(slug).duracion;
    const esHoy = iso === fechaIso(ahora);
    const limiteHoy = ahora.getHours() * 60 + ahora.getMinutes() + 60; // al menos 1 hora de anticipación
    const tomadas = reservasPropias();
    const lista: Bloque[] = [];
    for (let m = aMinutos(h.abre); m + dur <= aMinutos(h.cierra); m += dur) {
      const hora = aHora(m);
      if (esHoy && m < limiteHoy) continue;
      const libre = candidatos.find((p) =>
        hash(`${iso}|${p.id}|${hora}`) % 100 >= PORCENTAJE_OCUPADO &&
        !tomadas.some((r) => r.profesionalId === p.id && r.fecha === iso && r.hora === hora),
      );
      lista.push({ hora, libre: !!libre, profesionalId: libre?.id ?? null });
    }
    return lista;
  }

  /** Estado de cada uno de los próximos 14 días. */
  function dias(slug: string, profesionalId: string | null) {
    return proximosDias().map((d) => {
      const iso = fechaIso(d);
      const abierto = datos.horario.some((x) => x.dia === d.getDay()) && !datos.festivos.includes(iso);
      const b = bloques(slug, profesionalId, d);
      const libres = b.filter((x) => x.libre).length;
      let motivo = '';
      if (!abierto) motivo = datos.festivos.includes(iso) ? 'Festivo' : 'Cerrado';
      else if (!b.length) motivo = 'No atiende';
      else if (!libres) motivo = 'Sin horas';
      return { fecha: d, iso, libres, motivo };
    });
  }

  return { especialidad, profesional, profesionalesDe, bloques, dias };
}

/** Acepta «+56 9 1234 5678», «+56912345678», «912345678» o «9 1234 5678». Devuelve el número normalizado o null. */
export function normalizarCelular(valor: string) {
  const d = valor.replace(/[\s\-().]/g, '');
  const m = d.match(/^(?:\+?56)?(9\d{8})$/);
  if (!m) return null;
  const n = m[1];
  return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`;
}

export const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

/** Código ficticio con el formato CD-DDMM-NNNN (día y mes de la hora reservada + correlativo local). */
export function generarCodigo(fecha: string, correlativo: number) {
  const [, m, d] = fecha.split('-');
  return `CD-${d}${m}-${String(correlativo).padStart(4, '0')}`;
}

export function mensajeConfirmacion(r: Reserva, datos: DatosAgenda) {
  const esp = datos.especialidades.find((e) => e.slug === r.especialidad)!;
  const prof = datos.equipo.find((p) => p.id === r.profesionalId)!;
  return `Hola, quiero confirmar mi hora en ${datos.centro.nombreCorto}: ${esp.nombre} con ${prof.nombre} el ${fechaLarga(r.fecha)} a las ${horaTexto(r.hora)}. Código ${r.codigo}.`;
}

export function enlaceWhatsapp(numero: string, mensaje: string) {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
}

/** Archivo .ics (iCalendar) generado en el navegador. Hora local «flotante», sin zona horaria. */
export function generarIcs(r: Reserva, datos: DatosAgenda) {
  const esp = datos.especialidades.find((e) => e.slug === r.especialidad)!;
  const prof = datos.equipo.find((p) => p.id === r.profesionalId)!;
  const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const inicio = aMinutos(r.hora);
  const f = r.fecha.replace(/-/g, '');
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Centro Demo//Reserva de demostracion//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${r.codigo}@centrodemo.example`,
    `DTSTAMP:${ahora}`,
    `DTSTART:${f}T${aHora(inicio).replace(':', '')}00`,
    `DTEND:${f}T${aHora(inicio + r.duracion).replace(':', '')}00`,
    `SUMMARY:${escapar(`${esp.nombre} en ${datos.centro.nombreCorto} (demostración)`)}`,
    `DESCRIPTION:${escapar(`Profesional: ${prof.nombre}\nCódigo: ${r.codigo}\nReserva ficticia creada en un sitio de demostración.`)}`,
    `LOCATION:${escapar(datos.centro.direccion)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapar(`Tu hora de ${esp.nombre.toLowerCase()} es en 2 horas`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ---------- Almacenamiento local (solo este navegador) ----------
const CLAVE_RESERVAS = 'centroDemo.reservas';
const CLAVE_CORRELATIVO = 'centroDemo.correlativo';

export const almacen = {
  leer(): Reserva[] {
    try { return JSON.parse(localStorage.getItem(CLAVE_RESERVAS) ?? '[]'); } catch { return []; }
  },
  guardar(lista: Reserva[]) {
    try { localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(lista)); } catch { /* almacenamiento no disponible */ }
  },
  siguienteCorrelativo() {
    let n = 41;
    try { n = Number(localStorage.getItem(CLAVE_CORRELATIVO) ?? '41') + 1; localStorage.setItem(CLAVE_CORRELATIVO, String(n)); } catch { n += Math.floor(Math.random() * 900); }
    return n;
  },
  borrarTodo() {
    try { Object.keys(localStorage).filter((k) => k.startsWith('centroDemo.')).forEach((k) => localStorage.removeItem(k)); } catch { /* nada que borrar */ }
  },
};
