
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Fix: Cast process to any to access cwd() when Node types are not explicitly available in the context
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Prioriza VITE_API_KEY ou API_KEY vinda do Vercel/Ambiente
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || '')
    },
    build: {
      target: 'esnext',
      outDir: 'dist'
    },
    server: {
      port: 3000
    }
  };
});
