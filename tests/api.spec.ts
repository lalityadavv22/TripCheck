import { test, expect } from '@playwright/test';

test('health, destination list, curated autocomplete', async ({ request }) => {
  expect((await request.get('/api/health')).ok()).toBeTruthy();
  const destinations = await (await request.get('/api/destinations')).json();
  expect(destinations).toHaveLength(7);
  const places = await (
    await request.get('/api/places/autocomplete?q=Tokyo')
  ).json();
  expect(places.places.some((p: any) => /Tokyo/i.test(p.name))).toBe(true);
});
for (const data of [
  {},
  { destination: 4 },
  { destination: 'Tokyo', origin: {} },
  { destination: 'Tokyo', days: -1 },
  { destination: 'Tokyo', days: 15 },
  { destination: 'Tokyo', travelers: 0 },
  { destination: 'Tokyo', travelers: 21 },
  { destination: 'Tokyo', destCoords: { lat: 99, lng: 0 } },
  { destination: 'Tokyo', budgetTier: 'invalid' },
  { destination: 'Tokyo', groupType: 'invalid' },
]) {
  test(`invalid plan parameters return 400: ${JSON.stringify(data)}`, async ({
    request,
  }) => {
    const response = await request.post('/api/ai/plan', { data });
    expect(response.status()).toBe(400);
    expect((await response.json()).success).toBe(false);
  });
}
test('sample source disclosure, duration bounds, zero coordinates and budget arithmetic', async ({
  request,
}) => {
  const response = await request.post('/api/ai/plan', {
    data: {
      origin: 'Origin',
      originCoords: { lat: 0, lng: 0 },
      destination: 'Destination',
      destCoords: { lat: 0, lng: 10 },
      days: 14,
      travelers: 1,
      budgetTier: 'Budget',
      groupType: 'Solo',
    },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.source).toBe('sample');
  expect(body.notice).toContain('illustrative');
  expect(body.plan.days).toHaveLength(14);
  expect(body.plan.originCoords).toEqual({ lat: 0, lng: 0 });
  const budget = body.plan.budgetBreakdown;
  expect(
    Math.round(
      budget.transport +
        budget.accommodation +
        budget.food +
        budget.activities +
        budget.buffer
    )
  ).toBe(budget.totalPerPerson);
  expect(body.plan.days[0].activities[0].lat).toBeUndefined();
});

test('unresolvable destinations fail honestly instead of invented coordinates', async ({
  request,
}) => {
  const response = await request.post('/api/ai/plan', {
    data: { origin: 'Delhi', destination: 'zzzz-no-such-place-938746' },
  });
  expect(response.status()).toBe(422);
  expect((await response.json()).error).toContain('couldn’t locate');
});
