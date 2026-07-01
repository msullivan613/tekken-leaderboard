import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite `base` is the repo name so asset URLs resolve under the Pages sub-path
// (§1.5). Data is fetched via import.meta.env.BASE_URL.
export default defineConfig({
  base: '/c-town-tekken-leaderboard/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
