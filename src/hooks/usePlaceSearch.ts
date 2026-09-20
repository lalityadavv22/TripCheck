import { useEffect, useRef, useState } from 'react';
import { isPlaceItem, searchLocalPlaces } from '../utils/places';
import { parseJsonResponse } from '../utils/api';
import type { PlaceItem } from '../types';

export function usePlaceSearch(query: string, enabled = true) {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [attribution, setAttribution] = useState('');
  const sequence = useRef(0);
  useEffect(() => {
    const id = ++sequence.current;
    const clean = query.trim();
    const local = searchLocalPlaces(clean);
    setPlaces(local);
    setNotice('');
    setAttribution('');
    setLoading(false);
    if (!enabled || clean.length < 2) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/places/autocomplete?${new URLSearchParams({ q: clean })}`,
          {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(9000),
            ]),
          }
        );
        const data = await parseJsonResponse<{
          success?: boolean;
          notice?: string;
          attribution?: string;
          places?: unknown[];
        }>(response);
        if (!response.ok || !data.success || !Array.isArray(data.places))
          throw new Error('Search unavailable');
        if (controller.signal.aborted || id !== sequence.current) return;
        setPlaces(data.places.filter(isPlaceItem));
        setNotice(typeof data.notice === 'string' ? data.notice : '');
        setAttribution(
          typeof data.attribution === 'string' ? data.attribution : ''
        );
      } catch {
        if (!controller.signal.aborted && id === sequence.current) {
          setPlaces(local);
          setNotice(
            'Live place search is unavailable. Try again, or open your search in Google Maps.'
          );
        }
      } finally {
        if (!controller.signal.aborted && id === sequence.current)
          setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);
  return { places, loading, notice, attribution };
}
