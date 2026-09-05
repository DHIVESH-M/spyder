import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { geminiDevApiPlugin } from './vite-plugins/geminiMiddleware';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env into process.env for server-side use (the Gemini dev API
  // middleware reads process.env.GEMINI_API_KEY directly). This does NOT
  // expose the key to the browser bundle — only variables prefixed with
  // VITE_ are ever injected into client code.
  const env = loadEnv(mode, process.cwd(), '');
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;

  return {
    plugins: [react(), geminiDevApiPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
