import { ArrowUpRight, MapPin, Navigation } from 'lucide-react';
import {
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
} from '../utils/googleMaps';

export function GoogleMapsLink({
  place,
  origin,
  directions = false,
  label,
  className = '',
}: {
  place: string;
  origin?: string;
  directions?: boolean;
  label?: string;
  className?: string;
}) {
  if (!place.trim()) return null;
  return (
    <a
      className={`google-maps-link ${className}`}
      href={
        directions
          ? googleMapsDirectionsUrl(place, origin)
          : googleMapsSearchUrl(place)
      }
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label || (directions ? 'Get directions' : 'Open Google Maps')} for ${place} (opens in a new tab)`}
    >
      {directions ? <Navigation size={16} /> : <MapPin size={16} />}
      <span>
        {label || (directions ? 'Get directions' : 'Open Google Maps')}
      </span>
      <ArrowUpRight size={15} />
    </a>
  );
}

export function GoogleMapsCard({
  destination,
  origin,
}: {
  destination: string;
  origin?: string;
}) {
  return (
    <section className="google-maps-card" aria-label="Explore with Google Maps">
      <div className="maps-card-icon">
        <MapPin size={24} />
      </div>
      <div>
        <span className="eyebrow">THE LATEST, STRAIGHT FROM GOOGLE MAPS</span>
        <h3>{destination}</h3>
        <p>
          Check places, opening hours, reviews and directions on Google Maps.
          Opens in a new tab—no map to load here.
        </p>
      </div>
      <div className="maps-card-actions">
        <GoogleMapsLink place={destination} />
        <GoogleMapsLink place={destination} origin={origin} directions />
      </div>
    </section>
  );
}
