import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://zobio.github.io',
  base: '/diary',
  integrations: [react()],
});