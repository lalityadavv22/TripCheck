import { GoogleGenAI, Type } from '@google/genai/web';
import { isGeneratedTripPlan } from '../src/utils/validation';
import type { GeneratedTripPlan } from '../src/types';

export interface PlanCoords {
  lat: number;
  lng: number;
}

export interface LivePlanRequest {
  origin: string;
  destination: string;
  originCoords: PlanCoords;
  destCoords: PlanCoords;
  distanceKm: number;
  days: number;
  travelers: number;
  groupType: string;
  budgetTier: string;
  vibe: string;
}

export interface LivePlanOptions {
  apiKey: string;
  /** Model ids in priority order. Defaults to `GEMINI_MODEL` or gemini-2.5-flash. */
  models?: string[];
  /** Test/dev override for the Generative Language endpoint. */
  baseUrl?: string;
  /** Per-attempt HTTP timeout. */
  timeoutMs?: number;
  /** Overall wall-clock budget for the whole live call, including retries. */
  deadlineMs?: number;
  attemptsPerModel?: number;
  maxOutputTokens?: number;
  /** Structured output; disabled automatically if a model rejects the schema. */
  useSchema?: boolean;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string, detail?: unknown) => void;
}

export type LivePlanOutcome =
  | {
      status: 'ok';
      plan: GeneratedTripPlan;
      model: string;
      attempts: number;
      notes: string[];
    }
  | {
      status: 'unavailable';
      reason: string;
      model?: string;
      attempts: number;
    };

export const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 25000;
const DEFAULT_DEADLINE_MS = 60000;
const DEFAULT_ATTEMPTS_PER_MODEL = 2;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
/** Coordinates closer than this to the destination centre are treated as copied from the prompt. */
const CENTRE_COPY_TOLERANCE_DEG = 1e-6;

const isObject = (value: any) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const str = (value: any, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;
const num = (value: any) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const nonNegative = (value: any) => {
  const parsed = num(value);
  return parsed === undefined || parsed < 0 ? 0 : Math.round(parsed);
};
const strings = (value: any) =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
const parses = (text: string) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

/** `GEMINI_MODEL` accepts a comma separated priority list; extra ids are fallbacks. */
export function resolveModels(configured?: string): string[] {
  const list = (configured || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return list.length ? [...new Set(list)] : [DEFAULT_MODEL];
}

export function buildPlanPrompt(request: LivePlanRequest): string {
  const {
    origin,
    destination,
    originCoords,
    destCoords,
    distanceKm,
    days,
    travelers,
    groupType,
    budgetTier,
    vibe,
  } = request;
  return `You are a travel architect for TripCheck.
Plan a ${days}-day trip.

Origin (leaving from): "${origin}" (lat ${originCoords.lat}, lng ${originCoords.lng})
Destination (going to): "${destination}" (lat ${destCoords.lat}, lng ${destCoords.lng})
Estimated distance: ${distanceKm} km
Travelers: ${travelers} (${groupType})
Budget tier: ${budgetTier}
Vibe: ${vibe}

Rules that matter more than sounding impressive:
1. Return EXACTLY ${days} entries in "days", numbered 1 to ${days}, each with 3-5 activities.
2. Only include "lat"/"lng" on an activity when you are confident of that place's real coordinates. Otherwise omit both keys entirely. Never derive them from the destination centre.
3. Never invent ratings, weather numbers, opening times or booking prices. Costs are rough estimates in USD per person.
4. If you do not know a real venue, describe the kind of place instead of naming one.
5. Write "summary", descriptions, "foodGuide" and "translations" for this specific origin/destination pair, not generic filler.

Respond with JSON only, no markdown, in this shape:
{
  "title": "${days}-Day ${destination} Journey from ${origin}",
  "summary": "2-3 sentences about this specific journey.",
  "transitOptions": [
    { "mode": "flight", "title": "…", "duration": "2h 45m", "estimatedCost": 120, "details": "…", "isRecommended": true }
  ],
  "days": [
    {
      "dayNumber": 1,
      "theme": "Arrival & Atmosphere",
      "activities": [
        { "time": "09:30", "title": "…", "category": "sightseeing", "location": "…", "cost": 20, "description": "…" }
      ]
    }
  ],
  "hotels": [
    { "name": "…", "tier": "Budget", "pricePerNight": 45, "rating": 4.6, "location": "…", "perks": ["…"], "image": "https://…" }
  ],
  "foodGuide": [
    { "dishName": "…", "dishType": "Local Delicacy", "description": "…", "recommendedSpot": "…", "priceRange": "$15 - $25" }
  ],
  "weatherForecast": {
    "avgTempC": null,
    "condition": "…",
    "packingTip": "…",
    "bestTimeToVisit": "…"
  },
  "budgetBreakdown": { "transport": 0, "accommodation": 0, "food": 0, "activities": 0, "buffer": 0, "totalPerPerson": 0 },
  "packingAdvice": ["…"],
  "translations": {
    "hi": { "languageName": "Hindi", "greeting": "नमस्ते", "summary": "…" },
    "es": { "languageName": "Spanish", "greeting": "¡Hola!", "summary": "…" },
    "fr": { "languageName": "French", "greeting": "Bonjour", "summary": "…" }
  }
}`;
}

/** Structured output keeps long itineraries schema-conformant instead of prose-wrapped. */
export const planResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    transitOptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          mode: { type: Type.STRING },
          title: { type: Type.STRING },
          duration: { type: Type.STRING },
          estimatedCost: { type: Type.NUMBER },
          details: { type: Type.STRING },
          isRecommended: { type: Type.BOOLEAN },
        },
        required: ['mode', 'title', 'duration', 'estimatedCost', 'details'],
      },
    },
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dayNumber: { type: Type.INTEGER },
          theme: { type: Type.STRING },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                location: { type: Type.STRING },
                cost: { type: Type.NUMBER },
                lat: { type: Type.NUMBER, nullable: true },
                lng: { type: Type.NUMBER, nullable: true },
                description: { type: Type.STRING },
              },
              required: ['time', 'title', 'category', 'location', 'cost'],
            },
          },
        },
        required: ['dayNumber', 'theme', 'activities'],
      },
    },
    hotels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          tier: { type: Type.STRING },
          pricePerNight: { type: Type.NUMBER },
          rating: { type: Type.NUMBER },
          location: { type: Type.STRING },
          perks: { type: Type.ARRAY, items: { type: Type.STRING } },
          image: { type: Type.STRING },
        },
        required: ['name', 'tier', 'pricePerNight', 'rating', 'location'],
      },
    },
    foodGuide: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dishName: { type: Type.STRING },
          dishType: { type: Type.STRING },
          description: { type: Type.STRING },
          recommendedSpot: { type: Type.STRING },
          priceRange: { type: Type.STRING },
        },
        required: ['dishName', 'dishType', 'description', 'recommendedSpot'],
      },
    },
    weatherForecast: {
      type: Type.OBJECT,
      properties: {
        avgTempC: { type: Type.NUMBER, nullable: true },
        condition: { type: Type.STRING },
        packingTip: { type: Type.STRING },
        bestTimeToVisit: { type: Type.STRING },
      },
    },
    budgetBreakdown: {
      type: Type.OBJECT,
      properties: {
        transport: { type: Type.NUMBER },
        accommodation: { type: Type.NUMBER },
        food: { type: Type.NUMBER },
        activities: { type: Type.NUMBER },
        buffer: { type: Type.NUMBER },
        totalPerPerson: { type: Type.NUMBER },
      },
    },
    packingAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
    translations: {
      type: Type.OBJECT,
      properties: {
        hi: {
          type: Type.OBJECT,
          properties: {
            languageName: { type: Type.STRING },
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
        },
        es: {
          type: Type.OBJECT,
          properties: {
            languageName: { type: Type.STRING },
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
        },
        fr: {
          type: Type.OBJECT,
          properties: {
            languageName: { type: Type.STRING },
            greeting: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
        },
      },
    },
  },
  required: ['title', 'summary', 'transitOptions', 'days'],
};

function stripFences(raw: string): string {
  const text = (raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function trimDangling(prefix: string): string {
  let result = prefix;
  for (let i = 0; i < 4; i++) {
    const before = result;
    result = result
      .replace(/[\s,]+$/, '')
      .replace(/"[^"]*"\s*:\s*$/, '')
      .replace(/,\s*"[^"]*"$/, '')
      .replace(/,\s*\{\s*$/, '')
      .replace(/\[\s*\{\s*$/, '[')
      .replace(/:\s*$/, '');
    if (result === before) break;
  }
  return result;
}

function closeContainers(prefix: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of prefix) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  if (inString) return prefix;
  while (stack.length) prefix += stack.pop() === '{' ? '}' : ']';
  return prefix;
}

/**
 * Models truncate long itineraries (finishReason MAX_TOKENS) and sometimes wrap JSON in prose.
 * Recover the largest parseable prefix instead of throwing the whole plan away.
 */
export function repairJsonText(raw: string): string {
  const stripped = stripFences(raw);
  const start = stripped.indexOf('{');
  if (start < 0) throw new Error('model output contained no JSON object');
  const text = stripped.slice(start);
  if (parses(text)) return text;

  const safePoints: number[] = [];
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let stringStart = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') {
        inString = false;
        safePoints.push(i + 1);
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      stringStart = i;
      continue;
    }
    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }
    if (ch === '}' || ch === ']') {
      stack.pop();
      safePoints.push(i + 1);
      if (stack.length === 0) return text.slice(0, i + 1);
      continue;
    }
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      const previous = text[i - 1];
      if (previous && /[\dtruefalsn]/.test(previous)) safePoints.push(i);
    }
  }
  if (inString && stringStart >= 0) safePoints.push(stringStart);

  for (let k = safePoints.length - 1; k >= 0 && k > safePoints.length - 400; k--) {
    const candidate = closeContainers(trimDangling(text.slice(0, safePoints[k])));
    if (candidate.startsWith('{') && parses(candidate)) return candidate;
  }
  throw new Error('could not repair truncated model output');
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** The parts must add up to the total the planner screen shows. */
function deriveBudget(plan: any, days: number) {
  const transitCosts = (plan.transitOptions || [])
    .map((option: any) => num(option?.estimatedCost))
    .filter((value: any): value is number => value !== undefined);
  const transport = transitCosts.length ? Math.round(Math.min(...transitCosts)) : 0;

  const hotelPrices = (plan.hotels || [])
    .map((hotel: any) => num(hotel?.pricePerNight))
    .filter((value: any): value is number => value !== undefined);
  const accommodation = Math.round(median(hotelPrices) * days);

  let food = 0;
  let activities = 0;
  for (const day of plan.days || []) {
    for (const activity of day.activities || []) {
      const cost = nonNegative(activity?.cost);
      if (str(activity?.category).toLowerCase() === 'food') food += cost;
      else activities += cost;
    }
  }
  const buffer = Math.round((transport + accommodation + food + activities) * 0.1);
  return {
    transport,
    accommodation,
    food,
    activities,
    buffer,
    totalPerPerson: transport + accommodation + food + activities + buffer,
  };
}

function activityCoords(activity: any, centre: PlanCoords): PlanCoords | null {
  const lat = num(activity?.lat);
  const lng = num(activity?.lng);
  if (lat === undefined || lng === undefined) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (
    Math.abs(lat - centre.lat) <= CENTRE_COPY_TOLERANCE_DEG &&
    Math.abs(lng - centre.lng) <= CENTRE_COPY_TOLERANCE_DEG
  )
    return null; // copied from the prompt's destination coordinates, not a real place
  return { lat, lng };
}

/**
 * Enforce server-derived truth on model output, drop unusable entries, and keep the plan
 * renderable when the model omits an optional section instead of discarding live output.
 */
export function normalizePlan(
  parsed: any,
  request: LivePlanRequest
): { plan: GeneratedTripPlan; notes: string[] } | null {
  if (!isObject(parsed)) return null;
  const notes: string[] = [];

  const rawDays = Array.isArray(parsed.days) ? parsed.days : [];
  let droppedActivities = 0;
  let droppedCentreCoords = 0;
  const days = rawDays
    .filter((day: any) => isObject(day) && Array.isArray(day.activities))
    .map((day: any, index: number) => ({
      dayNumber: index + 1,
      theme: str(day.theme, `Day ${index + 1}`),
      activities: day.activities
        .filter((activity: any) => {
          const usable =
            isObject(activity) &&
            str(activity.title) !== '' &&
            str(activity.location) !== '' &&
            str(activity.category) !== '' &&
            str(activity.time) !== '';
          if (!usable) droppedActivities++;
          return usable;
        })
        .map((activity: any) => {
          const coords = activityCoords(activity, request.destCoords);
          if (
            (num(activity.lat) !== undefined || num(activity.lng) !== undefined) &&
            !coords
          )
            droppedCentreCoords++;
          return {
            time: str(activity.time),
            title: str(activity.title),
            category: str(activity.category, 'sightseeing'),
            location: str(activity.location),
            cost: nonNegative(activity.cost),
            ...(coords || {}),
            ...(str(activity.description)
              ? { description: str(activity.description) }
              : {}),
          };
        }),
    }))
    .filter((day: any) => day.activities.length > 0);

  if (!days.length) return null;
  if (days.length > request.days) {
    days.length = request.days;
    notes.push(`Trimmed to the ${request.days} days you asked for.`);
  } else if (days.length < request.days) {
    notes.push(
      `The assistant returned ${days.length} of the ${request.days} days you asked for.`
    );
  }
  if (droppedActivities)
    notes.push(`Skipped ${droppedActivities} incomplete activities.`);
  if (droppedCentreCoords)
    notes.push(
      `Removed ${droppedCentreCoords} coordinates the assistant copied from the destination centre.`
    );

  const transitOptions = (
    Array.isArray(parsed.transitOptions) ? parsed.transitOptions : []
  )
    .filter(
      (option: any) =>
        isObject(option) &&
        str(option.mode) !== '' &&
        str(option.title) !== '' &&
        str(option.duration) !== ''
    )
    .map((option: any) => ({
      mode: str(option.mode),
      title: str(option.title),
      duration: str(option.duration),
      estimatedCost: nonNegative(option.estimatedCost),
      details: str(option.details),
      isRecommended: option.isRecommended === true,
    }));

  const hotels = (Array.isArray(parsed.hotels) ? parsed.hotels : [])
    .filter((hotel: any) => isObject(hotel) && str(hotel.name) !== '')
    .map((hotel: any) => ({
      name: str(hotel.name),
      tier: str(hotel.tier, 'Boutique'),
      pricePerNight: nonNegative(hotel.pricePerNight),
      rating: num(hotel.rating) ?? 0,
      location: str(hotel.location),
      perks: strings(hotel.perks),
      image: str(hotel.image),
    }));

  const foodGuide = (Array.isArray(parsed.foodGuide) ? parsed.foodGuide : [])
    .filter((food: any) => isObject(food) && str(food.dishName) !== '')
    .map((food: any) => ({
      dishName: str(food.dishName),
      dishType: str(food.dishType, 'Local Delicacy'),
      description: str(food.description),
      recommendedSpot: str(food.recommendedSpot),
      priceRange: str(food.priceRange),
    }));

  const packingAdvice = strings(parsed.packingAdvice);

  const translations: Record<string, any> = {};
  if (isObject(parsed.translations)) {
    for (const [key, value] of Object.entries(parsed.translations)) {
      if (isObject(value) && str((value as any).summary) !== '')
        translations[key] = {
          languageName: str((value as any).languageName, key),
          greeting: str((value as any).greeting),
          summary: str((value as any).summary),
        };
    }
  }

  const rawWeather = isObject(parsed.weatherForecast) ? parsed.weatherForecast : {};
  const avgTempC = num(rawWeather.avgTempC) ?? null;
  if (avgTempC === null)
    notes.push('No live forecast was included — check the weather before packing.');
  const weatherForecast = {
    avgTempC,
    condition: str(rawWeather.condition, 'Not included'),
    packingTip: str(
      rawWeather.packingTip,
      'Check a live forecast for these dates before you pack.'
    ),
    bestTimeToVisit: str(rawWeather.bestTimeToVisit),
  };

  const plan: any = {
    title: str(
      parsed.title,
      `${days.length}-Day ${request.destination} plan from ${request.origin}`
    ),
    origin: request.origin,
    originCoords: request.originCoords,
    destination: request.destination,
    destCoords: request.destCoords,
    distanceKm: request.distanceKm,
    durationDays: days.length,
    travelers: request.travelers,
    groupType: request.groupType,
    budgetTier: request.budgetTier,
    vibe: request.vibe,
    summary: str(
      parsed.summary,
      `A ${days.length}-day plan from ${request.origin} to ${request.destination} (${request.distanceKm.toLocaleString()} km) for ${request.travelers} traveler(s).`
    ),
    transitOptions,
    days,
    hotels,
    foodGuide,
    weatherForecast,
    budgetBreakdown: deriveBudget({ transitOptions, hotels, days }, days.length),
    packingAdvice,
    translations,
  };

  const rawBudget = isObject(parsed.budgetBreakdown) ? parsed.budgetBreakdown : null;
  if (rawBudget) {
    const modelBudget = {
      transport: nonNegative(rawBudget.transport),
      accommodation: nonNegative(rawBudget.accommodation),
      food: nonNegative(rawBudget.food),
      activities: nonNegative(rawBudget.activities),
      buffer: nonNegative(rawBudget.buffer),
    };
    const modelTotal =
      modelBudget.transport +
      modelBudget.accommodation +
      modelBudget.food +
      modelBudget.activities +
      modelBudget.buffer;
    if (modelTotal > 0) {
      // Recomputed so the parts always add up to the total the UI displays.
      const declared = nonNegative(rawBudget.totalPerPerson);
      if (declared !== modelTotal)
        notes.push('Recalculated the budget total from its parts.');
      plan.budgetBreakdown = { ...modelBudget, totalPerPerson: modelTotal };
    }
  }

  return { plan, notes };
}

function responseText(response: any): { text: string; finishReason?: string } {
  let text = '';
  try {
    text = response?.text || '';
  } catch {
    text = ''; // the getter throws when no candidate was returned
  }
  const candidate = response?.candidates?.[0];
  if (!text) {
    const parts = candidate?.content?.parts || [];
    text = parts
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return { text, finishReason: candidate?.finishReason };
}

function errorStatus(error: any): number | undefined {
  const code = error?.code ?? error?.status;
  if (typeof code === 'number' && code >= 100 && code < 600) return code;
  return undefined;
}

function isRetryable(error: any): boolean {
  const status = errorStatus(error);
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  const message = String(error?.message || error?.status || '').toLowerCase();
  return (
    message.includes('resource_exhausted') ||
    message.includes('unavailable') ||
    message.includes('deadline_exceeded') ||
    message.includes('high demand') ||
    message.includes('overloaded') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('econnreset') ||
    message.includes('fetch failed')
  );
}

/** A bad key or auth failure will not be fixed by another model. */
function isAccountError(error: any): boolean {
  const status = errorStatus(error);
  const message = String(error?.message || '').toLowerCase();
  if (status === 401) return true;
  return Boolean(
    status === 400 && (message.includes('api key') || message.includes('api_key'))
  );
}

/** A missing or unentitled model should fall through to the next configured one. */
function isModelError(error: any): boolean {
  const status = errorStatus(error);
  const message = String(error?.message || '').toLowerCase();
  if (status === 404) return true;
  return (
    (status === 400 || status === 403) &&
    (message.includes('model') || message.includes('not found'))
  );
}

function isSchemaRejection(error: any): boolean {
  const status = errorStatus(error);
  const message = String(error?.message || '').toLowerCase();
  return (
    (status === 400 || message.includes('invalid_argument')) &&
    (message.includes('schema') || message.includes('response_schema'))
  );
}

/**
 * Call Gemini for a full trip plan. Returns the reason for failure instead of throwing so the
 * endpoint can fall back to the clearly labelled sample plan.
 */
export async function generateLivePlan(
  request: LivePlanRequest,
  options: LivePlanOptions
): Promise<LivePlanOutcome> {
  const models =
    options.models && options.models.length ? options.models : resolveModels();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadlineMs = options.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const attemptsPerModel = options.attemptsPerModel ?? DEFAULT_ATTEMPTS_PER_MODEL;
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const log = options.log ?? (() => {});

  const startedAt = Date.now();
  const prompt = buildPlanPrompt(request);
  let useSchema = options.useSchema ?? true;
  let attempts = 0;
  let lastModel = models[0];
  let lastError: any = null;
  let lastText = '';

  const ai = new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: {
      timeout: timeoutMs,
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    },
  });

  for (const model of models) {
    lastModel = model;
    for (let attempt = 1; attempt <= attemptsPerModel; attempt++) {
      if (Date.now() - startedAt > deadlineMs) {
        return {
          status: 'unavailable',
          reason: `Timed out after ${attempts} attempt(s) within the ${Math.round(
            deadlineMs / 1000
          )}s budget`,
          model: lastModel,
          attempts,
        };
      }
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            ...(useSchema ? { responseSchema: planResponseSchema } : {}),
            maxOutputTokens,
            // Thinking tokens were eating the output budget and returning empty text.
            thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
          } as any,
        });
        const { text, finishReason } = responseText(response);
        if (!text) {
          lastError = new Error(
            `empty response (finishReason: ${finishReason || 'unknown'})`
          );
          log('Gemini returned no text', { model, finishReason });
          if (attempt < attemptsPerModel) {
            await sleep(600 * attempt);
            continue;
          }
          break;
        }
        lastText = text;

        let parsed: any;
        try {
          parsed = JSON.parse(stripFences(text));
        } catch {
          try {
            parsed = JSON.parse(repairJsonText(text));
            if (finishReason === 'MAX_TOKENS')
              log('Repaired truncated plan JSON', { model, finishReason });
          } catch (repairError) {
            lastError = repairError;
            log('Could not parse plan JSON', {
              model,
              finishReason,
              message: (repairError as Error).message,
            });
            if (attempt < attemptsPerModel) {
              await sleep(600 * attempt);
              continue;
            }
            break;
          }
        }

        const normalized = normalizePlan(parsed, request);
        if (!normalized) {
          lastError = new Error('model output had no usable itinerary days');
          if (attempt < attemptsPerModel) {
            await sleep(600 * attempt);
            continue;
          }
          break;
        }
        if (!isGeneratedTripPlan(normalized.plan)) {
          lastError = new Error('normalized plan failed validation');
          log('Normalized plan failed validation', { model });
          break;
        }
        return {
          status: 'ok',
          plan: normalized.plan,
          model,
          attempts,
          notes: normalized.notes,
        };
      } catch (error: any) {
        lastError = error;
        if (isSchemaRejection(error) && useSchema) {
          log('Model rejected the response schema; retrying without it', { model });
          useSchema = false;
          attempts--; // a schema rejection is not a real attempt at the plan
          continue;
        }
        if (isAccountError(error)) {
          return {
            status: 'unavailable',
            reason: `${model}: ${error?.message || 'request rejected'}`,
            model,
            attempts,
          };
        }
        if (!isRetryable(error)) {
          // Model-level rejection (unknown id, no entitlement): try the next model.
          log('Model rejected the request; trying the next model', {
            model,
            message: error?.message,
            modelLevel: isModelError(error),
          });
          break;
        }
        log('Gemini attempt failed, backing off', {
          model,
          attempt,
          message: error?.message,
        });
        if (attempt < attemptsPerModel) await sleep(600 * 2 ** (attempt - 1));
      }
    }
  }

  return {
    status: 'unavailable',
    reason:
      lastError?.message ||
      (lastText ? 'model output could not be used' : 'no model response'),
    model: lastModel,
    attempts,
  };
}
