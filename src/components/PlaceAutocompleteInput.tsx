import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Search, X, Loader2, Plane } from 'lucide-react';
import { PlaceItem } from '../types';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { GoogleMapsLink } from './GoogleMapsLink';

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
export function PlaceAutocompleteInput({
  value,
  onChange,
  onSelectPlace,
  placeholder = 'City, village, neighborhood or landmark…',
  label,
  iconType = 'generic',
  id: providedId,
  className = '',
  inputClassName = '',
  autoFocus = false,
  required = false,
  showCoordinatesBadge = true,
  compact = false,
}: PlaceAutocompleteInputProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [selected, setSelected] = useState<PlaceItem | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { places, loading, notice, attribution } = usePlaceSearch(value, open);
  useEffect(() => {
    if (selected?.label !== value) setSelected(null);
  }, [value]);
  useEffect(() => {
    setHighlighted(-1);
  }, [value, places]);
  useEffect(() => {
    if (open && highlighted >= 0)
      document
        .getElementById(`${id}-option-${highlighted}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open, id]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const select = (place: PlaceItem) => {
    setSelected(place);
    onChange(place.label, place);
    onSelectPlace?.(place);
    setOpen(false);
    setHighlighted(-1);
  };
  return (
    <div
      ref={ref}
      className={`place-autocomplete relative w-full ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-300 mb-1.5"
        >
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3 pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : iconType === 'origin' ? (
            <Plane size={15} />
          ) : (
            <MapPin size={15} />
          )}
        </span>
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? `${id}-suggestions` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            open && highlighted >= 0 ? `${id}-option-${highlighted}` : undefined
          }
          type="text"
          value={value}
          maxLength={200}
          autoComplete="off"
          autoFocus={autoFocus}
          required={required}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSelected(null);
            setHighlighted(-1);
            onChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
              if (places.length)
                setHighlighted((i) =>
                  e.key === 'ArrowDown'
                    ? (i + 1) % places.length
                    : i <= 0
                      ? places.length - 1
                      : i - 1
                );
            } else if (
              e.key === 'Enter' &&
              open &&
              highlighted >= 0 &&
              places[highlighted]
            ) {
              e.preventDefault();
              select(places[highlighted]);
            }
          }}
          className={`w-full pl-9 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 ${compact ? 'py-1.5' : ''} ${inputClassName}`}
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 icon-button"
            title="Clear input"
            aria-label={`Clear ${label || (iconType === 'origin' ? 'origin' : 'destination')}`}
            onClick={() => {
              onChange('');
              setSelected(null);
              setHighlighted(-1);
              input.current?.focus();
              setOpen(true);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {selected && showCoordinatesBadge && (
        <p className="text-xs text-slate-400 mt-1">
          Selected: {selected.label}
        </p>
      )}
      {open && (
        <div className="place-suggestions">
          <div className="place-suggestions-heading">
            <Search size={13} />
            {value.trim()
              ? 'Matching places worldwide'
              : 'A few places to start'}
          </div>
          <div
            role="listbox"
            aria-label="Place suggestions"
            id={`${id}-suggestions`}
          >
            {places.map((p, i) => (
              <button
                key={p.id}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={highlighted === i}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(p)}
                onMouseEnter={() => setHighlighted(i)}
                className={highlighted === i ? 'highlighted' : ''}
              >
                <MapPin size={15} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.label}</small>
                </span>
                <small>{p.type}</small>
              </button>
            ))}
          </div>
          {loading && (
            <p className="place-search-note">Looking for more places…</p>
          )}
          {!places.length && !loading && (
            <p className="place-search-note">
              No exact match. Add a district, state or country to narrow your
              search.
            </p>
          )}
          {notice && <p className="place-search-note">{notice}</p>}
          {attribution && <p className="place-attribution">{attribution}</p>}
          {value.trim() && (
            <div className="place-search-footer">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  onChange(value);
                  setOpen(false);
                }}
              >
                Use this place name
              </button>
              <GoogleMapsLink place={value} label="Search Google Maps" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
