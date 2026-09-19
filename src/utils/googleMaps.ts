export function googleMapsSearchUrl(place: string) {
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: place.trim() })}`;
}
export function googleMapsDirectionsUrl(destination: string, origin?: string) {
  const params = new URLSearchParams({
    api: '1',
    destination: destination.trim(),
  });
  if (origin?.trim()) params.set('origin', origin.trim());
  return `https://www.google.com/maps/dir/?${params}`;
}
