// Vercel serverless entry point.
// vercel.json rewrites /api/* to this function so the same Express routes
// that power `npm run dev` and `npm start` serve the API on the deployed domain.
// Static files are served by Vercel from the Vite build (dist/).

// Polyfill globalThis.require BEFORE any CJS-dependent modules are used.
// ESM static imports are hoisted and resolved first, but module-level code in
// each imported file runs lazily — so this polyfill is safe here.
import { createRequire } from 'module';
if (typeof (globalThis as any).require === 'undefined') {
  (globalThis as any).require = createRequire(import.meta.url);
}

// Static import so Vercel bundles the entire dependency tree automatically.
import { app } from '../server/app';

export default function handler(req: any, res: any) {
  try {
    // Vercel rewrites /api/<route> → /api/index?__route__=<route>
    // Restore the correct URL so Express route matching works.
    const urlObj = req.url ? new URL(req.url, 'http://localhost') : null;
    const queryRoute =
      req.query?.__route__ || urlObj?.searchParams.get('__route__');

    if (queryRoute && typeof queryRoute === 'string') {
      const qs = urlObj?.search?.replace(
        /(\?|&)__route__=[^&]*/,
        ''
      ) || '';
      req.url = '/api/' + queryRoute.replace(/^\/+/, '') + qs;
    } else if (
      !req.url ||
      req.url === '/api/index' ||
      req.url === '/api' ||
      req.url.startsWith('/api/index?')
    ) {
      // Fall back to headers Vercel sets on some runtimes
      const original =
        req.headers['x-matched-path'] ||
        req.headers['x-vercel-matched-path'];
      if (original && typeof original === 'string') {
        req.url = original;
      }
    }

    // Ensure the /api prefix is present for Express route matching
    if (
      req.url &&
      !req.url.startsWith('/api/') &&
      !req.url.startsWith('/api?')
    ) {
      req.url =
        '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return (app as any)(req, res);
  } catch (err: any) {
    console.error('[Vercel handler error]', err?.stack || err);
    if (res && !res.headersSent) {
      try {
        res.status(500).json({ success: false, error: err?.message });
      } catch {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err?.message }));
      }
    }
  }
}
