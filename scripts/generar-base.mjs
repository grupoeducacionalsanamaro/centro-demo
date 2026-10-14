// Genera docs/base-conocimiento-whatsapp.md a partir de src/data/centro.json.
// Uso: npm run base (también se ejecuta automáticamente antes de cada build).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { crearCentro, formatoPeso, unirLista } from '../src/lib/centro.js';

const data = JSON.parse(readFileSync(new URL('../src/data/centro.json', import.meta.url), 'utf8'));
const C = crearCentro(data);
const sitio = `https://${C.sitioCorto}`;

const md = `# Base de conocimiento — Asistente de WhatsApp de ${C.centro.nombre}

> Archivo generado automáticamente desde \`src/data/centro.json\` con \`npm run base\`. No lo edites a mano: cambia el JSON y vuelve a generarlo.
>
> ${C.centro.avisoFicticio}

## Instrucciones para el asistente

- Responde **solo consultas administrativas** con la información de este documento (horarios, ubicación, especialidades, valores, medios de pago, previsión, reservas y datos personales).
- Si te preguntan algo **clínico** (síntomas, diagnósticos, medicamentos, tratamientos), no orientes: indica que una persona del equipo responderá y deriva la conversación.
- Si el mensaje sugiere una **urgencia** (por ejemplo, dolor de pecho, dificultad para respirar, sangrado abundante o pérdida de conciencia), responde de inmediato: «Por lo que nos cuentas, esto puede ser una urgencia. Llama al SAMU 131 o acude al servicio de urgencia más cercano. Este canal no atiende urgencias.» y deriva a una persona.
- Para reservar, envía el enlace de la página de reservas: ${sitio}/agendar
- No pidas ni registres datos de salud por WhatsApp.
- Usa un tono cálido y claro, en español neutro y tuteando. Si no sabes algo, dilo y ofrece derivar a una persona del equipo.

## Datos del centro

- **Nombre:** ${C.centro.nombre}
- **Eslogan:** ${C.centro.eslogan}
- **Dirección:** ${C.direccionCompleta} (${C.centro.direccion.nota.toLowerCase()})
- **Teléfono:** ${C.centro.telefono}
- **WhatsApp:** ${C.centro.whatsapp}
- **Correo:** ${C.centro.correo}
- **Sitio web:** ${sitio}
- **Estacionamiento:** ${C.centro.estacionamiento}
- **Accesibilidad:** ${C.centro.accesibilidad}
- **Medios de pago:** ${unirLista(C.centro.mediosPago)}.
- **Previsión:** ${C.centro.prevision}
- **Cancelaciones:** avisar con al menos ${C.centro.anticipacionCancelacion} de anticipación, por WhatsApp o teléfono, indicando el código de reserva.

## Horario de atención

| Días | Horario |
| --- | --- |
${C.horarioResumen.map((h) => `| ${h.dias} | ${h.horas} |`).join('\n')}

Reserva en línea disponible las 24 horas en ${sitio}/agendar

## Especialidades y valores

${C.centro.notaValores}

| Especialidad | Qué atiende | Duración | Valor referencial |
| --- | --- | --- | --- |
${C.especialidades.map((e) => `| ${e.nombre} | ${e.descripcionBreve} | ${e.duracion} min | ${formatoPeso(e.valor)} (${e.valorNota}) |`).join('\n')}

## Equipo y días de atención

| Profesional | Título | Especialidad | Días de atención |
| --- | --- | --- | --- |
${C.equipo.map((p) => `| ${p.nombre} | ${p.titulo} | ${p.especialidadNombre} | ${p.diasTexto} |`).join('\n')}

## Preguntas frecuentes

${C.faq.map((f, i) => `### ${i + 1}. ${f.pregunta}\n\n${f.respuesta}`).join('\n\n')}

## Urgencias

${C.centro.urgencias}
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/base-conocimiento-whatsapp.md', import.meta.url), md, 'utf8');
console.log('✓ docs/base-conocimiento-whatsapp.md generado');
