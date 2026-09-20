import express from 'express';
import dotenv from 'dotenv';
import { destinations } from './destinations';
import { searchPlacesGlobal } from './placeSearch';
import { resolveModels } from './aiPlan';
import { processPlanRequest } from './planService';

dotenv.config();

const app = express();
app.use(express.json({ limit: '32kb' }));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TripCheck AI Route & Itinerary Engine',
    timestamp: new Date().toISOString(),
  });
});

// Autocomplete endpoint for any global city, town, village, or monument
app.get('/api/places/autocomplete', async (req, res) => {
  if (
    req.query.q !== undefined &&
    (typeof req.query.q !== 'string' || req.query.q.length > 200)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Use a place name of up to 200 characters.',
    });
  }
  const result = await searchPlacesGlobal(String(req.query.q || ''));
  res.json({ success: true, ...result });
});

// Destinations list
app.get('/api/destinations', (req, res) => {
  res.json(destinations);
});

// Whether this deployment can generate live plans, without exposing the key itself
app.get('/api/ai/status', (req, res) => {
  const models = resolveModels(process.env.GEMINI_MODEL);
  res.json({
    success: true,
    live: Boolean(process.env.GEMINI_API_KEY),
    models,
  });
});

// AI Travel Architect endpoint
app.post('/api/ai/plan', async (req, res) => {
  const result = await processPlanRequest(req.body);
  res.status(result.status).json(result.body);
});

export { app };
