import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import Pbf from 'pbf';
import type { PlaceItem } from '../src/types';
import { normalizePlaceQuery } from '../src/utils/places';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-only GeoNames gazetteer. Do not import this module into the browser bundle.
// Package code: MIT. Geographic data: GeoNames, CC BY (see docs/PLACE_SEARCH.md).
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = new Map<string, string>();

let lastLat = 0;
let lastLon = 0;

function readCity(tag: number, city: any, pbf: any) {
  if (tag === 1) city.cityId = pbf.readSVarint();
  else if (tag === 2) city.name = pbf.readString();
  else if (tag === 3) city.country = pbf.readString();
  else if (tag === 4) city.altName = pbf.readString();
  else if (tag === 5) city.muni = pbf.readString();
  else if (tag === 6) city.muniSub = pbf.readString();
  else if (tag === 7) city.featureCode = pbf.readString();
  else if (tag === 8) city.adminCode = pbf.readString();
  else if (tag === 9) city.population = pbf.readVarint();
  else if (tag === 10) {
    lastLon += pbf.readSVarint();
    city.loc.coordinates[0] = lastLon / 1e5;
  } else if (tag === 11) {
    lastLat += pbf.readSVarint();
    city.loc.coordinates[1] = lastLat / 1e5;
  }
}

function parsePbfBuffer(buffer: Buffer): any[] {
  const pbf = new (Pbf as any)(buffer);
  const cities: any[] = [];
  lastLat = 0;
  lastLon = 0;
  while (pbf.pos < pbf.length) {
    cities.push(
      pbf.readMessage(readCity, {
        cityId: '',
        name: '',
        altName: '',
        country: '',
        featureCode: '',
        adminCode: '',
        population: 0,
        loc: { type: 'Point', coordinates: [0, 0] },
      })
    );
  }
  return cities;
}

function loadCities(): any[] {
  const candidatePaths = [
    path.join(__dirname, 'cities.pbf'),
    path.join(process.cwd(), 'server', 'cities.pbf'),
    path.join(process.cwd(), 'cities.pbf'),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      if (fs.existsSync(candidatePath)) {
        return parsePbfBuffer(fs.readFileSync(candidatePath));
      }
    } catch {
      // Try the next path so a missing optional index does not crash startup.
    }
  }

  console.warn('[TripCheck] cities.pbf unavailable; using fallback place search.');
  return [];
}

const rows = loadCities().map((city: any) => {
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
