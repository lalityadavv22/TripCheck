import { createRequire } from 'module';

const esmRequire = createRequire(import.meta.url);
if (typeof (globalThis as any).require === 'undefined') {
  (globalThis as any).require = esmRequire;
}

// Lazy-load the Express app so globalThis.require is polyfilled BEFORE
// Express and its CommonJS dependencies are imported.
let cachedApp: any = null;
let initError: any = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;
  try {
    const mod = await import('../server/app.js').catch(() => import('../server/app'));
    cachedApp = mod.app;
    return cachedApp;
  } catch (err) {
    initError = err;
    throw err;
  }
}

// Vercel serverless entry point. vercel.json rewrites /api/* to this function,
// so the same Express routes that power `npm run dev` and `npm start` serve
// the API on the deployed domain. Static files are served by Vercel from the
// Vite build (dist/).
export default async function handler(req: any, res: any) {
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

    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Error]:', err);
    if (res && !res.headersSent) {
      if (typeof res.status === 'function') {
        res.status(500).json({
          success: false,
          error: err?.message || 'Serverless initialization error',
          stack: err?.stack,
        });
      } else {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: false,
            error: err?.message || 'Serverless initialization error',
            stack: err?.stack,
          })
        );
      }
    }
  }
}
