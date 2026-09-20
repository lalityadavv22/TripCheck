import { createRequire } from 'module';
const esmRequire = createRequire(import.meta.url);
if (typeof (globalThis as any).require === 'undefined') {
  (globalThis as any).require = esmRequire;
}

import { app } from '../server/app';

// Vercel serverless entry point. vercel.json rewrites /api/* to this function,
// so the same Express routes that power `npm run dev` and `npm start` serve
// the API on the deployed domain. Static files are served by Vercel from the
// Vite build (dist/).
export default function handler(req: any, res: any) {
  try {
    // If Vercel rewrote the URL to /api/index, restore the original requested path
    const urlObj = req.url ? new URL(req.url, 'http://localhost') : null;
    const queryRoute = req.query?.__route__ || urlObj?.searchParams.get('__route__');

    if (queryRoute && typeof queryRoute === 'string') {
      req.url = '/api/' + queryRoute.replace(/^\/+/, '');
    } else if (
      !req.url ||
      req.url === '/api/index' ||
      req.url === '/api' ||
      req.url.startsWith('/api/index?')
    ) {
      const original =
        req.headers['x-matched-path'] ||
        req.headers['x-forwarded-url'] ||
        req.headers['x-vercel-matched-path'];
      if (original && typeof original === 'string') {
        req.url = original;
      }
    }

    // Ensure /api prefix exists so Express routes match properly
    if (req.url && !req.url.startsWith('/api/') && !req.url.startsWith('/api?')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return (app as any)(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Error]:', err);
    if (res && !res.headersSent) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Serverless invocation error',
      });
    }
  }
}
