import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const pocketbaseUrl = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8095';
const connectSrc = Array.from(
  new Set([
    'self',
    'data:',
    'https://analytics.emanuelsaramago.com',
    'https://ka-f.fontawesome.com',
    'https://ka-p.fontawesome.com',
    'http://localhost:8095',
    'http://127.0.0.1:8095',
    pocketbaseUrl
  ])
);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '@': 'src',
      '@/*': 'src/*'
    },
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'https://analytics.emanuelsaramago.com'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'blob:', 'https:'],
        'font-src': ['self', 'data:'],
        'connect-src': connectSrc,
        'object-src': ['none'],
        'base-uri': ['self'],
        'frame-ancestors': ['none']
      }
    }
  }
};

export default config;
