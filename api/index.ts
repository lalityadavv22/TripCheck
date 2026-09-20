import { app } from '../server/app';

// Vercel serverless entry point. vercel.json rewrites /api/* to this function,
// so the same Express routes that power `npm run dev` and `npm start` serve
// the API on the deployed domain. Static files are served by Vercel from the
// Vite build (dist/).
export default function handler(req: unknown, res: unknown) {
  return (app as unknown as (r: unknown, s: unknown) => void)(req, res);
}
