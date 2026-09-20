import path from 'path';
import express from 'express';
import { app } from './server/app';

// Serving entry for local development and traditional Node hosting.
// (For Vercel, server/app.ts is mounted as a serverless function instead —
// see api/index.ts and vercel.json.)

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TripCheck server running on http://0.0.0.0:${PORT}`);
  });
}

// Skip auto-starting the listener inside a serverless environment.
if (!process.env.VERCEL) {
  startServer();
}
