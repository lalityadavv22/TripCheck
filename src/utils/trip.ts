import { ActivityItem, ItineraryDay } from '../types';
export function dateAfter(start: string, days: number) {
  const date = new Date(`${start}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function today() {
  return new Date().toISOString().slice(0, 10);
}
export function importDays(
  days: any[],
  destination: string,
  start: string
): ItineraryDay[] {
  const categories = [
    'flight',
    'lodging',
    'sightseeing',
    'food',
    'transport',
    'leisure',
  ];
  return days.map((d, i) => ({
    dayNumber: i + 1,
    date: dateAfter(start, i),
    theme: d.theme || 'Time to explore',
    activities: (d.activities || []).map((a: any) => ({
      id: crypto.randomUUID(),
      time: a.time || '10:00',
      title: a.title || 'Explore the neighborhood',
      category: (categories.includes(a.category)
        ? a.category
        : 'sightseeing') as ActivityItem['category'],
      locationName: a.location || destination,
      lat: Number.isFinite(a.lat) ? a.lat : undefined,
      lng: Number.isFinite(a.lng) ? a.lng : undefined,
      cost: Math.max(0, Number(a.cost) || 0),
      notes: a.description || '',
      isCompleted: false,
    })),
  }));
}
