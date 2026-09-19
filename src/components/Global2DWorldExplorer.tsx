import React, { useMemo, useState, lazy, Suspense } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Compass,
  Mountain,
  Waves,
  Landmark,
  LayoutGrid,
  Map,
  Heart,
  Leaf,
  Globe2,
  X,
} from 'lucide-react';
import { Destination } from '../types';
const HighRes2DRouteMap = lazy(() =>
  import('./HighRes2DRouteMap').then((module) => ({
    default: module.HighRes2DRouteMap,
  }))
);
import { useLocalStorage } from '../hooks/useLocalStorage';

interface Props {
  destinations: Destination[];
  onSelectDestination: (destination: Destination) => void;
  onPlanTripTo: (city: string) => void;
  userOrigin?: string;
  children?: React.ReactNode;
}
const filters = [
  { name: 'All places', category: 'All', icon: Globe2 },
  { name: 'Beaches & islands', category: 'Tropical Sanctuaries', icon: Waves },
  { name: 'Mountains', category: 'Alpine Escapes', icon: Mountain },
  { name: 'City breaks', category: 'Neon Cyberpunk Cities', icon: Landmark },
  { name: 'Nature', category: 'Nordic Wilderness', icon: Leaf },
  { name: 'Culture & history', category: 'Cultural Heritage', icon: Compass },
];
export function Global2DWorldExplorer({
  destinations,
  onSelectDestination,
  onPlanTripTo,
  children,
}: Props) {
  const [category, setCategory] = useState('All');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [saved, setSaved] = useLocalStorage<string[]>('saved-destinations', []);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const result = destinations.filter(
      (d) =>
        (category === 'All' || d.category === category) &&
        (!savedOnly || saved.includes(d.id))
    );
    return sort === 'budget'
      ? result.sort((a, b) => a.estimatedBudgetPerDay - b.estimatedBudgetPerDay)
      : result;
  }, [destinations, category, savedOnly, saved, sort]);
  const active = destinations.find((d) => d.id === selected);
  return (
    <div className="explore-content">
      <section className="explore-hero">
        <img
          src="/images/lake-como.jpg"
          alt="A quiet lakeside village surrounded by green mountains"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span /> LESS PLANNING. MORE LIVING.
          </span>
          <h1>
            A change of scenery.
            <br />A world of possibilities.
          </h1>
          <p>
            The little escapes. The big adventures.
            <br />
            Find a place that feels like your next story.
          </p>
          <button
            onClick={() =>
              document
                .getElementById('destination-list')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            Find your next adventure <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="hero-location">
          <MapPin size={15} />
          <div>
            <strong>Somewhere worth slowing down.</strong>
            <span>Your next adventure starts here</span>
          </div>
        </div>
      </section>
      {children}
      <section id="destination-list" className="destination-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE INSPIRATION</span>
            <h2>Where to next?</h2>
            <p>Good places. Great memories. Pick your kind of getaway.</p>
          </div>
          <div className="view-switch" aria-label="Destination view">
            <button
              className={view === 'grid' ? 'selected' : ''}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid size={16} /> Grid
            </button>
            <button
              className={view === 'map' ? 'selected' : ''}
              aria-pressed={view === 'map'}
              onClick={() => setView('map')}
            >
              <Map size={16} /> Map
            </button>
          </div>
        </div>
        <div className="filter-row">
          <div className="category-filters">
            {filters.map(({ name, category: cat, icon: Icon }) => (
              <button
                key={cat}
                aria-pressed={cat === category}
                className={cat === category ? 'selected' : ''}
                onClick={() => setCategory(cat)}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
          <button
            className={`saved-filter ${savedOnly ? 'selected' : ''}`}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
          >
            <Heart size={16} /> Saved
            {saved.length > 0 ? ` (${saved.length})` : ''}
          </button>
        </div>
        <div className="results-bar">
          <span>
            <strong>{filtered.length}</strong> places to make your own{' '}
            <span className="results-dot">·</span> Estimates in USD
          </span>
          <label>
            Sort by:{' '}
            <select
              aria-label="Sort destinations"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recommended">Our picks</option>
              <option value="budget">Budget: low to high</option>
            </select>
          </label>
        </div>
        {!filtered.length ? (
          <div className="empty-state">
            <Heart size={30} />
            <h3>A little room for inspiration.</h3>
            <p>
              {savedOnly
                ? 'Tap the heart on a destination to save it here.'
                : 'Try a different category to find your next stop.'}
            </p>
            <button
              onClick={() => {
                setSavedOnly(false);
                setCategory('All');
              }}
            >
              Explore all places <ArrowRight size={16} />
            </button>
          </div>
        ) : view === 'map' ? (
          <div className="explore-map">
            <Suspense
              fallback={
                <div className="empty-state" role="status">
                  Opening the map…
                </div>
              }
            >
              <HighRes2DRouteMap
                destCoords={{ lat: filtered[0].lat, lng: filtered[0].lng }}
                destName={filtered[0].name}
                points={filtered.map((d) => ({
                  id: d.id,
                  lat: d.lat,
                  lng: d.lng,
                  title: d.name,
                  description: d.country,
                }))}
                onSelectPoint={(p) => setSelected(p.id)}
                selectedPointId={selected || undefined}
                defaultLayer="voyager"
                className="explore-map-canvas"
              />
            </Suspense>
            {active && (
              <div className="map-selection">
                <button
                  className="icon-button"
                  aria-label="Close map selection"
                  onClick={() => setSelected(null)}
                >
                  <X size={16} />
                </button>
                <h3>{active.name}</h3>
                <p>
                  {active.country} · From ${active.estimatedBudgetPerDay}/day
                </p>
                <button
                  className="primary-button"
                  onClick={() => onSelectDestination(active)}
                >
                  Explore this place <ArrowUpRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="destination-grid">
            {filtered.map((d, index) => (
              <article className="destination-card" key={d.id}>
                <div className="destination-image">
                  <button
                    className="image-link"
                    aria-label={`Explore ${d.name}`}
                    onClick={() => onSelectDestination(d)}
                  >
                    <img
                      src={d.heroImage}
                      alt={d.name}
                      loading={index < 4 ? 'eager' : 'lazy'}
                    />
                  </button>
                  <span className="destination-tag">
                    {d.category === 'Tropical Sanctuaries'
                      ? 'A little paradise'
                      : d.category === 'Alpine Escapes'
                        ? 'Fresh air, big views'
                        : d.category === 'Nordic Wilderness'
                          ? 'Off the beaten path'
                          : d.category === 'Neon Cyberpunk Cities'
                            ? 'For the curious'
                            : 'Worth the journey'}
                  </span>
                  <button
                    className={`save-button ${saved.includes(d.id) ? 'is-saved' : ''}`}
                    aria-label={`${saved.includes(d.id) ? 'Unsave' : 'Save'} ${d.name}`}
                    aria-pressed={saved.includes(d.id)}
                    onClick={() =>
                      setSaved((prev) =>
                        prev.includes(d.id)
                          ? prev.filter((id) => id !== d.id)
                          : [...prev, d.id]
                      )
                    }
                  >
                    <Heart
                      size={17}
                      fill={saved.includes(d.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                <div className="destination-card-body">
                  <div className="card-country">
                    <MapPin size={12} />
                    {d.country}
                    <span>{d.region}</span>
                  </div>
                  <button
                    className="destination-title"
                    onClick={() => onSelectDestination(d)}
                  >
                    {d.name}
                  </button>
                  <p>{d.tagline}</p>
                  <div className="card-footer">
                    <span>
                      From <strong>${d.estimatedBudgetPerDay}</strong>
                      <small> / day</small>
                    </span>
                    <button
                      aria-label={`Plan a trip to ${d.name}`}
                      onClick={() => onPlanTripTo(`${d.name}, ${d.country}`)}
                    >
                      Let’s go <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="explore-note">
        <Compass size={18} />
        <span>A good trip starts with a little curiosity.</span>
        <span>Make it yours with TripCheck.</span>
      </div>
    </div>
  );
}
