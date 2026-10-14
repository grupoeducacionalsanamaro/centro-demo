// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import data from './src/data/centro.json' with { type: 'json' };

export default defineConfig({
  site: data.centro.sitioUrl,
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
});
