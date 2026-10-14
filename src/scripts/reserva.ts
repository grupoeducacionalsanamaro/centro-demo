// Controlador de la página /agendar. Todo ocurre en el navegador: no hay llamadas de red.
import {
  crearAgenda, almacen, normalizarCelular, correoValido, generarCodigo, mensajeConfirmacion, enlaceWhatsapp,
  generarIcs, fechaLarga, horaTexto, desdeIso, DIAS_CORTOS, MESES_CORTOS, DIAS, MESES,
  type DatosAgenda, type Reserva,
} from './agenda';

const datos: DatosAgenda = JSON.parse(document.getElementById('datos-agenda')!.textContent!);
const agenda = crearAgenda(datos, () => almacen.leer());
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const CUALQUIERA = 'cualquiera';
const estado = {
  paso: 1,
  especialidad: '' as string,
  profesional: '' as string, // id o CUALQUIERA
  dia: '' as string,
  hora: '' as string,
  asignado: '' as string, // profesional que atiende el bloque elegido
};

const form = $<HTMLFormElement>('form-reserva');
const flujo = $('flujo');
const confirmacion = $('confirmacion');
const btnVolver = $<HTMLButtonElement>('btn-volver');
const btnSeguir = $<HTMLButtonElement>('btn-seguir');
const btnConfirmar = $<HTMLButtonElement>('btn-confirmar');

// ---------- Navegación entre pasos ----------
function irA(paso: number, enfocar = true) {
  estado.paso = paso;
  document.querySelectorAll<HTMLElement>('.paso').forEach((s) => (s.hidden = Number(s.dataset.paso) !== paso));
  document.querySelectorAll<HTMLElement>('.progreso__paso').forEach((li) => {
    const i = Number(li.dataset.indice);
    li.classList.toggle('hecho', i < paso);
    if (i === paso) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('barra').style.width = `${paso * 25}%`;
  btnVolver.hidden = paso === 1;
  btnSeguir.hidden = paso === 4;
  btnConfirmar.hidden = paso !== 4;
  document.querySelectorAll<HTMLElement>('.error-paso').forEach((e) => (e.hidden = true));
  if (paso === 2) pintarProfesionales();
  if (paso === 3) pintarDias();
  if (enfocar) {
    const titulo = $(`titulo-${paso}`);
    titulo.focus({ preventScroll: true });
    flujo.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
}

function pasoValido(paso: number) {
  if (paso === 1) return !!estado.especialidad;
  if (paso === 2) return !!estado.profesional;
  if (paso === 3) return !!estado.dia && !!estado.hora;
  return true;
}

btnSeguir.addEventListener('click', () => {
  if (!pasoValido(estado.paso)) {
    const error = $(`error-${estado.paso}`);
    error.hidden = false;
    return;
  }
  irA(estado.paso + 1);
});
btnVolver.addEventListener('click', () => irA(estado.paso - 1));

// ---------- Paso 1: especialidad ----------
form.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'especialidad') {
    estado.especialidad = t.value;
    estado.profesional = '';
    estado.dia = estado.hora = estado.asignado = '';
    $('error-1').hidden = true;
  } else if (t.name === 'profesional') {
    estado.profesional = t.value;
    estado.dia = estado.hora = estado.asignado = '';
    $('error-2').hidden = true;
  } else if (t.name === 'dia') {
    estado.dia = t.value;
    estado.hora = estado.asignado = '';
    pintarBloques();
  } else if (t.name === 'hora') {
    estado.hora = t.value;
    estado.asignado = t.dataset.profesional ?? '';
    $('error-3').hidden = true;
  }
  pintarResumen();
});

// ---------- Paso 2: profesional ----------
function pintarProfesionales() {
  const lista = agenda.profesionalesDe(estado.especialidad);
  const contenedor = $('opciones-profesional');
  const opcion = (valor: string, titulo: string, detalle: string, visual: string) => `
    <label class="opcion">
      <input type="radio" name="profesional" value="${valor}" ${estado.profesional === valor ? 'checked' : ''} />
      ${visual}
      <span class="opcion__texto"><strong>${esc(titulo)}</strong><span>${esc(detalle)}</span></span>
      <svg class="icono opcion__check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
    </label>`;
  const iconoPersonas = '<span class="opcion__icono"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg></span>';
  const diasTexto = (dias: number[]) => {
    const n = [...dias].sort((a, b) => a - b);
    const seguidos = n.length >= 3 && n.every((d, i) => i === 0 || d === n[i - 1] + 1);
    const t = seguidos ? `${DIAS[n[0]]} a ${DIAS[n.at(-1)!]}` : n.map((d) => DIAS[d]).join(', ').replace(/, ([^,]*)$/, ' y $1');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  contenedor.innerHTML =
    lista.map((p) => opcion(p.id, p.nombre, `${p.titulo} · ${diasTexto(p.dias)}`, `<img class="opcion__avatar" src="/images/${p.imagen}.webp" width="52" height="52" alt="" />`)).join('') +
    opcion(CUALQUIERA, 'Cualquier profesional disponible', 'Te mostramos todas las horas libres de la especialidad.', iconoPersonas);
}

// ---------- Paso 3: día y hora ----------
function profesionalFiltro() {
  return estado.profesional === CUALQUIERA ? null : estado.profesional;
}

function pintarDias() {
  const esp = agenda.especialidad(estado.especialidad);
  const prof = profesionalFiltro() ? agenda.profesional(estado.profesional)! : null;
  $('bajada-3').textContent = `${esp.nombre} · ${prof ? prof.nombre : 'cualquier profesional disponible'} · bloques de ${esp.duracion} minutos.`;

  const dias = agenda.dias(estado.especialidad, profesionalFiltro());
  if (estado.dia && !dias.some((d) => d.iso === estado.dia && d.libres)) estado.dia = estado.hora = '';
  $('dias').innerHTML = dias.map((d) => {
    const disponible = d.libres > 0;
    const etiqueta = `${DIAS[d.fecha.getDay()]} ${d.fecha.getDate()} de ${MESES[d.fecha.getMonth()]}: ${disponible ? `${d.libres} ${d.libres === 1 ? 'hora disponible' : 'horas disponibles'}` : d.motivo.toLowerCase()}`;
    return `
      <label class="dia" title="${etiqueta}">
        <input type="radio" name="dia" value="${d.iso}" ${disponible ? '' : 'disabled'} ${estado.dia === d.iso ? 'checked' : ''} aria-label="${etiqueta}" />
        <span class="dia__semana" aria-hidden="true">${DIAS_CORTOS[d.fecha.getDay()]}</span>
        <span class="dia__numero" aria-hidden="true">${d.fecha.getDate()}</span>
        <span class="dia__estado" aria-hidden="true">${disponible ? MESES_CORTOS[d.fecha.getMonth()] : d.motivo}</span>
      </label>`;
  }).join('');
  pintarBloques();
}

function pintarBloques() {
  const contenedor = $('bloques');
  const leyenda = $('leyenda-horas');
  if (!estado.dia) {
    leyenda.textContent = 'Hora';
    contenedor.innerHTML = '<p class="bloques__vacio">Elige un día para ver las horas disponibles.</p>';
    return;
  }
  leyenda.textContent = `Hora · ${fechaLarga(estado.dia)}`;
  const bloques = agenda.bloques(estado.especialidad, profesionalFiltro(), desdeIso(estado.dia));
  const grupo = (titulo: string, lista: typeof bloques) => !lista.length ? '' : `
    <div class="bloques__grupo">
      <h3>${titulo}</h3>
      <div class="bloques__lista">
        ${lista.map((b) => `
          <label class="bloque">
            <input type="radio" name="hora" value="${b.hora}" data-profesional="${b.profesionalId ?? ''}" ${b.libre ? '' : 'disabled'} ${estado.hora === b.hora ? 'checked' : ''}
              aria-label="${horaTexto(b.hora)}${b.libre ? '' : ', ocupado'}" />
            <span aria-hidden="true">${horaTexto(b.hora)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  contenedor.innerHTML = grupo('Mañana', bloques.filter((b) => b.hora < '13:00')) + grupo('Tarde', bloques.filter((b) => b.hora >= '13:00'));
}

// ---------- Resumen lateral ----------
function pintarResumen() {
  const esp = estado.especialidad ? agenda.especialidad(estado.especialidad) : null;
  const profId = estado.asignado || (estado.profesional !== CUALQUIERA ? estado.profesional : '');
  const prof = profId ? agenda.profesional(profId) : null;
  const valores: Record<string, string> = {
    especialidad: esp?.nombre ?? '—',
    profesional: prof?.nombre ?? (estado.profesional === CUALQUIERA ? 'Cualquiera disponible' : '—'),
    dia: estado.dia ? fechaLarga(estado.dia) : '—',
    hora: estado.hora ? `${horaTexto(estado.hora)} hrs` : '—',
    duracion: esp ? `${esp.duracion} min` : '—',
    valor: esp ? `${esp.valorTexto} (${esp.valorNota})` : '—',
  };
  document.querySelectorAll<HTMLElement>('#resumen [data-r]').forEach((dd) => (dd.textContent = valores[dd.dataset.r!]));
}

// ---------- Paso 4: datos y confirmación ----------
function validarCampo(id: string, valido: boolean) {
  const campo = $<HTMLInputElement>(id);
  campo.setAttribute('aria-invalid', String(!valido));
  $(`${id}-error`).hidden = valido;
  return valido;
}

// Si un campo ya marcado con error se corrige, el mensaje desaparece al instante.
const reglas: Record<string, () => boolean> = {
  'r-nombre': () => $<HTMLInputElement>('r-nombre').value.trim().length >= 3,
  'r-telefono': () => !!normalizarCelular($<HTMLInputElement>('r-telefono').value),
  'r-correo': () => { const c = $<HTMLInputElement>('r-correo').value.trim(); return !c || correoValido(c); },
  'r-motivo': () => !!$<HTMLSelectElement>('r-motivo').value,
  'r-privacidad': () => $<HTMLInputElement>('r-privacidad').checked,
};
['input', 'change'].forEach((tipo) => form.addEventListener(tipo, (e) => {
  const t = e.target as HTMLElement;
  if (reglas[t.id] && t.getAttribute('aria-invalid') === 'true' && reglas[t.id]()) validarCampo(t.id, true);
}));

form.addEventListener('submit', (e) => {
  e.preventDefault(); // nunca se envía: no hay servidor
  if (estado.paso !== 4) return btnSeguir.click();

  const nombre = $<HTMLInputElement>('r-nombre').value.trim();
  const telefono = normalizarCelular($<HTMLInputElement>('r-telefono').value);
  const correo = $<HTMLInputElement>('r-correo').value.trim();
  const motivo = $<HTMLSelectElement>('r-motivo').value;
  const privacidad = $<HTMLInputElement>('r-privacidad').checked;
  const recordatorios = $<HTMLInputElement>('r-recordatorios').checked;

  const resultados = [
    validarCampo('r-nombre', nombre.length >= 3),
    validarCampo('r-telefono', !!telefono),
    validarCampo('r-correo', !correo || correoValido(correo)),
    validarCampo('r-motivo', !!motivo),
    validarCampo('r-privacidad', privacidad),
  ];
  if (resultados.includes(false)) {
    const ids = ['r-nombre', 'r-telefono', 'r-correo', 'r-motivo', 'r-privacidad'];
    $(ids[resultados.indexOf(false)]).focus();
    return;
  }
  // Comprobación final: el bloque sigue libre (por ejemplo, si se reservó en otra pestaña).
  const libre = agenda.bloques(estado.especialidad, estado.asignado, desdeIso(estado.dia)).some((b) => b.hora === estado.hora && b.libre);
  if (!libre) {
    alert('Ese horario ya no está disponible. Elige otro, por favor.');
    estado.hora = estado.asignado = '';
    irA(3);
    return;
  }

  const esp = agenda.especialidad(estado.especialidad);
  const reserva: Reserva = {
    codigo: generarCodigo(estado.dia, almacen.siguienteCorrelativo()),
    especialidad: esp.slug,
    profesionalId: estado.asignado,
    fecha: estado.dia,
    hora: estado.hora,
    duracion: esp.duracion,
    nombre,
    telefono: telefono!,
    correo,
    motivo,
    recordatorios,
    aceptaPrivacidad: true,
    creada: new Date().toISOString(),
  };
  almacen.guardar([...almacen.leer(), reserva]);
  mostrarConfirmacion(reserva);
  pintarMisReservas();
});

let ultimaReserva: Reserva | null = null;
function mostrarConfirmacion(r: Reserva) {
  ultimaReserva = r;
  const esp = agenda.especialidad(r.especialidad);
  const prof = agenda.profesional(r.profesionalId)!;
  $('conf-codigo').textContent = r.codigo;
  const filas: [string, string][] = [
    ['Especialidad', esp.nombre],
    ['Profesional', prof.nombre],
    ['Día', fechaLarga(r.fecha)],
    ['Hora', `${horaTexto(r.hora)} hrs (${r.duracion} min)`],
    ['Paciente', r.nombre],
    ['Teléfono', r.telefono],
    ['Motivo', r.motivo],
    ['Recordatorios por WhatsApp', r.recordatorios ? 'Sí' : 'No'],
  ];
  $('conf-resumen').innerHTML = filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $<HTMLAnchorElement>('btn-whatsapp').href = enlaceWhatsapp(datos.centro.whatsapp, mensajeConfirmacion(r, datos));
  flujo.hidden = true;
  confirmacion.hidden = false;
  $('titulo-confirmacion').focus({ preventScroll: true });
  confirmacion.scrollIntoView({ block: 'start' });
}

function descargarIcs(r: Reserva) {
  const blob = new Blob([generarIcs(r, datos)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `centro-demo-${r.codigo}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('btn-ics').addEventListener('click', () => ultimaReserva && descargarIcs(ultimaReserva));

$('btn-otra').addEventListener('click', () => {
  form.reset();
  Object.assign(estado, { especialidad: '', profesional: '', dia: '', hora: '', asignado: '' });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelectorAll<HTMLElement>('.error').forEach((el) => (el.hidden = true));
  confirmacion.hidden = true;
  flujo.hidden = false;
  pintarResumen();
  irA(1);
});

// ---------- Mis reservas ----------
function pintarMisReservas() {
  const lista = almacen.leer().sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const contenedor = $('lista-reservas');
  $<HTMLButtonElement>('btn-borrar-todo').disabled = lista.length === 0;
  if (!lista.length) {
    contenedor.innerHTML = '<p class="vacio">No tienes reservas guardadas en este navegador.</p>';
    return;
  }
  contenedor.innerHTML = lista.map((r) => {
    const esp = agenda.especialidad(r.especialidad);
    const prof = agenda.profesional(r.profesionalId);
    const wa = enlaceWhatsapp(datos.centro.whatsapp, mensajeConfirmacion(r, datos));
    return `
      <article class="tarjeta reserva-item">
        <div>
          <p class="reserva-item__codigo">${esc(r.codigo)}</p>
          <h3>${esc(esp?.nombre ?? r.especialidad)} con ${esc(prof?.nombre ?? '')}</h3>
          <p>${fechaLarga(r.fecha).replace(/^./, (l) => l.toUpperCase())}, ${horaTexto(r.hora)} hrs · ${esc(r.nombre)}</p>
        </div>
        <div class="reserva-item__acciones">
          <a class="boton boton--secundario boton--chico" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
          <button type="button" class="boton boton--chico boton--secundario" data-ics="${esc(r.codigo)}">.ics</button>
          <button type="button" class="boton boton--peligro boton--chico" data-cancelar="${esc(r.codigo)}" aria-label="Cancelar la reserva ${esc(r.codigo)}">Cancelar</button>
        </div>
      </article>`;
  }).join('');
}

$('lista-reservas').addEventListener('click', (e) => {
  const boton = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!boton) return;
  const lista = almacen.leer();
  if (boton.dataset.ics) {
    const r = lista.find((x) => x.codigo === boton.dataset.ics);
    if (r) descargarIcs(r);
  }
  if (boton.dataset.cancelar) {
    const codigo = boton.dataset.cancelar;
    if (!confirm(`¿Cancelar la reserva ${codigo}? Se eliminará de este navegador.`)) return;
    almacen.guardar(lista.filter((x) => x.codigo !== codigo));
    pintarMisReservas();
    $('estado-reservas').textContent = `Reserva ${codigo} cancelada.`;
    $('titulo-mis-reservas').focus();
    if (estado.paso === 3 && !flujo.hidden) pintarDias();
  }
});

$('btn-borrar-todo').addEventListener('click', () => {
  if (!confirm('¿Borrar todas las reservas y datos de demostración guardados en este navegador?')) return;
  almacen.borrarTodo();
  pintarMisReservas();
  $('estado-reservas').textContent = 'Se borraron todos los datos de demostración.';
  if (estado.paso === 3 && !flujo.hidden) pintarDias();
});

// ---------- Inicio: preselección desde la URL (?especialidad=…&profesional=…) ----------
function iniciar() {
  pintarMisReservas();
  const params = new URLSearchParams(location.search);
  const esp = params.get('especialidad');
  const prof = params.get('profesional');
  if (esp && datos.especialidades.some((e) => e.slug === esp)) {
    estado.especialidad = esp;
    form.querySelector<HTMLInputElement>(`input[name="especialidad"][value="${esp}"]`)!.checked = true;
    if (prof && agenda.profesionalesDe(esp).some((p) => p.id === prof)) {
      estado.profesional = prof;
      irA(3, false);
    } else {
      irA(2, false);
    }
  }
  pintarResumen();
}
iniciar();
