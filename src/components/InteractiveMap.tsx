import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ActivityItem, Destination } from '../types';
import { MapPin, Navigation, Layers } from 'lucide-react';

interface InteractiveMapProps {
  destinations?: Destination[];
  activities?: ActivityItem[];
  selectedDest?: Destination | null;
  onSelectDest?: (dest: Destination) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  destinations = [],
  activities = [],
  selectedDest,
  onSelectDest,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Tokyo or central view
      const initialLat = selectedDest ? selectedDest.lat : 35.6762;
      const initialLng = selectedDest ? selectedDest.lng : 139.6503;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 3,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark theme CartoDB basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const bounds = L.latLngBounds([]);

    // Custom Icon Generator
    const createCustomIcon = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 11px;
          ">
            ${label}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    };

    // If activities are provided (Trip itinerary view)
    if (activities.length > 0) {
      const validPoints: [number, number][] = [];

      activities.forEach((act, idx) => {
        if (act.lat !== undefined && act.lng !== undefined) {
          const point: [number, number] = [act.lat, act.lng];
          validPoints.push(point);
          bounds.extend(point);

          const categoryColors: Record<string, string> = {
            flight: '#0284c7',
            lodging: '#8b5cf6',
            food: '#f59e0b',
            sightseeing: '#10b981',
            transport: '#64748b',
            leisure: '#ec4899',
          };
          const markerColor = categoryColors[act.category] || '#0284c7';

          const marker = L.marker(point, {
            icon: createCustomIcon(markerColor, `${idx + 1}`),
          });

          marker.bindPopup(`
            <div style="min-width: 180px;">
              <span style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase;">${act.time} • ${act.category}</span>
              <h4 style="font-weight: 700; font-size: 13px; color: #0f172a; margin: 3px 0;">${act.title}</h4>
              <p style="font-size: 11px; color: #475569; margin: 0 0 6px 0;">${act.locationName}</p>
              ${act.cost ? `<div style="font-weight: 600; font-size: 11px; color: #059669;">Cost: $${act.cost}</div>` : ''}
            </div>
          `);

          markersLayer.addLayer(marker);
        }
      });

      if (validPoints.length > 1) {
        const polyline = L.polyline(validPoints, {
          color: '#0284c7',
          weight: 3,
          opacity: 0.8,
          dashArray: '6, 8',
        }).addTo(map);
        routeLineRef.current = polyline;
      }

      if (validPoints.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } else if (destinations.length > 0) {
      // Explore View: show all destinations
      destinations.forEach(dest => {
        const point: [number, number] = [dest.lat, dest.lng];
        bounds.extend(point);

        const isSelected = selectedDest?.id === dest.id;
        const marker = L.marker(point, {
          icon: createCustomIcon(isSelected ? '#06b6d4' : '#3b82f6', '📍'),
        });

        marker.on('click', () => {
          if (onSelectDest) onSelectDest(dest);
        });

        marker.bindPopup(`
          <div style="width: 200px;">
            <img src="${dest.heroImage}" style="width: 100%; height: 90px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" />
            <span style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase;">${dest.country}</span>
            <h4 style="font-weight: 700; font-size: 14px; color: #0f172a; margin: 2px 0;">${dest.name}</h4>
            <p style="font-size: 11px; color: #475569; margin: 0 0 4px 0;">${dest.tagline}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 600;">
              <span style="color: #059669;">$${dest.estimatedBudgetPerDay}/day</span>
              <span style="color: #d97706;">★ ${dest.rating}</span>
            </div>
          </div>
        `);

        markersLayer.addLayer(marker);
      });

      if (selectedDest) {
        map.flyTo([selectedDest.lat, selectedDest.lng], 6, { duration: 1.5 });
      } else if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [destinations, activities, selectedDest, onSelectDest]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Overlay Pill */}
      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-lg">
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span>Cartographic Waypoint Matrix</span>
      </div>
    </div>
  );
};
