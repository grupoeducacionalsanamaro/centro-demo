// Funciones que convierten los datos de centro.json en textos listos para mostrar.
// Se usan en las páginas (vía src/lib/datos.js) y en scripts/generar-base.mjs,
// por eso reciben los datos como parámetro y no importan el JSON directamente.

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function formatoPeso(n) {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatoHora(h) {
  return h.replace(/^0/, '');
}

/** Une una lista: ["a","b","c"] → "a, b y c". */
export function unirLista(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' y ' + items.at(-1);
}

/** [1,2,3,4,5] → "lunes a viernes"; [1,3,5] → "lunes, miércoles y viernes". */
export function textoDias(dias, plural = false) {
  const nombres = plural ? DIAS_PLURAL : DIAS;
  const orden = [...dias].sort((a, b) => a - b);
  const consecutivos = orden.every((d, i) => i === 0 || d === orden[i - 1] + 1);
  if (orden.length >= 3 && consecutivos) return `${DIAS[orden[0]]} a ${DIAS[orden.at(-1)]}`;
  return unirLista(orden.map((d) => nombres[d]));
}

export function crearCentro(data) {
  const { centro, especialidades, equipo, preguntasFrecuentes } = data;

  // Agrupa los días con el mismo horario: [{ dias: "Lunes a viernes", horas: "8:30 a 20:00" }, ...]
  const grupos = [];
  for (const h of centro.horario) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.abre === h.abre && ultimo.cierra === h.cierra && ultimo.dias.at(-1) === h.dia - 1) {
      ultimo.dias.push(h.dia);
    } else {
      grupos.push({ dias: [h.dia], abre: h.abre, cierra: h.cierra });
    }
  }
  const horarioResumen = [
    ...grupos.map((g) => ({
      dias: mayus(textoDias(g.dias, true)),
      horas: `${formatoHora(g.abre)} a ${formatoHora(g.cierra)}`,
    })),
    { dias: 'Domingos y festivos', horas: 'Cerrado' },
  ];
  const horarioTexto = unirLista(
    grupos.map((g) => `${g.dias.length > 1 ? 'de ' : 'los '}${textoDias(g.dias, true)} de ${formatoHora(g.abre)} a ${formatoHora(g.cierra)}`),
  );
  const diasAbiertos = centro.horario.map((h) => h.dia);
  const diasAtencionTexto = textoDias(diasAbiertos);

  const direccionCompleta = `${centro.direccion.calle}, ${centro.direccion.comuna}, ${centro.direccion.ciudad}`;
  const sitioCorto = centro.sitioUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const numeroWhatsapp = centro.whatsapp.replace(/\D/g, '');
  const numeroTelefono = centro.telefono.replace(/[^\d+]/g, '');

  const waLink = (mensaje) => `https://wa.me/${numeroWhatsapp}${mensaje ? '?text=' + encodeURIComponent(mensaje) : ''}`;
  const telLink = `tel:${numeroTelefono}`;

  const porValor = [...especialidades].sort((a, b) => a.valor - b.valor);
  const valorMinimo = `${formatoPeso(porValor[0].valor)} (${porValor[0].nombre.toLowerCase()})`;
  const valorMaximo = `${formatoPeso(porValor.at(-1).valor)} (${porValor.at(-1).nombre.toLowerCase()})`;

  const variables = {
    horario: horarioTexto,
    direccion: `${direccionCompleta} (${centro.direccion.nota.toLowerCase()})`,
    estacionamiento: centro.estacionamiento,
    accesibilidad: centro.accesibilidad,
    telefono: centro.telefono,
    whatsapp: centro.whatsapp,
    correo: centro.correo,
    sitio: sitioCorto,
    anticipacion: centro.anticipacionCancelacion,
    mediosPago: unirLista(centro.mediosPago),
    valorMinimo,
    valorMaximo,
  };
  const rellenar = (texto) => texto.replace(/\{(\w+)\}/g, (_, k) => variables[k] ?? `{${k}}`);

  const equipoCompleto = equipo.map((p) => ({
    ...p,
    diasTexto: mayus(textoDias(p.dias)),
    especialidadNombre: especialidades.find((e) => e.slug === p.especialidad).nombre,
    nombrePila: p.nombre.split(' ').slice(1, 2).join(' '),
  }));

  const especialidadesCompletas = especialidades.map((e) => ({
    ...e,
    valorTexto: formatoPeso(e.valor),
    profesionales: equipoCompleto.filter((p) => p.especialidad === e.slug),
  }));

  const faq = preguntasFrecuentes.map((f) => ({ ...f, respuesta: rellenar(f.respuesta) }));

  return {
    centro,
    especialidades: especialidadesCompletas,
    equipo: equipoCompleto,
    faq,
    horarioResumen,
    horarioTexto,
    diasAtencionTexto,
    direccionCompleta,
    sitioCorto,
    numeroWhatsapp,
    waLink,
    telLink,
    rellenar,
    especialidad: (slug) => especialidadesCompletas.find((e) => e.slug === slug),
    profesional: (id) => equipoCompleto.find((p) => p.id === id),
    profesionalesDe: (slug) => equipoCompleto.filter((p) => p.especialidad === slug),
    mensajeWhatsapp: `Hola, quiero hacer una consulta en ${centro.nombreCorto}.`,
  };
}
