import { test, expect, request as pwRequest } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  generateLivePlan,
  normalizePlan,
  repairJsonText,
  resolveModels,
  type LivePlanRequest,
} from '../server/aiPlan';
import { isGeneratedTripPlan } from '../src/utils/validation';

/**
 * Live trip generation cannot reach Google from a sandbox, so these tests point the real
 * Google SDK at a local stand-in endpoint. Everything between the HTTP request and the
 * response the browser receives — prompt, retries, JSON repair, normalisation, validation —
 * is the shipping code.
 */

const REQUEST: LivePlanRequest = {
  origin: 'New Delhi, India',
  destination: 'Agra, India',
  originCoords: { lat: 28.6139, lng: 77.209 },
  destCoords: { lat: 27.1767, lng: 78.0081 },
  distanceKm: 179,
  days: 3,
  travelers: 2,
  groupType: 'Couple',
  budgetTier: 'Moderate',
  vibe: 'Culture & Gastronomy',
};

const activity = (n: number, extra: Record<string, unknown> = {}) => ({
  time: `0${8 + n}:00`,
  title: `Stop ${n}`,
  category: 'sightseeing',
  location: `Place ${n}`,
  cost: 10 + n,
  description: `Detail ${n}`,
  ...extra,
});

const day = (n: number, count = 3) => ({
  dayNumber: n,
  theme: `Theme ${n}`,
  activities: Array.from({ length: count }, (_, i) => activity(i + 1)),
});

function modelPlan(overrides: Record<string, unknown> = {}) {
  return {
    title: '3-Day Agra Journey from New Delhi',
    summary: 'Taj Mahal sunrise, Agra Fort and a food walk through the old city.',
    transitOptions: [
      {
        mode: 'train',
        title: 'Gatimaan Express',
        duration: '1h 40m',
        estimatedCost: 18,
        details: 'Chair car with onboard catering',
        isRecommended: true,
      },
    ],
    days: [day(1), day(2), day(3)],
    hotels: [
      {
        name: 'Hotel Sidhartha',
        tier: 'Budget',
        pricePerNight: 45,
        rating: 4.2,
        location: 'Taj Ganj',
        perks: ['Rooftop Taj view'],
        image: 'https://example.com/hotel.jpg',
      },
    ],
    foodGuide: [
      {
        dishName: 'Petha',
        dishType: 'Dessert',
        description: 'Translucent sweet made from ash gourd',
        recommendedSpot: 'Panchhi Petha',
        priceRange: '$2 - $5',
      },
    ],
    weatherForecast: {
      avgTempC: 26,
      condition: 'Clear',
      packingTip: 'Sun hat and water bottle',
      bestTimeToVisit: 'October - March',
    },
    budgetBreakdown: {
      transport: 18,
      accommodation: 90,
      food: 40,
      activities: 30,
      buffer: 18,
      totalPerPerson: 196,
    },
    packingAdvice: ['Passport', 'Walking shoes'],
    translations: {
      hi: { languageName: 'Hindi', greeting: 'नमस्ते', summary: 'आगरा की यात्रा।' },
    },
    ...overrides,
  };
}

interface StubCall {
  path: string;
  body: any;
}

async function startStub(
  handler: (call: StubCall, index: number) => { status: number; body: any }
) {
  const calls: StubCall[] = [];
  const server: Server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const call: StubCall = {
        path: req.url || '',
        body: raw ? JSON.parse(raw) : {},
      };
      calls.push(call);
      const { status, body } = handler(call, calls.length);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;
  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const okBody = (plan: any) => ({
  candidates: [
    {
      content: { role: 'model', parts: [{ text: JSON.stringify(plan) }] },
      finishReason: 'STOP',
    },
  ],
});

const errorBody = (status: number, message: string) => ({
  error: { code: status, message, status: 'FAILED_PRECONDITION' },
});

const fastOptions = {
  apiKey: 'test-key',
  sleep: async () => {},
  log: () => {},
};

test('resolveModels honours a comma separated priority list', () => {
  expect(resolveModels('')).toEqual(['gemini-3.8-flash']);
  expect(resolveModels('gemini-2.5-pro, gemini-2.5-flash ,gemini-2.5-pro')).toEqual([
    'gemini-2.5-pro',
    'gemini-3.8-flash',
  ]);
});

test('a complete model plan is returned as a live plan', async () => {
  const stub = await startStub(() => ({ status: 200, body: okBody(modelPlan()) }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.model).toBe('gemini-3.8-flash');
    expect(outcome.notes).toEqual([]);
    expect(isGeneratedTripPlan(outcome.plan)).toBe(true);
    expect(outcome.plan.days).toHaveLength(3);
    expect(outcome.plan.durationDays).toBe(3);
    expect(outcome.plan.origin).toBe('New Delhi, India');
    expect(outcome.plan.summary).toContain('Taj Mahal');

    // The request the SDK actually sent must carry the reliability config.
    const sent = stub.calls[0];
    expect(sent.path).toContain('models/gemini-3.8-flash:generateContent');
    expect(sent.body.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.body.generationConfig.maxOutputTokens).toBe(8192);
    expect(sent.body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
    expect(sent.body.generationConfig.responseSchema.properties.days).toBeTruthy();
    expect(sent.body.contents[0].parts[0].text).toContain('EXACTLY 3 entries');
    // No fabricated coordinates are seeded into the prompt any more.
    expect(sent.body.contents[0].parts[0].text).not.toContain('78.0131');
  } finally {
    await stub.close();
  }
});

test('a 503 capacity spike is retried instead of silently falling back', async () => {
  const stub = await startStub((call, index) =>
    index === 1
      ? { status: 503, body: errorBody(503, 'The model is overloaded. Please try again.') }
      : { status: 200, body: okBody(modelPlan()) }
  );
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('ok');
    expect(outcome.status === 'ok' && outcome.attempts).toBe(2);
    expect(stub.calls).toHaveLength(2);
  } finally {
    await stub.close();
  }
});

test('a rejected API key stops immediately with a reason', async () => {
  const stub = await startStub(() => ({
    status: 400,
    body: errorBody(400, 'API key not valid. Please pass a valid API key.'),
  }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('unavailable');
    expect(outcome.status === 'unavailable' && outcome.reason).toContain(
      'API key not valid'
    );
    expect(outcome.status === 'unavailable' && outcome.attempts).toBe(1);
    expect(stub.calls).toHaveLength(1);
  } finally {
    await stub.close();
  }
});

test('truncated model JSON is repaired into a shorter live plan', async () => {
  const full = JSON.stringify(modelPlan());
  // Cut in the middle of day 3 so the repair has to drop a partially written day.
  const truncated = full.slice(0, full.indexOf('"dayNumber":3'));
  const stub = await startStub(() => ({
    status: 200,
    body: {
      candidates: [
        {
          content: { role: 'model', parts: [{ text: truncated }] },
          finishReason: 'MAX_TOKENS',
        },
      ],
    },
  }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;
    expect(outcome.plan.days).toHaveLength(2);
    expect(outcome.plan.durationDays).toBe(outcome.plan.days.length);
    expect(isGeneratedTripPlan(outcome.plan)).toBe(true);
    expect(outcome.notes.join(' ')).toContain('returned 2 of the 3 days');
  } finally {
    await stub.close();
  }
});

test('prose and markdown fences around the JSON are ignored', async () => {
  const stub = await startStub(() => ({
    status: 200,
    body: {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                text: `Sure! Here is your plan:\n\`\`\`json\n${JSON.stringify(
                  modelPlan()
                )}\n\`\`\`\nEnjoy the trip!`,
              },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    },
  }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('ok');
    expect(outcome.status === 'ok' && outcome.plan.days).toHaveLength(3);
  } finally {
    await stub.close();
  }
});

test('unparseable output is reported, not passed on as a plan', async () => {
  const stub = await startStub(() => ({
    status: 200,
    body: {
      candidates: [
        {
          content: { role: 'model', parts: [{ text: 'I cannot help with that.' }] },
          finishReason: 'STOP',
        },
      ],
    },
  }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('unavailable');
    expect(outcome.status === 'unavailable' && outcome.reason).toContain(
      'no JSON object'
    );
  } finally {
    await stub.close();
  }
});

test('an empty response caused by the thinking budget is reported with the finish reason', async () => {
  const stub = await startStub(() => ({
    status: 200,
    body: { candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] },
  }));
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('unavailable');
    expect(outcome.status === 'unavailable' && outcome.reason).toContain('MAX_TOKENS');
    expect(outcome.status === 'unavailable' && outcome.attempts).toBe(2);
  } finally {
    await stub.close();
  }
});

test('a model that rejects the response schema is retried without it', async () => {
  const stub = await startStub((call, index) =>
    index === 1
      ? {
          status: 400,
          body: errorBody(400, 'Invalid JSON payload received. response_schema is not supported.'),
        }
      : { status: 200, body: okBody(modelPlan()) }
  );
  try {
    const outcome = await generateLivePlan(REQUEST, { ...fastOptions, baseUrl: stub.url });
    expect(outcome.status).toBe('ok');
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0].body.generationConfig.responseSchema).toBeTruthy();
    expect(stub.calls[1].body.generationConfig.responseSchema).toBeUndefined();
  } finally {
    await stub.close();
  }
});

test('a second configured model is used when the first one fails', async () => {
  const stub = await startStub((call) =>
    call.path.includes('gemini-2.5-pro')
      ? { status: 200, body: okBody(modelPlan()) }
      : { status: 404, body: errorBody(404, 'models/unknown-model is not found') }
  );
  try {
    const outcome = await generateLivePlan(REQUEST, {
      ...fastOptions,
      baseUrl: stub.url,
      models: ['unknown-model', 'gemini-2.5-pro'],
    });
    expect(outcome.status).toBe('ok');
    expect(outcome.status === 'ok' && outcome.model).toBe('gemini-2.5-pro');
  } finally {
    await stub.close();
  }
});

test('repairJsonText closes a truncated object and keeps the parseable prefix', () => {
  const repaired = repairJsonText('{"a": 1, "b": [1, 2, {"c": "unterminated');
  expect(JSON.parse(repaired)).toEqual({ a: 1, b: [1, 2] });
  expect(() => repairJsonText('no json here')).toThrow();
});

test('normalisePlan drops copied coordinates, extra days and bad totals', () => {
  const parsed = modelPlan({
    days: [
      {
        dayNumber: 9,
        theme: 'Copied centre',
        activities: [
          // Same point as the destination centre: copied from the prompt, not a real place.
          activity(1, { lat: 27.1767, lng: 78.0081 }),
          activity(2, { lat: 27.1751, lng: 78.0421 }),
          activity(3, { lat: 999, lng: 78.0081 }),
        ],
      },
      day(2),
      day(3),
      day(4),
    ],
    budgetBreakdown: {
      transport: 10,
      accommodation: 20,
      food: 30,
      activities: 40,
      buffer: 10,
      totalPerPerson: 999,
    },
  });
  const result = normalizePlan(parsed, REQUEST);
  expect(result).not.toBeNull();
  const { plan, notes } = result!;
  expect(plan.days).toHaveLength(3);
  expect(plan.days[0].activities.map((a) => a.lat)).toEqual([undefined, 27.1751, undefined]);
  const budget = plan.budgetBreakdown;
  expect(budget.totalPerPerson).toBe(
    budget.transport + budget.accommodation + budget.food + budget.activities + budget.buffer
  );
  expect(isGeneratedTripPlan(plan)).toBe(true);
  expect(notes.join(' ')).toContain('Trimmed to the 3 days');
  expect(notes.join(' ')).toContain('Recalculated the budget total');
  expect(notes.join(' ')).toContain('copied from the destination centre');
});

test('a plan missing optional sections stays usable instead of being discarded', () => {
  const parsed = modelPlan();
  delete (parsed as any).hotels;
  delete (parsed as any).weatherForecast;
  delete (parsed as any).translations;
  delete (parsed as any).packingAdvice;
  const result = normalizePlan(parsed, REQUEST);
  expect(result).not.toBeNull();
  const { plan, notes } = result!;
  expect(plan.hotels).toEqual([]);
  expect(plan.weatherForecast.avgTempC).toBeNull();
  expect(plan.translations).toEqual({});
  expect(plan.packingAdvice).toEqual([]);
  expect(isGeneratedTripPlan(plan)).toBe(true);
  expect(notes.join(' ')).toContain('No live forecast was included');
});

test('a plan with no usable days is rejected', () => {
  const result = normalizePlan({ title: 'x', days: [{ theme: 'empty' }] }, REQUEST);
  expect(result).toBeNull();
});

test.describe('the /api/ai/plan endpoint against a stand-in Gemini service', () => {
  // One worker: the tests share the spawned server and the stub's mode switch.
  test.describe.configure({ mode: 'serial' });
  let stub: Awaited<ReturnType<typeof startStub>>;
  let app: ChildProcess;
  let baseUrl = '';
  const port = 3100 + Math.floor(Math.random() * 800);
  /** Proves the tests talk to the server they spawned, not a leftover from an earlier run. */
  const uniqueModel = `stub-check-${Date.now()}`;
  let stubMode: 'live' | 'failing' = 'live';

  test.beforeAll(async () => {
    stub = await startStub(() =>
      stubMode === 'live'
        ? { status: 200, body: okBody(modelPlan()) }
        : { status: 500, body: errorBody(500, 'Internal error.') }
    );
    app = spawn('npx', ['tsx', 'server.ts'], {
      cwd: process.cwd(),
      detached: true,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
        GEMINI_API_KEY: 'test-key',
        GEMINI_BASE_URL: stub.url,
        GEMINI_MODEL: uniqueModel,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const logs: string[] = [];
    app.stdout?.on('data', (chunk) => logs.push(String(chunk)));
    app.stderr?.on('data', (chunk) => logs.push(String(chunk)));
    baseUrl = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 90; i++) {
      try {
        const response = await fetch(`${baseUrl}/api/ai/status`);
        if (response.ok) {
          const status = await response.json();
          if (status.models?.[0] === uniqueModel) return;
        }
      } catch {
        // still booting
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`app server did not become healthy:\n${logs.join('')}`);
  });

  test.afterAll(async () => {
    try {
      if (app?.pid) process.kill(-app.pid, 'SIGKILL');
    } catch {
      app?.kill('SIGKILL');
    }
    await stub?.close();
  });

  const payload = {
    origin: 'New Delhi, India',
    originCoords: { lat: 28.6139, lng: 77.209 },
    destination: 'Agra, India',
    destCoords: { lat: 27.1767, lng: 78.0081 },
    days: 3,
    travelers: 2,
  };

  test('reports that live generation is configured', async () => {
    const context = await pwRequest.newContext();
    const response = await context.get(`${baseUrl}/api/ai/status`);
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({
      success: true,
      live: true,
      models: [uniqueModel],
    });
    await context.dispose();
  });

  test('returns a live plan end to end', async () => {
    stubMode = 'live';
    const context = await pwRequest.newContext();
    const response = await context.post(`${baseUrl}/api/ai/plan`, { data: payload });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.source).toBe('ai');
    expect(body.model).toBe(uniqueModel);
    expect(body.notice).toContain('Live AI plan');
    expect(body.plan.days).toHaveLength(3);
    expect(body.plan.durationDays).toBe(3);
    expect(body.plan.destCoords).toEqual({ lat: 27.1767, lng: 78.0081 });
    expect(isGeneratedTripPlan(body.plan)).toBe(true);
    // Server-derived truth wins over whatever the model echoed back.
    expect(body.plan.distanceKm).toBe(178); // haversine for these coordinates
    await context.dispose();
  });

  test('falls back to the labelled sample plan when the model keeps failing', async () => {
    stubMode = 'failing';
    const context = await pwRequest.newContext();
    const response = await context.post(`${baseUrl}/api/ai/plan`, { data: payload });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.source).toBe('sample');
    expect(body.notice).toContain('illustrative');
    expect(body.plan.days).toHaveLength(3);
    expect(isGeneratedTripPlan(body.plan)).toBe(true);
    expect(stub.calls.length).toBeGreaterThanOrEqual(2);
    await context.dispose();
  });
});
