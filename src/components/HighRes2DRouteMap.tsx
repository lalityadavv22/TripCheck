import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  Maximize2,
  Minimize2,
  Navigation,
  Compass,
  Plane,
  Car,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!
  );
}

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category?: string;
  time?: string;
  cost?: number;
  description?: string;
  image?: string;
}

export interface HighRes2DRouteMapProps {
  originCoords?: { lat: number; lng: number };
  originName?: string;
  destCoords: { lat: number; lng: number };
  destName?: string;
  points?: MapPoint[];
  selectedPointId?: string;
  onSelectPoint?: (point: MapPoint) => void;
  className?: string;
  showLayerControls?: boolean;
  showStatsHeader?: boolean;
  connectPoints?: boolean;
  defaultLayer?: 'satellite' | 'voyager' | 'dark' | 'osm';
}

const TILE_LAYERS = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  voyager: {
    name: 'Clean Streets',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB Voyager, © OpenStreetMap',
    maxZoom: 19,
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CartoDB Dark Matter, © OpenStreetMap',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
};

// Calculate geodesic curve points between two lat/lngs for realistic curved flight routes
function generateGeodesicArc(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  numPoints = 60
): [number, number][] {
  const points: [number, number][] = [];
  const lat1 = (start.lat * Math.PI) / 180;
  const lon1 = (start.lng * Math.PI) / 180;
  const lat2 = (end.lat * Math.PI) / 180;
  const lon2 = (end.lng * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.pow(Math.sin((lon1 - lon2) / 2), 2)
      )
    );

  if (d === 0) return [[start.lat, start.lng]];

  // Arc altitude offset (bow curve for 2D aesthetics)
  const arcLift = Math.min(Math.sin(d / 2) * 8, 12);

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    let lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    let lng = (Math.atan2(y, x) * 180) / Math.PI;

    // Slight perpendicular bow curve for dramatic high-res route arc
    const midBow = Math.sin(f * Math.PI) * arcLift * 0.15;
    lat += midBow;

    points.push([lat, lng]);
  }

  return points;
}

function calculateDistanceKm(
  c1: { lat: number; lng: number },
  c2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const HighRes2DRouteMap: React.FC<HighRes2DRouteMapProps> = ({
  originCoords,
  originName = 'Departure Origin',
  destCoords,
  destName = 'Arrival Destination',
  points = [],
  selectedPointId,
  onSelectPoint,
  className = 'h-[440px]',
  showLayerControls = true,
  showStatsHeader = true,
  connectPoints = false,
  defaultLayer = 'voyager',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const [activeLayer, setActiveLayer] = useState<
    'satellite' | 'voyager' | 'dark' | 'osm'
  >(defaultLayer);
  const [tileError, setTileError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const distanceKm = originCoords
    ? calculateDistanceKm(originCoords, destCoords)
    : 0;
  const distanceMiles = Math.round(distanceKm * 0.621371);
  const estFlightHours = Math.max(1, Math.round(distanceKm / 800));

  useEffect(() => {
    if (!isFullscreen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', escape, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', escape, true);
    };
  }, [isFullscreen]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [destCoords.lat, destCoords.lng],
        zoom: originCoords ? 3 : 12,
        zoomControl: false,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      // Subtle zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Base tile layer
      tileLayerRef.current = L.tileLayer(TILE_LAYERS[activeLayer].url, {
        maxZoom: TILE_LAYERS[activeLayer].maxZoom,
        attribution: TILE_LAYERS[activeLayer].attribution,
        subdomains: activeLayer === 'osm' ? 'abc' : 'abcd',
      }).addTo(map);

      routeLayersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    const observer = new ResizeObserver(() => mapRef.current?.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (mapRef.current) {
        mapRef.current.stop();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isFullscreen]);

  // Update base tile layer on change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(TILE_LAYERS[activeLayer].url, {
      maxZoom: TILE_LAYERS[activeLayer].maxZoom,
      attribution: TILE_LAYERS[activeLayer].attribution,
      subdomains: activeLayer === 'osm' ? 'abc' : 'abcd',
    }).addTo(map);

    setTileError(false);
    newLayer.on('tileerror', () => setTileError(true));
    newLayer.on('tileload', () => setTileError(false));
    tileLayerRef.current = newLayer;
  }, [activeLayer, isFullscreen]);

  // Redraw routes, pins, arcs, waypoints whenever coordinates/points change
  useEffect(() => {
    const map = mapRef.current;
    const routeGroup = routeLayersRef.current;
    if (!map || !routeGroup) return;

    routeGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Draw Origin Marker & Route Arc if origin exists
    if (originCoords) {
      bounds.extend([originCoords.lat, originCoords.lng]);
      bounds.extend([destCoords.lat, destCoords.lng]);

      // Origin Pin
      const originIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
            <div class="relative w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-black text-xs">
              ✈
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const originMarker = L.marker([originCoords.lat, originCoords.lng], {
        icon: originIcon,
      });
      originMarker.bindPopup(`
        <div class="p-2 text-slate-100 font-sans min-w-[160px]">
          <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mb-1">Departure Origin</span>
          <h4 class="font-bold text-sm text-slate-100">${escapeHtml(originName)}</h4>
          <p class="text-xs text-slate-600 mt-1">GPS: ${originCoords.lat.toFixed(3)}, ${originCoords.lng.toFixed(3)}</p>
        </div>
      `);
      routeGroup.addLayer(originMarker);

      // Curved Geodesic Route Arc
      const arcPoints = generateGeodesicArc(originCoords, destCoords);

      // Glow backdrop polyline
      const glowLine = L.polyline(arcPoints, {
        color: '#06b6d4',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
      });
      routeGroup.addLayer(glowLine);

      // Primary crisp route polyline
      const mainLine = L.polyline(arcPoints, {
        color: '#38bdf8',
        weight: 3,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round',
      });
      routeGroup.addLayer(mainLine);

      // Midpoint flight badge marker
      const midIdx = Math.floor(arcPoints.length / 2);
      const midPoint = arcPoints[midIdx];
      if (midPoint) {
        const midIcon = L.divIcon({
          className: 'flight-hud-pill',
          html: `
            <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(6, 182, 212, 0.6); backdrop-filter: blur(8px); padding: 3px 8px; border-radius: 9999px; color: #38bdf8; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px;">
              <span>✈ ${distanceKm.toLocaleString()} km</span>
            </div>
          `,
          iconSize: [80, 24],
          iconAnchor: [40, 12],
        });
        const midMarker = L.marker(midPoint, { icon: midIcon });
        routeGroup.addLayer(midMarker);
      }
    }

    // 2. Destination Marker
    bounds.extend([destCoords.lat, destCoords.lng]);
    const destIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-9 h-9 rounded-full bg-cyan-400/40 animate-pulse"></div>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs">
            ★
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const destMarker = L.marker([destCoords.lat, destCoords.lng], {
      icon: destIcon,
    });
    destMarker.bindPopup(`
      <div class="p-2 text-slate-100 font-sans min-w-[170px]">
        <span class="inline-block px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold uppercase mb-1">Target Destination</span>
        <h4 class="font-bold text-sm text-slate-100">${escapeHtml(destName)}</h4>
        <p class="text-xs text-slate-600 mt-1">Coordinates: ${destCoords.lat.toFixed(4)}°, ${destCoords.lng.toFixed(4)}°</p>
      </div>
    `);
    routeGroup.addLayer(destMarker);

    // 3. Activity / Landmark Waypoints with connecting trail
    if (points && points.length > 0) {
      const activityCoords: [number, number][] = [];

      points
        .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng))
        .forEach((pt, index) => {
          bounds.extend([pt.lat, pt.lng]);
          activityCoords.push([pt.lat, pt.lng]);

          const isSelected = selectedPointId === pt.id;
          const color =
            pt.category === 'food'
              ? '#f97316'
              : pt.category === 'lodging'
                ? '#8b5cf6'
                : pt.category === 'transit'
                  ? '#10b981'
                  : '#06b6d4';

          const ptIcon = L.divIcon({
            className: 'activity-pin',
            html: `
            <div class="cursor-pointer transition-transform hover:scale-125" style="display: flex; align-items: center; justify-content: center;">
              <div style="
                background: ${color};
                width: ${isSelected ? '28px' : '24px'};
                height: ${isSelected ? '28px' : '24px'};
                border-radius: 50%;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
              ">
                ${index + 1}
              </div>
            </div>
          `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([pt.lat, pt.lng], { icon: ptIcon });
          marker.on('click', () => {
            if (onSelectPoint) onSelectPoint(pt);
          });

          marker.bindPopup(`
          <div class="p-2 font-sans text-slate-100 min-w-[200px] max-w-[260px]">
            ${pt.image ? `<img src="${escapeHtml(pt.image)}" class="w-full h-24 object-cover rounded-lg mb-2" />` : ''}
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white" style="background: ${color};">${escapeHtml(pt.category || 'Sightseeing')}</span>
              ${pt.time ? `<span class="text-[11px] text-slate-500 font-medium">⏰ ${escapeHtml(pt.time)}</span>` : ''}
            </div>
            <h4 class="font-bold text-sm text-slate-100">${escapeHtml(pt.title)}</h4>
            ${pt.description ? `<p class="text-xs text-slate-600 mt-1 leading-relaxed">${escapeHtml(pt.description)}</p>` : ''}
            ${pt.cost !== undefined ? `<p class="text-xs font-bold text-cyan-600 mt-1.5">Est. Cost: $${escapeHtml(pt.cost)}</p>` : ''}
          </div>
        `);

          routeGroup.addLayer(marker);
        });

      // Connect activities with a smooth walking/transit line
      if (connectPoints && activityCoords.length > 1) {
        const activityLine = L.polyline(activityCoords, {
          color: '#f59e0b',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '4, 4',
        });
        routeGroup.addLayer(activityLine);
      }
    }

    // Auto-fit bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: points.length > 0 && !originCoords ? 13 : 8,
        animate: false,
      });
    }
  }, [
    originCoords,
    destCoords,
    points,
    selectedPointId,
    isFullscreen,
    connectPoints,
  ]);

  const handleFitBounds = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([]);
    if (originCoords) bounds.extend([originCoords.lat, originCoords.lng]);
    bounds.extend([destCoords.lat, destCoords.lng]);
    points
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .forEach((p) => bounds.extend([p.lat, p.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], animate: false });
    }
  };

  const content = (
    <div
      className={`relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col ${
        isFullscreen ? 'map-fullscreen' : className
      }`}
    >
      {/* Route Stats Header Bar */}
      {showStatsHeader && (
        <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {originCoords && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-400">
                  {originName.split(',')[0]}
                </span>
                <span className="text-slate-500">➔</span>
                <span className="font-bold text-cyan-400">
                  {destName.split(',')[0]}
                </span>
              </div>
            )}

            {distanceKm > 0 && (
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg flex items-center gap-2 text-[11px] text-slate-300">
                <Navigation className="w-3 h-3 text-cyan-400" />
                <span>
                  <strong className="text-white font-extrabold">
                    {distanceKm.toLocaleString()}
                  </strong>{' '}
                  km ({distanceMiles.toLocaleString()} mi)
                </span>
                <span className="text-slate-500">•</span>
                <span>Straight-line distance</span>
              </div>
            )}

            {points.length > 0 && (
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>{points.length} places</span>
              </div>
            )}
          </div>

          {/* Quick Actions (Fit Bounds & Fullscreen) */}
          <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
            <button
              onClick={handleFitBounds}
              title="Fit Full Route"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md text-[11px] font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Fit Route</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
              className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md transition shadow-md cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {tileError && (
        <p
          role="status"
          className="absolute top-24 left-3 right-3 z-[400] rounded-lg bg-slate-900 p-3 text-xs text-slate-300 shadow-md"
        >
          Map tiles couldn’t load. Check your connection or try another layer.
          Your places are still saved.
        </p>
      )}
      {/* Map Leaflet Canvas Container */}
      <div ref={containerRef} className="w-full h-full flex-1 z-0" />

      {/* Layer Switcher Pills at Bottom Left */}
      {showLayerControls && (
        <div className="absolute bottom-6 left-3 z-[400] flex items-center gap-1 p-1 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-xl">
          {(['satellite', 'voyager', 'dark', 'osm'] as const).map(
            (layerKey) => (
              <button
                key={layerKey}
                aria-pressed={activeLayer === layerKey}
                onClick={() => setActiveLayer(layerKey)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  activeLayer === layerKey
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {TILE_LAYERS[layerKey].name}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
  return isFullscreen ? createPortal(content, document.body) : content;
};
