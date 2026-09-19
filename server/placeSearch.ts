import { searchCityIndex } from './cityIndex';
import type { PlaceItem } from '../src/types';
import {
  isPlaceItem,
  normalizePlaceQuery,
  searchLocalPlaces,
} from '../src/utils/places';

export interface PlaceSearchResult {
  places: PlaceItem[];
  source: 'live' | 'local' | 'local-fallback';
  notice: string;
  attribution: string;
}
const text = (value: unknown) =>
  typeof value === 'string' ? value.trim().slice(0, 250) : '';
const unique = (parts: string[]) => [...new Set(parts.filter(Boolean))];

export function photonPlaces(body: any): PlaceItem[] {
  if (!Array.isArray(body?.features))
    throw new Error('Invalid search response');
  return body.features.flatMap((f: any) => {
    const p = f?.properties || {};
    const [lng, lat] = f?.geometry?.coordinates || [];
    const name = text(p.name || p.city || p.town || p.village || p.street);
    const city = text(p.city || p.town || p.village);
    const state = text(p.state);
    const country = text(p.country);
    const kind = text(p.osm_value);
    const type: PlaceItem['type'] =
      kind === 'city'
        ? 'city'
        : kind === 'town'
          ? 'town'
          : ['village', 'hamlet', 'isolated_dwelling'].includes(kind)
            ? 'village'
            : p.osm_key === 'natural'
              ? 'nature'
              : p.osm_key === 'aeroway'
                ? 'airport'
                : ['tourism', 'historic'].includes(p.osm_key)
                  ? 'attraction'
                  : 'general';
    const place = {
      id: `photon-${p.osm_type || 'place'}-${p.osm_id || `${lat}-${lng}`}`,
      name,
      label: unique([
        name,
        text(p.street),
        city,
        text(p.district),
        state,
        country,
      ]).join(', '),
      city,
      state,
      country,
      lat,
      lng,
      type,
    };
    return name && isPlaceItem(place) ? [place] : [];
  });
}
export function geoapifyPlaces(body: any): PlaceItem[] {
  if (!Array.isArray(body?.results)) throw new Error('Invalid search response');
  return body.results.flatMap((p: any) => {
    const name = text(
      p.name || p.city || p.town || p.village || p.address_line1
    );
    const place: PlaceItem = {
      id: `geoapify-${text(p.place_id)}`,
      name,
      label: text(p.formatted) || name,
      city: text(p.city),
      state: text(p.state),
      country: text(p.country),
      lat: p.lat,
      lng: p.lon,
      type: ['city', 'town', 'village'].includes(p.result_type)
        ? p.result_type
        : 'general',
    };
    return name && isPlaceItem(place) ? [place] : [];
  });
}
export function mergePlaces(local: PlaceItem[], live: PlaceItem[]) {
  const seen = new Set<string>();
  return [...local, ...live]
    .filter((p) => {
      // Don't merge different venues just because they share a neighborhood.
      const key = `${normalizePlaceQuery(p.name)}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

/** Public Photon supports autocomplete; an optional Geoapify key provides a second provider.
 * Never use public Nominatim as a per-keystroke autocomplete endpoint. */
export function createPlaceSearch(
  fetcher: typeof fetch = fetch,
  getKey = () => process.env.GEOAPIFY_API_KEY,
  now = Date.now
) {
  const cache = new Map<
    string,
    { expires: number; value: PlaceSearchResult }
  >();
  const pending = new Map<string, Promise<PlaceSearchResult>>();
  return async function search(query: string): Promise<PlaceSearchResult> {
    const clean = query.trim().slice(0, 200);
    const key = normalizePlaceQuery(clean);
    const curated = searchLocalPlaces(clean);
    if (key.length < 2)
      return {
        places: curated,
        source: 'local',
        notice: key ? 'Type at least 2 characters to search worldwide.' : '',
        attribution: '',
      };
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return cached.value;
    if (pending.has(key)) return pending.get(key)!;
    const task = (async () => {
      const local = mergePlaces(curated, searchCityIndex(clean));
      let live: PlaceItem[] = [];
      let available = false;
      let attribution = '© OpenStreetMap contributors';
      try {
        const response = await fetcher(
          `https://photon.komoot.io/api/?${new URLSearchParams({ q: clean, limit: '12' })}`,
          {
            signal: AbortSignal.timeout(3500),
            headers: { Accept: 'application/json' },
          }
        );
        if (!response.ok) throw new Error('Search unavailable');
        live = photonPlaces(await response.json());
        available = true;
      } catch {
        /* Local suggestions remain usable. Try the optional second provider. */
      }
      const apiKey = getKey();
      if (apiKey && (!available || live.length === 0)) {
        try {
          const response = await fetcher(
            `https://api.geoapify.com/v1/geocode/autocomplete?${new URLSearchParams({ text: clean, limit: '12', format: 'json', apiKey })}`,
            {
              signal: AbortSignal.timeout(3500),
              headers: { Accept: 'application/json' },
            }
          );
          if (!response.ok) throw new Error('Search unavailable');
          live = geoapifyPlaces(await response.json());
          available = true;
          attribution = 'Powered by Geoapify · © OpenStreetMap contributors';
        } catch {
          /* Do not log provider URLs: they may contain a key. */
        }
      }
      const value: PlaceSearchResult = {
        places: mergePlaces(curated, [...live, ...local]).sort((a, b) => {
          const exact = (p: PlaceItem) =>
            [p.name, ...(p.aliases || [])].some(
              (n) => normalizePlaceQuery(n) === key
            )
              ? 1
              : 0;
          return exact(b) - exact(a);
        }),
        source: available ? 'live' : 'local-fallback',
        notice: available
          ? ''
          : 'Live place search is unavailable. Showing the offline city index. You can search any place directly on Google Maps.',
        attribution: available
          ? `${attribution} · City index: GeoNames`
          : 'City index: GeoNames',
      };
      // Short failure TTL permits recovery; successful results expire too.
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, { value, expires: now() + (available ? 300000 : 15000) });
      return value;
    })();
    pending.set(key, task);
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  };
}
export const searchPlacesGlobal = createPlaceSearch();
