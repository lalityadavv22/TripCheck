import { isGeneratedTripPlan } from '../utils/validation';
import { useDialog } from '../hooks/useDialog';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Compass,
  ArrowRight,
  Plane,
  Train,
  Car,
  Hotel,
  Utensils,
  CloudSun,
  Languages,
  CheckCircle2,
  Share2,
  Download,
  Flame,
  Globe,
  Navigation,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { GeneratedTripPlan, PlaceItem } from '../types';
import { HighRes2DRouteMap } from './HighRes2DRouteMap';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface RouteItineraryGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTrip: (plan: GeneratedTripPlan) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
}

const POPULAR_ROUTES = [
  {
    origin: 'New Delhi, India',
    destination: 'Tokyo, Japan',
    days: 7,
    vibe: 'Culture & Gastronomy',
  },
  {
    origin: 'Mumbai, India',
    destination: 'Bali, Indonesia',
    days: 5,
    vibe: 'Tropical & Wellness',
  },
  {
    origin: 'Bengaluru, India',
    destination: 'Manali, Himachal Pradesh',
    days: 4,
    vibe: 'Alpine Trekking & Nature',
  },
  {
    origin: 'New York, USA',
    destination: 'Paris, France',
    days: 6,
    vibe: 'Romance & Architecture',
  },
  {
    origin: 'London, UK',
    destination: 'Reykjavík, Iceland',
    days: 5,
    vibe: 'Aurora & Hot Springs',
  },
];

export const RouteItineraryGenerator: React.FC<
  RouteItineraryGeneratorProps
> = ({
  isOpen,
  onClose,
  onImportTrip,
  defaultOrigin = '',
  defaultDestination = '',
}) => {
  const requestRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    if (!isOpen) {
      requestRef.current?.abort();
      setIsLoading(false);
    }
    return () => requestRef.current?.abort();
  }, [isOpen]);
  // Form State - blank by default so user can type any city, town, or monument
  const [origin, setOrigin] = useState(defaultOrigin);
  const dialogRef = useDialog(isOpen, onClose);
  const [destination, setDestination] = useState(defaultDestination);
  const [originPlace, setOriginPlace] = useState<PlaceItem | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<PlaceItem | null>(
    null
  );
  const [days, setDays] = useState(5);
  const [travelers, setTravelers] = useState(2);
  const [groupType, setGroupType] = useState<
    'Solo' | 'Couple' | 'Family' | 'Friends'
  >('Couple');
  const [budgetTier, setBudgetTier] = useState<
    'Budget' | 'Moderate' | 'Luxury'
  >('Moderate');
  const [vibe, setVibe] = useState('Culture & Gastronomy');

  // Loading & Results State
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedTripPlan | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    'itinerary' | 'hotels' | 'food' | 'route' | 'budget'
  >('itinerary');
  const [selectedLanguage, setSelectedLanguage] = useState<
    'en' | 'hi' | 'es' | 'fr'
  >('en');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [selectedMapPoint, setSelectedMapPoint] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen) {
      setOrigin(defaultOrigin);
      setDestination(defaultDestination);
      setOriginPlace(null);
      setDestinationPlace(null);
      setGeneratedPlan(null);
      setError('');
      setNotice('');
      setSelectedLanguage('en');
      setActiveTab('itinerary');
    }
  }, [isOpen, defaultOrigin, defaultDestination]);

  const loadingSteps = [
    'Finding your starting point…',
    'Thinking through your travel preferences…',
    'Making room for the good stuff…',
    'Putting together places to explore…',
    'Adding the finishing touches…',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!destination.trim()) {
      setError('Where would you like to go? Add a destination first.');
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError('');
    setNotice('');
    setActiveTab('itinerary');
    setExpandedDay(1);
    setLoadingStep(0);
    setGeneratedPlan(null);

    const stepTimer = setInterval(() => {
      setLoadingStep((prev) =>
        prev < loadingSteps.length - 1 ? prev + 1 : prev
      );
    }, 800);

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(40000),
        ]),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim() || 'New Delhi, India',
          originCoords: originPlace
            ? { lat: originPlace.lat, lng: originPlace.lng }
            : undefined,
          destination: destination.trim(),
          destCoords: destinationPlace
            ? { lat: destinationPlace.lat, lng: destinationPlace.lng }
            : undefined,
          days,
          travelers,
          groupType,
          budgetTier,
          vibe,
        }),
      });

      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok || !data.success || !isGeneratedTripPlan(data.plan))
        throw new Error(
          data.error || 'We couldn’t create your trip. Please try again.'
        );
      setNotice(
        data.source === 'sample'
          ? data.notice
          : 'AI suggestions — verify places, opening times, travel requirements and prices before booking.'
      );
      clearInterval(stepTimer);

      if (data.success && data.plan) {
        setGeneratedPlan({
          ...data.plan,
          planningNote:
            data.source === 'sample'
              ? data.notice
              : 'AI suggestions — verify details before booking.',
        });
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : 'Connection lost. Please try again.'
        );
      clearInterval(stepTimer);
    } finally {
      clearInterval(stepTimer);
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const handleSelectRouteChip = (route: (typeof POPULAR_ROUTES)[0]) => {
    setOrigin(route.origin);
    setDestination(route.destination);
    setOriginPlace(null);
    setDestinationPlace(null);
    setDays(route.days);
    setVibe(route.vibe);
  };

  const getPointsForMap = () => {
    if (!generatedPlan) return [];
    const pts: any[] = [];
    generatedPlan.days.forEach((d) => {
      d.activities.forEach((act, idx) => {
        if (Number.isFinite(act.lat) && Number.isFinite(act.lng)) {
          pts.push({
            id: `pt-${d.dayNumber}-${idx}`,
            title: act.title,
            lat: act.lat,
            lng: act.lng,
            category: act.category,
            time: act.time,
            cost: act.cost,
            day: d.dayNumber,
          });
        }
      });
    });
    return pts;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Plan your trip"
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-5xl my-auto rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/25">
              <Navigation className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  TripCheck AI Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold border border-cyan-500/30">
                  ORIGIN ➔ DESTINATION
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Generate complete multi-day travel plans, transit routes, hotel
                picks & food guides
              </p>
            </div>
          </div>

          <button
            aria-label="Close trip planner"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Quick Suggestions */}
          {!generatedPlan && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>A few ideas to get you started</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_ROUTES.map((route, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectRouteChip(route)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>{route.origin.split(',')[0]}</span>
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                    <span className="font-bold text-cyan-400">
                      {route.destination.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({route.days}d)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Controls */}
          <form
            onSubmit={handleGenerate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800"
          >
            {/* Origin Autocomplete */}
            <div className="space-y-1.5">
              <PlaceAutocompleteInput
                id="origin-place-input"
                label="Leaving From (Origin)"
                iconType="origin"
                value={origin}
                placeholder="Type any city, airport or town..."
                onChange={(val, place) => {
                  setOrigin(val);
                  setOriginPlace(place || null);
                }}
                onSelectPlace={(place) => {
                  setOriginPlace(place);
                }}
              />
            </div>

            {/* Destination Autocomplete */}
            <div className="space-y-1.5">
              <PlaceAutocompleteInput
                id="dest-place-input"
                label="Going To (Destination)"
                iconType="destination"
                required
                value={destination}
                placeholder="Type any city, village or monument..."
                onChange={(val, place) => {
                  setDestination(val);
                  setDestinationPlace(place || null);
                }}
                onSelectPlace={(place) => {
                  setDestinationPlace(place);
                }}
              />
            </div>

            {/* Days & Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duration</span>
                </span>
                <span className="text-cyan-400 font-mono font-bold">
                  {days} Days
                </span>
              </label>
              <input
                type="range"
                min={2}
                max={14}
                aria-label="Number of days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Travel Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Companions</span>
              </label>
              <select
                aria-label="Travel group"
                value={groupType}
                onChange={(e) => {
                  setGroupType(e.target.value as any);
                  if (e.target.value === 'Solo') setTravelers(1);
                  else if (e.target.value === 'Couple') setTravelers(2);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Solo">Solo Explorer</option>
                <option value="Couple">Couple / Romantic</option>
                <option value="Family">Family with Kids</option>
                <option value="Friends">Group of Friends</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="travelers-count"
                className="text-xs font-bold text-slate-300"
              >
                Travelers
              </label>
              <input
                id="travelers-count"
                type="number"
                min={1}
                max={20}
                required
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm"
              />
            </div>
            {/* Budget & Vibe in second row */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Budget Tier</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Budget', 'Moderate', 'Luxury'] as const).map((tier) => (
                  <button
                    type="button"
                    key={tier}
                    onClick={() => setBudgetTier(tier)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      budgetTier === tier
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2 flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Travel Vibe</span>
                </label>
                <select
                  aria-label="Travel style"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Culture & Gastronomy">
                    Culture & Culinary Delights
                  </option>
                  <option value="Adventure & Nature">
                    High Adventure, Trekking & Wilderness
                  </option>
                  <option value="Tropical & Relaxation">
                    Relaxed Beaches, Sunsets & Spas
                  </option>
                  <option value="Urban Nightlife & Cyberpunk">
                    Electric Nightlife, Shopping & Architecture
                  </option>
                </select>
              </div>
            </div>
            <div className="sm:col-span-4 flex justify-end pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="h-[38px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>{isLoading ? 'Making your plan…' : 'Generate Trip'}</span>
              </button>
            </div>
          </form>

          {error && (
            <p
              role="alert"
              className="p-3 rounded-xl bg-rose-50 text-rose-700 text-sm"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="p-3 rounded-xl bg-amber-50 text-amber-800 text-sm"
            >
              {notice}
            </p>
          )}
          {/* Loading Animation State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-8 rounded-2xl bg-slate-950/80 border border-cyan-500/40 text-center space-y-4 shadow-xl"
              >
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  <div
                    className="absolute inset-2 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin"
                    style={{
                      animationDirection: 'reverse',
                      animationDuration: '1.5s',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Navigation className="w-6 h-6 text-cyan-400 animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">
                    A little planning in progress…
                  </h3>
                  <p className="text-xs text-cyan-400 font-mono mt-1 animate-pulse">
                    {loadingSteps[loadingStep]}
                  </p>
                </div>

                <div className="w-full max-w-md mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full"
                    initial={{ width: '10%' }}
                    animate={{
                      width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Plan Presentation */}
          {generatedPlan && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Hero Banner */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-cyan-500/30 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
                      <span>{generatedPlan.origin}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>{generatedPlan.destination}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {generatedPlan.distanceKm.toLocaleString()} km
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {generatedPlan.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onImportTrip(generatedPlan)}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Open in Trip Planner</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                  {selectedLanguage === 'en'
                    ? generatedPlan.summary
                    : generatedPlan.translations[selectedLanguage]?.summary ||
                      generatedPlan.summary}
                </p>

                {/* Translation & Weather Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  {/* Weather forecast */}
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CloudSun className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white">
                      {generatedPlan.weatherForecast.avgTempC}°C
                    </span>
                    <span className="text-slate-400">
                      ({generatedPlan.weatherForecast.condition})
                    </span>
                    <span className="hidden md:inline text-slate-500">
                      • {generatedPlan.weatherForecast.packingTip}
                    </span>
                  </div>

                  {/* Multi-language selector */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/90 border border-slate-700">
                    <Languages className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
                    {(['en', 'hi', 'es', 'fr'] as const).map((lang) => (
                      <button
                        key={lang}
                        aria-label={
                          {
                            en: 'English',
                            hi: 'Hindi',
                            es: 'Spanish',
                            fr: 'French',
                          }[lang]
                        }
                        aria-pressed={selectedLanguage === lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                          selectedLanguage === lang
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* High-Resolution 2D Map Route View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Your route, at a glance</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Schematic route, not turn-by-turn directions
                  </span>
                </div>

                <HighRes2DRouteMap
                  originCoords={generatedPlan.originCoords}
                  originName={generatedPlan.origin}
                  destCoords={generatedPlan.destCoords}
                  destName={generatedPlan.destination}
                  points={getPointsForMap()}
                  selectedPointId={selectedMapPoint?.id}
                  onSelectPoint={(pt) => setSelectedMapPoint(pt)}
                  className="h-[380px]"
                />
              </div>

              {/* Detailed View Tabs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
                  {[
                    {
                      id: 'itinerary',
                      label: 'Day-by-Day Plan',
                      icon: <Calendar className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'route',
                      label: 'Transit & Route',
                      icon: <Plane className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'hotels',
                      label: 'Curated Stays',
                      icon: <Hotel className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'food',
                      label: 'Culinary Guide',
                      icon: <Utensils className="w-3.5 h-3.5" />,
                    },
                    {
                      id: 'budget',
                      label: 'Budget Breakdown',
                      icon: <Wallet className="w-3.5 h-3.5" />,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab 1: Day-by-day Itinerary Accordions */}
                {activeTab === 'itinerary' && (
                  <div className="space-y-3">
                    {generatedPlan.days.map((d) => {
                      const isExpanded = expandedDay === d.dayNumber;
                      return (
                        <div
                          key={d.dayNumber}
                          className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden"
                        >
                          <div
                            onClick={() =>
                              setExpandedDay(isExpanded ? 0 : d.dayNumber)
                            }
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/50 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 font-mono font-bold flex items-center justify-center text-xs border border-cyan-500/30">
                                D{d.dayNumber}
                              </span>
                              <div>
                                <h4 className="text-sm font-bold text-white">
                                  {d.theme}
                                </h4>
                                <span className="text-[11px] text-slate-400">
                                  {d.activities.length} planned experiences
                                </span>
                              </div>
                            </div>

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>

                          {isExpanded && (
                            <div className="p-4 pt-0 border-t border-slate-800/80 space-y-2 mt-2">
                              {d.activities.map((act, i) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
                                      {act.time}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-bold text-white">
                                        {act.title}
                                      </h5>
                                      <p className="text-[11px] text-slate-400">
                                        {act.description}
                                      </p>
                                      <span className="text-[10px] text-slate-500">
                                        📍 {act.location}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-emerald-400 self-end sm:self-center">
                                    ${act.cost}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Route & Transit Options */}
                {activeTab === 'route' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {generatedPlan.transitOptions.map((opt, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-2xl bg-slate-950/60 border ${
                          opt.isRecommended
                            ? 'border-cyan-500/60 ring-1 ring-cyan-500/40'
                            : 'border-slate-800'
                        } space-y-3 relative`}
                      >
                        {opt.isRecommended && (
                          <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                            Recommended
                          </span>
                        )}

                        <div className="flex items-center gap-2 text-cyan-400">
                          {opt.mode === 'flight' && (
                            <Plane className="w-5 h-5" />
                          )}
                          {opt.mode === 'train' && (
                            <Train className="w-5 h-5" />
                          )}
                          {opt.mode === 'car' && <Car className="w-5 h-5" />}
                          <h4 className="text-sm font-bold text-white">
                            {opt.title}
                          </h4>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-400">
                            {opt.duration}
                          </span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            ~${opt.estimatedCost}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400">{opt.details}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Curated Stays */}
                {activeTab === 'hotels' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {generatedPlan.hotels.map((hotel, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden flex flex-col group hover:border-slate-700 transition"
                      >
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-36 object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 text-[10px] font-bold">
                                {hotel.tier}
                              </span>
                              <span className="text-xs text-amber-400 font-bold">
                                ★ {hotel.rating}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5">
                              {hotel.name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {hotel.location}
                            </p>
                          </div>

                          <div className="space-y-1">
                            {hotel.perks.map((p, idx) => (
                              <span
                                key={idx}
                                className="block text-[10px] text-slate-400"
                              >
                                • {p}
                              </span>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Per Night
                            </span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              ${hotel.pricePerNight}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 4: Food & Culinary Guide */}
                {activeTab === 'food' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {generatedPlan.foodGuide.map((food, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 text-[10px] font-bold">
                            {food.dishType}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {food.priceRange}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          {food.dishName}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {food.description}
                        </p>
                        <p className="text-[11px] text-cyan-400 font-medium">
                          📍 Recommended: {food.recommendedSpot}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 5: Budget Breakdown */}
                {activeTab === 'budget' && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">
                        Estimated Spend Matrix
                      </h4>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        ${generatedPlan.budgetBreakdown.totalPerPerson} /
                        traveler
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          Transit / Flights
                        </span>
                        <h5 className="text-sm font-bold text-white font-mono mt-0.5">
                          ${generatedPlan.budgetBreakdown.transport}
                        </h5>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          Lodging & Stays
                        </span>
                        <h5 className="text-sm font-bold text-white font-mono mt-0.5">
                          ${generatedPlan.budgetBreakdown.accommodation}
                        </h5>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          Dining & Street Food
                        </span>
                        <h5 className="text-sm font-bold text-white font-mono mt-0.5">
                          ${generatedPlan.budgetBreakdown.food}
                        </h5>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400">
                          Experiences & Sightseeing
                        </span>
                        <h5 className="text-sm font-bold text-white font-mono mt-0.5">
                          ${generatedPlan.budgetBreakdown.activities}
                        </h5>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
