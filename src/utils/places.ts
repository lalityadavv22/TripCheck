import { CURATED_GLOBAL_PLACES } from '../data/places';
import type { PlaceItem } from '../types';

export function normalizePlaceQuery(query: string) {
  return query
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[,()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function searchLocalPlaces(query: string): PlaceItem[] {
  const normalized = normalizePlaceQuery(query);
  if (!normalized) return CURATED_GLOBAL_PLACES.slice(0, 10);
  const tokens = normalized.split(' ');
  const score = (p: PlaceItem) =>
    [p.name, ...(p.aliases || [])].some(
      (n) => normalizePlaceQuery(n) === normalized
    )
      ? 2
      : normalizePlaceQuery(p.name).startsWith(normalized)
        ? 1
        : 0;
  return CURATED_GLOBAL_PLACES.filter((p) => {
    const haystack = normalizePlaceQuery(
      [p.name, p.label, ...(p.aliases || [])].join(' ')
    );
    return tokens.every((token) => haystack.includes(token));
  })
    .sort((a, b) => score(b) - score(a))
    .slice(0, 12);
}
export function isPlaceItem(p: any): p is PlaceItem {
  return (
    !!p &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.label === 'string' &&
    typeof p.type === 'string' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}
