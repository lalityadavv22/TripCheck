import React, { useState, useMemo } from 'react';
import { Destination } from '../types';
import { HighRes2DRouteMap, MapPoint } from './HighRes2DRouteMap';
import {
  Compass,
  Navigation,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Sun,
  Layers,
  ArrowRight,
  Plane,
  ChevronRight
} from 'lucide-react';

interface Global2DWorldExplorerProps {
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
  onPlanTripTo: (cityName: string) => void;
  userOrigin?: string;
}

export const Global2DWorldExplorer: React.FC<Global2DWorldExplorerProps> = ({
  destinations,
  onSelectDestination,
  onPlanTripTo,
  userOrigin = 'New Delhi, India',
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>(destinations[0]?.id || 'tokyo-japan');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [originCity, setOriginCity] = useState(userOrigin);

  const categories = ['All', 'Neon Cyberpunk Cities', 'Alpine Escapes', 'Tropical Sanctuaries', 'Nordic Wilderness', 'Cultural Heritage'];

  const filteredDestinations = useMemo(() => {
    if (selectedCategory === 'All') return destinations;
    return destinations.filter(d => d.category === selectedCategory);
  }, [destinations, selectedCategory]);

  const activeDest = destinations.find(d => d.id === selectedDestId) || destinations[0];

  // Coordinates for popular departure origins
  const originCoordsMap: Record<string, { lat: number; lng: number }> = {
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'dubai': { lat: 25.2048, lng: 55.2708 },
    'paris': { lat: 48.8566, lng: 2.3522 },
  };

  const getOriginCoords = (city: string) => {
    const key = city.toLowerCase();
    for (const [k, v] of Object.entries(originCoordsMap)) {
      if (key.includes(k)) return v;
    }
    return { lat: 28.6139, lng: 77.2090 }; // Default to New Delhi
  };

  const currentOriginCoords = getOriginCoords(originCity);

  // Convert destination list into map points for high-resolution 2D pins
  const mapPoints: MapPoint[] = useMemo(() => {
    return destinations.map(d => ({
      id: d.id,
      lat: d.lat,
      lng: d.lng,
      title: `${d.name}, ${d.country}`,
      category: d.category,
      cost: d.estimatedBudgetPerDay,
      description: d.tagline,
      image: d.heroImage,
    }));
  }, [destinations]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Navigation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-extrabold border border-cyan-500/30 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>High-Resolution 2D Global Routes</span>
            </span>
            <span className="text-xs text-slate-500 font-bold">• 100% Free Open Layers</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1.5">
            World Route Explorer & Navigation Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Survey global expeditions with crisp 2D satellite and vector street cartography, geodesic flight corridors, and real-time destination logistics.
          </p>
        </div>

        {/* Origin Selector Pill */}
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900 border border-slate-800 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-slate-300">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Leaving From:</span>
            <input
              type="text"
              value={originCity}
              onChange={e => setOriginCity(e.target.value)}
              placeholder="e.g. New Delhi"
              className="w-28 sm:w-36 bg-transparent text-white font-bold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main 2D Interactive Map */}
      <div className="relative">
        <HighRes2DRouteMap
          originCoords={currentOriginCoords}
          originName={originCity}
          destCoords={{ lat: activeDest.lat, lng: activeDest.lng }}
          destName={`${activeDest.name}, ${activeDest.country}`}
          points={mapPoints}
          selectedPointId={activeDest.id}
          onSelectPoint={pt => {
            setSelectedDestId(pt.id);
            const match = destinations.find(d => d.id === pt.id);
            if (match) onSelectDestination(match);
          }}
          className="h-[520px]"
          defaultLayer="satellite"
        />

        {/* Selected Destination Quick Flight Overlay Card */}
        <div className="absolute bottom-16 right-4 z-[400] max-w-sm hidden sm:block">
          <div className="p-4 rounded-2xl bg-slate-950/95 border border-cyan-500/40 backdrop-blur-xl shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-xs font-black text-cyan-300 uppercase tracking-wide">Selected Target</span>
              </div>
              <span className="text-xs text-slate-400 font-bold">{activeDest.country}</span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={activeDest.heroImage}
                alt={activeDest.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-700"
              />
              <div>
                <h4 className="font-extrabold text-base text-white">{activeDest.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-1">{activeDest.tagline}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-cyan-400 font-bold">
                  <span>${activeDest.estimatedBudgetPerDay}/day</span>
                  <span>•</span>
                  <span>⭐ {activeDest.rating}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onSelectDestination(activeDest)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition text-center cursor-pointer"
              >
                View City Intel
              </button>

              <button
                onClick={() => onPlanTripTo(activeDest.name)}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-black text-slate-950 transition text-center shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>Plan Route</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Destination Grid Shelf */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredDestinations.map(dest => {
          const isSelected = dest.id === selectedDestId;
          return (
            <div
              key={dest.id}
              onClick={() => {
                setSelectedDestId(dest.id);
                onSelectDestination(dest);
              }}
              className={`p-4 rounded-2xl bg-slate-900 border transition cursor-pointer group relative overflow-hidden ${
                isSelected
                  ? 'border-cyan-400 shadow-xl shadow-cyan-500/15 bg-slate-850'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="relative h-36 rounded-xl overflow-hidden mb-3">
                <img
                  src={dest.heroImage}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-cyan-300">
                  {dest.country}
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-amber-300">
                  ⭐ {dest.rating}
                </div>
              </div>

              <h4 className="font-extrabold text-white text-base truncate group-hover:text-cyan-300 transition">
                {dest.name}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                {dest.description}
              </p>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-xs">
                <span className="font-bold text-cyan-400">${dest.estimatedBudgetPerDay}/day</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanTripTo(dest.name);
                  }}
                  className="flex items-center gap-1 font-extrabold text-cyan-300 hover:text-cyan-200 transition"
                >
                  <span>Build Itinerary</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
