import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { PlaceItem } from '../src/types';
import { normalizePlaceQuery } from '../src/utils/places';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-only GeoNames gazetteer. Do not import this module into the browser bundle.
// Package code: MIT. Geographic data: GeoNames, CC BY (see docs/PLACE_SEARCH.md).
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = new Map<string, string>();

// Safely load cities. On Vercel, all-the-cities is marked external so its
// __dirname inside node_modules resolves correctly to the cities.pbf file.
// On local dev / traditional hosting, the package works as normal.
let cities: any[] = [];
try {
  // Dynamic import so esbuild doesn't bundle the binary-dependent package inline.
  // Because externalPackages marks it external in vercel.json, Vercel loads it
  // directly from node_modules where __dirname is correct.
  const mod = await import('all-the-cities').catch(async () => {
    // Fallback: try loading via server-side require shim
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    return { default: req('all-the-cities') };
  });
  const raw = (mod as any).default ?? mod;
  if (Array.isArray(raw)) cities = raw;
} catch (err) {
  console.warn('[TripCheck] cities index unavailable, falling back to live search providers:', (err as any)?.message);
}

const rows = cities.map((city: any) => {
  if (!countries.has(city.country))
    countries.set(city.country, regionNames.of(city.country) || city.country);
  const country = countries.get(city.country)!;
  const name = normalizePlaceQuery(city.name);
  return {
    city,
    country,
    name,
    haystack: `${name} ${normalizePlaceQuery(country)} ${city.country.toLowerCase()}`,
  };
});

export const CITY_INDEX_SIZE = rows.length;

export function searchCityIndex(query: string): PlaceItem[] {
  const q = normalizePlaceQuery(query);
  if (q.length < 2) return [];
  const tokens = q.split(' ');
  return rows
    .filter((row) => tokens.every((token) => row.haystack.includes(token)))
    .sort((a, b) => {
      const score = (row: typeof a) =>
        row.name === q ? 3 : row.name.startsWith(q) ? 2 : 1;
      return score(b) - score(a) || b.city.population - a.city.population;
    })
    .slice(0, 12)
    .map(({ city, country }) => ({
      id: `geonames-${city.cityId}`,
      name: city.name,
      label: `${city.name}, ${country}`,
      country,
      lat: city.loc.coordinates[1],
      lng: city.loc.coordinates[0],
      type: city.population >= 50000 ? 'city' : 'town',
    }));
}
