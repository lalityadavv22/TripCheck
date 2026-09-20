// Vercel Serverless Function entry point.
// Direct ESM handler that does NOT depend on Express, avoiding CJS require/invocation crashes on Vercel.

import { destinations } from '../server/destinations';
import { searchPlacesGlobal } from '../server/placeSearch';
import { resolveModels } from '../server/aiPlan';
import { processPlanRequest } from '../server/planService';

function sendJson(res: any, status: number, data: any) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(data);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

async function getRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }
  return {};
}

export default async function handler(req: any, res: any) {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const urlObj = req.url ? new URL(req.url, 'http://localhost') : null;
    const queryRoute =
      req.query?.__route__ || urlObj?.searchParams.get('__route__');

    let route = '';
    if (queryRoute && typeof queryRoute === 'string') {
      route = '/' + queryRoute.replace(/^\/+/, '');
    } else {
      let pathname = urlObj?.pathname || req.url || '';
      pathname = pathname.replace(/^\/api/, '').replace(/^\/index/, '');
      route = pathname.startsWith('/') ? pathname : '/' + pathname;
    }

    route = route.split('?')[0].replace(/\/+$/, '') || '/';

    // 1. Health check
    if (route === '/health' || route === '/' || route === '') {
      return sendJson(res, 200, {
        status: 'ok',
        service: 'TripCheck AI Route & Itinerary Engine',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Destinations list
    if (route === '/destinations') {
      return sendJson(res, 200, destinations);
    }

    // 3. AI status check
    if (route === '/ai/status') {
      const models = resolveModels(process.env.GEMINI_MODEL);
      return sendJson(res, 200, {
        success: true,
        live: Boolean(process.env.GEMINI_API_KEY),
        models,
      });
    }

    // 4. Autocomplete
    if (route === '/places/autocomplete') {
      const rawQ =
        typeof req.query?.q === 'string'
          ? req.query.q
          : urlObj?.searchParams.get('q') || '';
      if (rawQ.length > 200) {
        return sendJson(res, 400, {
          success: false,
          error: 'Use a place name of up to 200 characters.',
        });
      }
      const result = await searchPlacesGlobal(rawQ);
      return sendJson(res, 200, { success: true, ...result });
    }

    // 5. AI Plan generation
    if (route === '/ai/plan') {
      if (req.method !== 'POST') {
        return sendJson(res, 405, {
          success: false,
          error: 'Method Not Allowed. Use POST.',
        });
      }
      const body = await getRequestBody(req);
      const result = await processPlanRequest(body);
      return sendJson(res, result.status, result.body);
    }

    // Route not found
    return sendJson(res, 404, {
      success: false,
      error: `API route not found: ${route}`,
    });
  } catch (err: any) {
    console.error('[TripCheck Vercel API Error]:', err?.stack || err);
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Server error occurred during plan generation',
    });
  }
}
