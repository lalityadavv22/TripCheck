// Vercel serverless entry point.
// vercel.json rewrites /api/* to this function so the same Express routes
// that power `npm run dev` and `npm start` serve the API on the deployed domain.
// Static files are served by Vercel from the Vite build (dist/).

import { app } from '../server/app';

export default function handler(req: any, res: any) {
  try {
    // Vercel rewrites /api/<route> → /api/index?__route__=<route>
    // Restore the correct URL so Express route matching works.
    const urlObj = req.url ? new URL(req.url, 'http://localhost') : null;
    const queryRoute =
      req.query?.__route__ || urlObj?.searchParams.get('__route__');

    if (queryRoute && typeof queryRoute === 'string') {
      const cleanRoute = queryRoute.replace(/^\/+/, '');
      // Strip the __route__ param from the query string
      const remainingQs = urlObj?.search
        ?.replace(/[?&]__route__=[^&]*/g, '')
        .replace(/^&/, '?') ?? '';
      req.url = '/api/' + cleanRoute + remainingQs;
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
