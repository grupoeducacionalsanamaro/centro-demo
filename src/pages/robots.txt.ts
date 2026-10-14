import type { APIRoute } from 'astro';

// Sitio de demostración (ficticio): se bloquea la indexación en todos los buscadores.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nDisallow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
