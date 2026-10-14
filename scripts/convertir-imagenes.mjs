// Convierte las imágenes originales (img-originales/*.png) a WebP en public/images.
// Uso: npm run imagenes
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ORIGEN = 'img-originales';
const DESTINO = 'public/images';
mkdirSync(DESTINO, { recursive: true });

// Ancho máximo por tipo de imagen y si se genera una variante pequeña (640 px) para srcset.
function reglas(nombre) {
  if (nombre.startsWith('equipo-') && nombre !== 'equipo-grupal') return { ancho: 400 };
  if (nombre === 'logo-isotipo' || nombre === 'iconos-referencia') return null; // solo referencia
  if (nombre === 'og-compartir') return null; // se procesa aparte
  if (nombre === 'hero-recepcion-vertical') return { ancho: 752 };
  return { ancho: 1344, chica: 640 };
}

for (const archivo of readdirSync(ORIGEN).filter((f) => f.endsWith('.png'))) {
  const nombre = basename(archivo, '.png');
  const r = reglas(nombre);
  if (!r) continue;
  const entrada = join(ORIGEN, archivo);
  await sharp(entrada).resize({ width: r.ancho, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(DESTINO, `${nombre}.webp`));
  if (r.chica) {
    await sharp(entrada).resize({ width: r.chica }).webp({ quality: 74 }).toFile(join(DESTINO, `${nombre}-640.webp`));
  }
  console.log('✓', nombre);
}

// Imagen para compartir: recorte 1200×630 con el nombre del centro a la izquierda.
const texto = Buffer.from(`
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" x2="1">
      <stop offset="0" stop-color="#F8F6F1" stop-opacity="1"/>
      <stop offset="0.5" stop-color="#F8F6F1" stop-opacity="0.9"/>
      <stop offset="0.62" stop-color="#F8F6F1" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <g transform="translate(80 170)">
    <circle cx="40" cy="40" r="40" fill="#2F7D6D"/>
    <g fill="#E6F2EF">
      <circle cx="40" cy="22" r="13"/><circle cx="40" cy="58" r="13"/>
      <circle cx="22" cy="40" r="13"/><circle cx="58" cy="40" r="13"/>
    </g>
  </g>
  <text x="80" y="330" font-family="Segoe UI, Arial, sans-serif" font-size="68" font-weight="800" fill="#1C2B39">Centro Demo</text>
  <text x="80" y="385" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="600" fill="#2F7D6D">Salud Integral</text>
  <text x="80" y="440" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#5B6B78">Atención cercana, en un solo lugar.</text>
  <text x="80" y="560" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#5B6B78">Sitio ficticio · Demostración LEVEL UP 2026</text>
</svg>`);
await sharp(join(ORIGEN, 'og-compartir.png'))
  .resize(1200, 630, { fit: 'cover', position: 'right' })
  .composite([{ input: texto }])
  .webp({ quality: 82 })
  .toFile('public/og-compartir.webp');
// Algunas redes no leen WebP en Open Graph: también se genera JPG.
await sharp(join(ORIGEN, 'og-compartir.png'))
  .resize(1200, 630, { fit: 'cover', position: 'right' })
  .composite([{ input: texto }])
  .jpeg({ quality: 82 })
  .toFile('public/og-compartir.jpg');
console.log('✓ og-compartir');
