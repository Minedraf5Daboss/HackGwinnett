import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Forward API calls to the FastAPI backend, so the browser only talks to one address.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
