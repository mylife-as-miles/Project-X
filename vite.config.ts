import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function expressApiPlugin(): Plugin {
  let appPromise: Promise<any> | null = null;
  const getApp = () => {
    if (!appPromise) {
      appPromise = (async () => {
        const express = await import('express');
        const { apiRouter } = await import('./server/api');
        const app = express.default();
        app.use(express.default.json({ limit: '25mb' }));
        app.use('/api', apiRouter);
        return app;
      })();
    }
    return appPromise;
  };

  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
          try {
            const app = await getApp();
            app(req as any, res as any, next);
          } catch (err) {
            console.error('[Vite API Middleware Error]:', err);
            next(err);
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
