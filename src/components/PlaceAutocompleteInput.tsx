import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  X,
  Loader2,
  Landmark,
  Building2,
  Trees,
  Plane,
  Home,
  Compass,
  Check,
} from 'lucide-react';
import { PlaceItem } from '../types';

interface PlaceAutocompleteInputProps {
  value: string;
  onChange: (value: string, place?: PlaceItem) => void;
  onSelectPlace?: (place: PlaceItem) => void;
  placeholder?: string;
  label?: string;
  iconType?: 'origin' | 'destination' | 'generic';
  id?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  required?: boolean;
  showCoordinatesBadge?: boolean;
  compact?: boolean;
}

const POPULAR_QUICK_PICKS: PlaceItem[] = [
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    label: 'Taj Mahal, Agra, Uttar Pradesh, India',
    city: 'Agra',
    state: 'Uttar Pradesh',
    country: 'India',
    lat: 27.1751,
    lng: 78.0421,
    type: 'monument',
    categoryLabel: 'Wonder of the World',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    label: 'Tokyo, Kanto, Japan',
    city: 'Tokyo',
    state: 'Kanto',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    type: 'city',
    categoryLabel: 'Metropolis of the Future',
  },
  {
    id: 'paris',
    name: 'Paris',
    label: 'Paris, Île-de-France, France',
    city: 'Paris',
    state: 'Île-de-France',
    country: 'France',
    lat: 48.8566,
    lng: 2.3522,
    type: 'city',
    categoryLabel: 'City of Lights & Art',
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    label: 'Eiffel Tower, 7th Arr., Paris, France',
    city: 'Paris',
    state: 'Île-de-France',
    country: 'France',
    lat: 48.8584,
    lng: 2.2945,
    type: 'monument',
    categoryLabel: 'Iconic Iron Lattice',
  },
  {
    id: 'delhi',
    name: 'New Delhi',
    label: 'New Delhi, Delhi NCR, India',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    lat: 28.6139,
    lng: 77.209,
    type: 'city',
    categoryLabel: 'Capital of India',
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    label: 'Colosseum, Piazza del Colosseo, Rome, Italy',
    city: 'Rome',
    state: 'Lazio',
    country: 'Italy',
    lat: 41.8902,
    lng: 12.4922,
    type: 'monument',
    categoryLabel: 'Ancient Roman Amphitheatre',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    label: 'Kyoto, Kansai, Japan',
    city: 'Kyoto',
    state: 'Kansai',
    country: 'Japan',
    lat: 35.0116,
    lng: 135.7681,
    type: 'city',
    categoryLabel: 'Historic Imperial Temples',
  },
  {
    id: 'zermatt',
    name: 'Zermatt (Matterhorn)',
    label: 'Zermatt, Valais, Switzerland',
    city: 'Zermatt',
    state: 'Valais',
    country: 'Switzerland',
    lat: 45.9765,
    lng: 7.7491,
    type: 'town',
    categoryLabel: 'Matterhorn Alpine Village',
  },
];

export const PlaceAutocompleteInput: React.FC<PlaceAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Type city, town, village or monument...',
  label,
  iconType = 'generic',
  id,
  className = '',
  inputClassName = '',
  autoFocus = false,
  required = false,
  showCoordinatesBadge = true,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const requestRef = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      requestRef.current?.abort();
    },
    []
  );

  // Sync internal query with prop value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debouncing
  const fetchSuggestions = (searchQuery: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    requestRef.current?.abort();
    const currentId = ++requestId.current;
    setSuggestions([]);
    setHighlightedIndex(-1);

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSuggestions(POPULAR_QUICK_PICKS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        requestRef.current = new AbortController();
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(trimmed)}`,
          { signal: requestRef.current.signal }
        );
        if (currentId !== requestId.current) return;
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.places)) {
            setSuggestions(data.places);
            setHighlightedIndex(-1);
          }
        }
      } catch (err) {
        if (currentId === requestId.current) setSuggestions([]);
      } finally {
        if (currentId === requestId.current) setIsLoading(false);
      }
    }, 180);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedPlace(null);
    onChange(val);
    setIsOpen(true);
    fetchSuggestions(val);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!query.trim()) {
      setSuggestions(POPULAR_QUICK_PICKS);
    } else {
      fetchSuggestions(query);
    }
  };

  const handleSelect = (place: PlaceItem) => {
    const displayVal = place.label || `${place.name}, ${place.country}`;
    setQuery(displayVal);
    setSelectedPlace(place);
    onChange(displayVal, place);
    if (onSelectPlace) {
      onSelectPlace(place);
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    requestId.current++;
    requestRef.current?.abort();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsLoading(false);
    setQuery('');
    setSelectedPlace(null);
    onChange('');
    setSuggestions(POPULAR_QUICK_PICKS);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        fetchSuggestions(query);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const getPlaceIcon = (type: PlaceItem['type']) => {
    switch (type) {
      case 'monument':
      case 'heritage':
        return <Landmark className="w-3.5 h-3.5 text-amber-400" />;
      case 'city':
        return <Building2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'town':
      case 'village':
        return <Home className="w-3.5 h-3.5 text-emerald-400" />;
      case 'nature':
      case 'attraction':
        return <Trees className="w-3.5 h-3.5 text-emerald-400" />;
      case 'airport':
        return <Plane className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getTypeBadge = (type: PlaceItem['type']) => {
    switch (type) {
      case 'monument':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Monument
          </span>
        );
      case 'heritage':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Heritage
          </span>
        );
      case 'city':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            City
          </span>
        );
      case 'town':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Town
          </span>
        );
      case 'village':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-lime-500/20 text-lime-300 border border-lime-500/30">
            Village
          </span>
        );
      case 'nature':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Nature
          </span>
        );
      case 'airport':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Airport
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Place
          </span>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setIsOpen(false);
      }}
      className={`relative w-full ${className}`}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5"
        >
          {iconType === 'origin' ? (
            <Plane className="w-3.5 h-3.5 text-purple-400" />
          ) : iconType === 'destination' ? (
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{label}</span>
          {required && <span className="text-cyan-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Leading icon */}
        <div className="absolute left-3 pointer-events-none text-slate-400 flex items-center">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          ) : iconType === 'origin' ? (
            <Plane className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-suggestions`}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && highlightedIndex >= 0
              ? `${id}-option-${highlightedIndex}`
              : undefined
          }
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-inner ${
            compact ? 'py-1.5 text-xs' : ''
          } ${inputClassName}`}
        />

        {/* Clear Button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Clear input"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Selected place badge indicator if active */}
      {selectedPlace && showCoordinatesBadge && (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Coordinates mapped:</span>
          <span className="font-mono text-cyan-300 font-medium">
            {selectedPlace.lat.toFixed(3)}°, {selectedPlace.lng.toFixed(3)}°
          </span>
        </div>
      )}

      {/* Autocomplete Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-cyan-950/50 backdrop-blur-xl overflow-hidden max-h-48 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Search className="w-3 h-3 text-cyan-400" />
              {query.trim()
                ? `Suggestions for "${query.trim()}"`
                : 'Places to start'}
            </span>
            <span className="text-[10px] text-slate-500">Pick a place</span>
          </div>

          {/* List of items */}
          <div
            id={`${id}-suggestions`}
            role="listbox"
            aria-label="Place suggestions"
            className="overflow-y-auto divide-y divide-slate-800/60 flex-1"
          >
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={item.id || `${item.lat}-${item.lng}-${index}`}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-3 py-2.5 text-left flex items-start gap-2.5 transition cursor-pointer ${
                      isHighlighted
                        ? 'bg-cyan-500/15 text-white'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 p-1 rounded-lg bg-slate-850 border border-slate-750">
                      {getPlaceIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white truncate">
                          {item.name}
                        </span>
                        {getTypeBadge(item.type)}
                        {item.categoryLabel && (
                          <span className="text-[10px] text-slate-400 italic">
                            · {item.categoryLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.label}
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-[10px] font-mono text-slate-500 mt-1">
                      {item.lat.toFixed(2)}°, {item.lng.toFixed(2)}°
                    </div>
                  </button>
                );
              })
            ) : isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Looking for your place…</span>
              </div>
            ) : (
              <div className="py-6 px-4 text-center">
                <p className="text-xs text-slate-300 font-medium">
                  No exact match for "{query}"
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Try a nearby city or choose a suggestion. We’ll let you know
                  if we can’t locate it.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onChange(query);
                    setIsOpen(false);
                  }}
                  className="mt-2.5 px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition"
                >
                  Use "{query}" directly
                </button>
              </div>
            )}
          </div>

          {/* Quick tips footer */}
          <div className="px-3 py-1.5 bg-slate-950/90 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>↑↓ keys to navigate, Enter to select</span>
            <span>Worldwide Coverage</span>
          </div>
        </div>
      )}
    </div>
  );
};
