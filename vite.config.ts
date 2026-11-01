import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5174
  },
  build: {
    target: 'esnext'
  },
  ssr: {
    noExternal: ['@awesome.me/webawesome']
  }
});
