// Shared API response helpers.
//
// Why this exists: when the UI is opened without the Express backend behind it
// (for example a static-only deployment on a hosting platform), requests to
// /api/* come back as the hosting provider's 404 page — text/HTML like
// "The page could not be found" — instead of JSON. Calling res.json() on that
// page used to throw the cryptic SyntaxError:
//   "Unexpected token 'T', \"The page c\"... is not valid JSON"
// These helpers detect that case and turn it into a clear, actionable message.

export class TripApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'TripApiError';
    this.status = status;
  }
}

export const API_REACH_HINT =
  'Run the frontend and the Express backend together: npm install && npm run dev — or redeploy so that /api/* reaches the backend (server.ts). See the Deployment section in the README.';

function cleanSnippet(text: string): string {
  const clean = text
    .replace(/<[^>]*>/g, ' ') // strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? ` Server answered: "${clean.slice(0, 80)}".` : '';
}

/**
 * Parses a fetch Response as JSON, with a clear error when the server did not
 * answer with JSON (e.g. a hosting platform's HTML 404 page) or with broken
 * JSON. Always use this instead of a bare `res.json()`.
 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('json')) {
    const text = await res.text().catch(() => '');
    throw new TripApiError(
      `The TripCheck API is not available on this deployment (the server answered with "${contentType || 'unknown'}" instead of JSON).${cleanSnippet(
        text
      )} ${API_REACH_HINT}`,
      res.status
    );
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new TripApiError(
      `The TripCheck API returned a malformed (non-JSON) response. ${API_REACH_HINT}`,
      res.status
    );
  }
}
