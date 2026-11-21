import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString()),
  },
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
});
