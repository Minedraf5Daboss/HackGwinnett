import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Optional settings, e.g. in frontend/.env.local, for running behind a proxy that serves
  // the site under a sub-path (like the workshop editor's /app/). Defaults suit a laptop.
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.BASE_PATH || '/';
  const backend = {
    target: 'http://127.0.0.1:8000',
    rewrite: (path) => path.slice(base.length - 1), // "/app/api/..." -> "/api/..."
  };

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: {
      port: Number(env.PORT) || 5173,
      allowedHosts: env.ALLOWED_HOSTS ? env.ALLOWED_HOSTS.split(',') : [],
      hmr: env.HMR_CLIENT_PORT ? { clientPort: Number(env.HMR_CLIENT_PORT) } : undefined,
      // Forward API calls and the API docs to the FastAPI backend, so the browser only
      // talks to one address.
      proxy: {
        [`${base}api`]: backend,
        [`${base}docs`]: backend,
        [`${base}openapi.json`]: backend,
      },
    },
  };
});
