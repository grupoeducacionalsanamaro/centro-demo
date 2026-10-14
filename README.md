# Centro Demo — Salud Integral (sitio ficticio)

Sitio web de un centro de salud multidisciplinario **ficticio**, creado para las demostraciones en vivo de la ponencia
«IA en Salud: De la Herramienta a la Acción» (LEVEL UP 2026). Todo el contenido es inventado y el sitio lo declara en cada página.

- **Astro** (sitio 100 % estático, sin backend), CSS propio y JavaScript mínimo sin dependencias.
- Todo el contenido del centro vive en un solo archivo: [`src/data/centro.json`](src/data/centro.json).
- Los formularios **no envían datos**: las reservas se guardan solo en el `localStorage` del navegador.

## Correr el proyecto en local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:4321>. Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Genera la base de conocimiento y el sitio de producción en `dist/` |
| `npm run preview` | Sirve localmente el sitio ya construido |
| `npm run base` | Regenera `docs/base-conocimiento-whatsapp.md` desde `centro.json` |
| `npm run imagenes` | Convierte las imágenes originales de `img-originales/` a WebP en `public/images/` |

## Editar el contenido (`src/data/centro.json`)

| Sección | Qué contiene |
| --- | --- |
| `centro` | Nombre, eslogan, dirección, teléfono, WhatsApp, correo, horario por día, festivos, medios de pago, previsión, avisos |
| `especialidades` | Nombre, descripción, qué atiende, primera consulta, duración (min) y valor (número, sin puntos) |
| `equipo` | Profesionales, título, especialidad y días de atención (`1` = lunes … `6` = sábado) |
| `preguntasFrecuentes` | Las 10 preguntas y respuestas |

Al cambiar un dato en el JSON, cambia en todo el sitio: páginas, calendario de reservas, pie de página y base de conocimiento.

**Variables en las respuestas frecuentes.** Las respuestas pueden usar marcadores que se reemplazan automáticamente:
`{horario}`, `{direccion}`, `{estacionamiento}`, `{accesibilidad}`, `{telefono}`, `{whatsapp}`, `{correo}`, `{sitio}`,
`{anticipacion}`, `{mediosPago}`, `{valorMinimo}` y `{valorMaximo}`. Así, si cambias el horario, la pregunta «¿Cuál es el horario?» se actualiza sola.

**Horario.** `centro.horario` tiene una entrada por día abierto (`dia`: 0 = domingo … 6 = sábado, con `abre` y `cierra` en formato `HH:MM`).
Los días sin entrada y las fechas de `centro.festivos` aparecen como cerrados en la reserva.

## Cambiar el número de WhatsApp

En `src/data/centro.json`, cambia:

```json
"telefono": "+56 9 0000 0000",
"whatsapp": "+56 9 0000 0000",
```

Escribe el número con el formato `+56 9 XXXX XXXX`: el sitio quita los espacios automáticamente para armar los enlaces `https://wa.me/569XXXXXXXX`.
El cambio se aplica al botón flotante, a «Escríbenos por WhatsApp», a la confirmación de reserva y a la base de conocimiento.
Después ejecuta `npm run base` (o `npm run build`) para regenerar `docs/base-conocimiento-whatsapp.md`.

Si publicas el sitio en otro dominio, actualiza también `centro.sitioUrl` (hoy `https://centro-demo-weld.vercel.app`) (se usa en Open Graph, el sitemap y los enlaces de la base de conocimiento).

## Agregar un artículo de Educación

Crea un archivo `.md` en `src/content/educacion/`. El nombre del archivo será la URL (`/educacion/nombre-del-archivo`):

```markdown
---
titulo: "Título del artículo"
descripcion: "Resumen breve para la tarjeta y los buscadores."
fecha: 2026-10-20
especialidad: nutricion        # medicina-general | kinesiologia | odontologia | nutricion | psicologia | enfermeria
autor: fernanda-lagos          # id del profesional en centro.json
imagen: educacion-etiqueta-nutricional   # opcional: nombre en public/images, sin extensión
imagenAlt: "Descripción de la imagen"
---

Texto del artículo en Markdown. Usa ## para los subtítulos.
```

El tiempo de lectura, el autor y el aviso «Este contenido es educativo y no reemplaza una evaluación profesional» se agregan solos.
El artículo aparece automáticamente en `/educacion` y, si es de los 3 más recientes, en el inicio.

## Desplegar en Vercel

El proyecto no necesita configuración adicional:

1. Sube la carpeta a un repositorio de GitHub (la carpeta `img-originales/` está excluida en `.gitignore`).
2. En Vercel, elige **Add New → Project** e importa el repositorio. Vercel detecta Astro automáticamente
   (comando `npm run build`, carpeta de salida `dist`).
3. Cuando tengas la URL definitiva, actualiza `centro.sitioUrl` (hoy `https://centro-demo-weld.vercel.app`) en el JSON y vuelve a desplegar.

También puedes desplegar desde la terminal con `npx vercel` (vista previa) o `npx vercel --prod` (producción).

El sitio **no se indexa en buscadores**: `robots.txt` bloquea a todos los rastreadores, cada página lleva `<meta name="robots" content="noindex, nofollow">`
y `vercel.json` agrega la cabecera `X-Robots-Tag: noindex`.

## Estructura

```
src/
  data/centro.json          Fuente única de contenido
  content/educacion/*.md    Artículos
  lib/centro.js             Textos derivados del JSON (horarios, valores, enlaces de WhatsApp)
  components/               Header, Footer, tarjetas, avisos, íconos SVG
  layouts/Base.astro        SEO, Open Graph, aviso ficticio, botón flotante de WhatsApp
  pages/                    Inicio, especialidades, equipo, agendar, valores, educación, FAQ, contacto, privacidad, 404
  scripts/agenda.ts         Disponibilidad determinística, validación, código y .ics
  scripts/reserva.ts        Interfaz del flujo de reserva y «Mis reservas»
scripts/generar-base.mjs    Genera docs/base-conocimiento-whatsapp.md
docs/                       Base de conocimiento para el asistente de WhatsApp
```

## Cómo funciona la reserva de demostración

- **Disponibilidad:** se calcula para los próximos 14 días según el horario del centro, los días de atención de cada profesional
  y la duración de la especialidad. Algunos bloques aparecen ocupados según un cálculo fijo basado en la fecha (sin azar),
  así la agenda se ve igual cada vez que se abre.
- **Datos:** quedan solo en `localStorage` (claves `centroDemo.*`). Se pueden ver, cancelar y borrar en `/agendar#mis-reservas`.
- **Confirmación:** muestra un código (por ejemplo, `CD-2110-0042`), un enlace de WhatsApp con el mensaje prellenado y un archivo `.ics` para el calendario.
- **Enlaces directos:** `/agendar?especialidad=kinesiologia&profesional=matias-rivas` abre la reserva con la especialidad y el profesional ya elegidos.

---

Sitio ficticio creado con fines demostrativos para la ponencia LEVEL UP 2026. No es un centro de salud real.
