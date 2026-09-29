import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Serving on 0.0.0.0 so it's reachable from other machines on the office LAN,
// not just localhost on the machine running the dev/preview server.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
