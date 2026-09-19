import { CITY_INDEX_SIZE, searchCityIndex } from '../server/cityIndex';
import { test, expect } from '@playwright/test';
import {
  createPlaceSearch,
  mergePlaces,
  photonPlaces,
  geoapifyPlaces,
} from '../server/placeSearch';
import { searchLocalPlaces } from '../src/utils/places';
import {
  googleMapsSearchUrl,
  googleMapsDirectionsUrl,
} from '../src/utils/googleMaps';

const feature = (
  name: string,
  kind = 'village',
  id = 1,
  lat = 28.1,
  lng = 77.1
) => ({
  properties: {
    name,
    osm_key: 'place',
    osm_value: kind,
    osm_id: id,
    osm_type: 'N',
    state: 'Haryana',
    country: 'India',
  },
  geometry: { coordinates: [lng, lat] },
});
const reply = (features: any[]) =>
  new Response(JSON.stringify({ features }), { status: 200 });

test('Gurugram, Gurgaon, Hindi and reordered queries resolve locally', () => {
  for (const query of [
    'Gurugram',
    'Gurgaon',
    'गुरुग्राम',
    'गुड़गांव',
    'India Haryana Gurgaon',
    'gUrUgRaM',
  ]) {
    expect(searchLocalPlaces(query)[0].id).toBe('city-gurugram');
  }
  expect(searchLocalPlaces('Khajjiar')[0].type).toBe('village');
});
test('worldwide provider is queried for unlisted villages, not just featured destinations', async () => {
  let requested = '';
  const search = createPlaceSearch(
    async (url) => {
      requested = String(url);
      return reply([feature('A small village outside the local list')]);
    },
    () => undefined
  );
  const result = await search('A small village outside the local list');
  expect(new URL(requested).searchParams.get('q')).toBe(
    'A small village outside the local list'
  );
  expect(result.source).toBe('live');
  expect(result.places[0].type).toBe('village');
});
test('provider parsing preserves zero coordinates and drops invalid locations', () => {
  const result = photonPlaces({
    features: [
      feature('Equator village', 'village', 1, 0, 0),
      feature('Invalid', 'city', 2, 91, 200),
    ],
  });
  expect(result).toHaveLength(1);
  expect(result[0].lat).toBe(0);
});
test('different nearby places and OSM types are not collapsed', () => {
  const places = photonPlaces({
    features: [
      feature('Small town', 'town', 1),
      feature('Small village', 'village', 2, 28.1001, 77.1001),
    ],
  });
  expect(mergePlaces(places, places)).toHaveLength(2);
});
test('failed providers use honest local suggestions and retry after short TTL', async () => {
  let timestamp = 0;
  let calls = 0;
  const search = createPlaceSearch(
    async () => {
      calls++;
      if (calls === 1) throw new Error('offline');
      return reply([feature('Recovered place')]);
    },
    () => undefined,
    () => timestamp
  );
  const failed = await search('Gurgaon');
  expect(failed.source).toBe('local-fallback');
  expect(failed.places[0].name).toBe('Gurugram');
  expect(failed.notice).toContain('unavailable');
  await search('Gurgaon');
  expect(calls).toBe(1);
  timestamp = 16000;
  expect((await search('Gurgaon')).source).toBe('live');
  expect(calls).toBe(2);
});
test('successful cache expires and duplicate in-flight requests coalesce', async () => {
  let calls = 0;
  let timestamp = 0;
  const search = createPlaceSearch(
    async () => {
      calls++;
      return reply([feature('Test village')]);
    },
    () => undefined,
    () => timestamp
  );
  await Promise.all([search('Test village'), search('Test village')]);
  expect(calls).toBe(1);
  await search('Test village');
  expect(calls).toBe(1);
  timestamp = 300001;
  await search('Test village');
  expect(calls).toBe(2);
});
test('optional second provider handles primary failure without exposing its key', async () => {
  let calls = 0;
  const search = createPlaceSearch(
    async () => {
      calls++;
      return calls === 1
        ? new Response('', { status: 503 })
        : new Response(
            JSON.stringify({
              results: [
                {
                  name: 'Tiny hamlet',
                  formatted: 'Tiny hamlet, India',
                  place_id: 'x',
                  lat: 28,
                  lon: 77,
                  result_type: 'village',
                },
              ],
            })
          );
    },
    () => 'test-key-not-a-real-secret'
  );
  const result = await search('Tiny hamlet');
  expect(result.source).toBe('live');
  expect(result.places[0].name).toBe('Tiny hamlet');
  expect(JSON.stringify(result)).not.toContain('test-key-not-a-real-secret');
  expect(result.attribution).toContain('Geoapify');
});
test('short queries do not call remote providers', async () => {
  let calls = 0;
  const search = createPlaceSearch(
    async () => {
      calls++;
      return reply([]);
    },
    () => undefined
  );
  await search('');
  await search('a');
  expect(calls).toBe(0);
});
test('Google Maps URLs encode arbitrary Unicode and query punctuation safely', () => {
  const name = 'गुरुग्राम / Sector 29 & café #1?';
  const url = new URL(googleMapsSearchUrl(name));
  expect(url.searchParams.get('query')).toBe(name);
  expect(url.origin).toBe('https://www.google.com');
  const directions = new URL(googleMapsDirectionsUrl(name, 'Rohtak, Haryana'));
  expect(directions.searchParams.get('origin')).toBe('Rohtak, Haryana');
  expect(directions.searchParams.get('destination')).toBe(name);
  expect(
    new URL(googleMapsDirectionsUrl(name)).searchParams.has('origin')
  ).toBe(false);
});
test('geoapify malformed coordinate data is rejected', () => {
  expect(
    geoapifyPlaces({
      results: [
        { name: 'Bad', formatted: 'Bad', place_id: 'x', lat: '28', lon: 77 },
      ],
    })
  ).toEqual([]);
});

test('offline city index searches beyond the curated list across countries and accents', () => {
  expect(CITY_INDEX_SIZE).toBeGreaterThan(100000);
  expect(searchCityIndex('Jind')[0].country).toBe('India');
  expect(searchCityIndex('Albuquerque')[0].name).toBe('Albuquerque');
  expect(searchCityIndex('El Tarter')[0].country).toBe('Andorra');
  expect(searchCityIndex('Sao Paulo')[0].country).toBe('Brazil');
});
