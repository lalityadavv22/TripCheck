import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, ActivityItem, ItineraryDay } from '../types';
import { InteractiveMap } from './InteractiveMap';
import { HighRes2DRouteMap } from './HighRes2DRouteMap';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Navigation,
  Compass,
  Plane,
  Bed,
  Utensils,
  Camera,
  Layers,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';

interface TripPlannerViewProps {
  trip: Trip;
  onUpdateTrip: (updated: Trip) => void;
  onOpenAIArchitect: (destinationName: string) => void;
}

export const TripPlannerView: React.FC<TripPlannerViewProps> = ({
  trip,
  onUpdateTrip,
  onOpenAIArchitect,
}) => {
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapEngine, setMapEngine] = useState<'mapbox' | 'leaflet'>('mapbox');

  // New activity state
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newCategory, setNewCategory] = useState<ActivityItem['category']>('sightseeing');
  const [newLocation, setNewLocation] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const currentDay = trip.days.find(d => d.dayNumber === selectedDayNum) || trip.days[0];

  const handleToggleComplete = (dayNum: number, activityId: string) => {
    const updatedDays = trip.days.map(d => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.map(a =>
          a.id === activityId ? { ...a, isCompleted: !a.isCompleted } : a
        ),
      };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  const handleDeleteActivity = (dayNum: number, activityId: string) => {
    const updatedDays = trip.days.map(d => {
      if (d.dayNumber !== dayNum) return d;
      return {
        ...d,
        activities: d.activities.filter(a => a.id !== activityId),
      };
    });
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Approximate lat/lng nearby for visualization
    const baseLat = currentDay.activities[0]?.lat || 35.6762;
    const baseLng = currentDay.activities[0]?.lng || 139.6503;
    const jitterLat = baseLat + (Math.random() - 0.5) * 0.04;
    const jitterLng = baseLng + (Math.random() - 0.5) * 0.04;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      title: newTitle.trim(),
      time: newTime,
      category: newCategory,
      locationName: newLocation.trim() || 'Central District',
      lat: jitterLat,
      lng: jitterLng,
      cost: parseFloat(newCost) || 0,
      notes: newNotes.trim(),
      isCompleted: false,
    };

    const updatedDays = trip.days.map(d => {
      if (d.dayNumber !== selectedDayNum) return d;
      const sorted = [...d.activities, newActivity].sort((a, b) => a.time.localeCompare(b.time));
      return { ...d, activities: sorted };
    });

    onUpdateTrip({ ...trip, days: updatedDays });

    // Reset
    setNewTitle('');
    setNewLocation('');
    setNewCost('');
    setNewNotes('');
    setShowAddActivityModal(false);
  };

  const handleAddNewDay = () => {
    const newDayNum = trip.days.length + 1;
    const newDay: ItineraryDay = {
      dayNumber: newDayNum,
      date: `Day ${newDayNum}`,
      theme: 'Exploration & Free Discovery',
      activities: [],
    };
    onUpdateTrip({ ...trip, days: [...trip.days, newDay] });
    setSelectedDayNum(newDayNum);
  };

  const getCategoryIcon = (cat: ActivityItem['category']) => {
    switch (cat) {
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'lodging':
        return <Bed className="w-4 h-4 text-purple-400" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'sightseeing':
        return <Camera className="w-4 h-4 text-emerald-400" />;
      default:
        return <Compass className="w-4 h-4 text-cyan-400" />;
    }
  };

  const totalSpent = trip.days.reduce((acc, d) => {
    return acc + d.activities.reduce((dAcc, a) => dAcc + (a.cost || 0), 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Trip Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img
            src={trip.coverImage}
            alt={trip.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase">
                  Active Expedition
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {trip.startDate} – {trip.endDate}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">{trip.title}</h2>
              <div className="flex items-center gap-2 text-slate-300 text-sm mt-1">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{trip.destination} • {trip.travelers} Travelers</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenAIArchitect(trip.destination)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-semibold text-xs border border-purple-400/30 transition shadow-lg cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Optimize with AI</span>
              </button>
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  showMap
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Trip Stats strip */}
        <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/70 divide-x divide-slate-800 text-center py-3">
          <div>
            <span className="text-xs text-slate-400 block">Total Days</span>
            <strong className="text-base text-white">{trip.days.length} Days Planned</strong>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Itinerary Spend</span>
            <strong className="text-base text-emerald-400">${totalSpent}</strong>
            <span className="text-xs text-slate-500 ml-1">/ ${trip.totalBudget}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Planned Stops</span>
            <strong className="text-base text-cyan-400">
              {trip.days.reduce((acc, d) => acc + d.activities.length, 0)} Activities
            </strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Days & Schedule / Interactive Map) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Schedule & Days Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {trip.days.map(d => (
              <button
                key={d.dayNumber}
                onClick={() => setSelectedDayNum(d.dayNumber)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedDayNum === d.dayNumber
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                Day {d.dayNumber}
              </button>
            ))}
            <button
              onClick={handleAddNewDay}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-dashed border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day</span>
            </button>
          </div>

          {/* Current Day Header Card */}
          {currentDay && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Day {currentDay.dayNumber} Schedule
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{currentDay.theme}</h3>
                </div>
                <button
                  onClick={() => setShowAddActivityModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop</span>
                </button>
              </div>

              {/* Activity Timeline List */}
              <div className="space-y-3 pt-2">
                {currentDay.activities.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-400 mb-2">No activities scheduled for this day yet.</p>
                    <button
                      onClick={() => setShowAddActivityModal(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 transition"
                    >
                      + Add First Stop
                    </button>
                  </div>
                ) : (
                  currentDay.activities.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      className={`group relative flex items-start gap-3.5 p-3.5 rounded-xl border transition ${
                        activity.isCompleted
                          ? 'bg-slate-950/40 border-slate-850 opacity-60'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-cyan-500/40'
                      }`}
                    >
                      {/* Checkbox button */}
                      <button
                        onClick={() => handleToggleComplete(currentDay.dayNumber, activity.id)}
                        className="mt-0.5 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                        title={activity.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                      >
                        {activity.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      {/* Icon badge */}
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                        {getCategoryIcon(activity.category)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-300 font-mono">
                            {activity.time}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">
                            {activity.category}
                          </span>
                        </div>
                        <h4
                          className={`text-sm font-bold text-white mt-1 ${
                            activity.isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{activity.locationName}</span>
                        </div>
                        {activity.notes && (
                          <p className="text-xs text-slate-400 italic mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                            "{activity.notes}"
                          </p>
                        )}
                      </div>

                      {/* Cost & Delete */}
                      <div className="text-right shrink-0">
                        {activity.cost > 0 && (
                          <div className="text-xs font-bold text-emerald-400 font-mono">
                            ${activity.cost}
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteActivity(currentDay.dayNumber, activity.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition mt-2 cursor-pointer"
                          title="Delete activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Map Column (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          {/* Map Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-extrabold text-[11px] border border-cyan-500/30 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>High-Resolution 2D Itinerary Map</span>
              </span>
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800"
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </button>
          </div>

          {showMap ? (
            <div className="sticky top-20 h-[520px]">
              <HighRes2DRouteMap
                destCoords={{
                  lat: currentDay?.activities[0]?.lat || 35.6762,
                  lng: currentDay?.activities[0]?.lng || 139.6503,
                }}
                destName={trip.destination}
                points={(currentDay?.activities || []).map((a, idx) => ({
                  id: a.id,
                  title: a.title,
                  lat: a.lat,
                  lng: a.lng,
                  category: a.category,
                  time: a.time,
                  cost: a.cost,
                  description: a.notes,
                }))}
                className="h-full"
                defaultLayer="voyager"
              />
            </div>
          ) : (
            <div className="p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 text-center flex flex-col items-center justify-center h-64">
              <Navigation className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">Map view is hidden</p>
              <button
                onClick={() => setShowMap(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 transition"
              >
                Enable Map
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Add Itinerary Stop</h3>
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Tea Ceremony in Uji"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="sightseeing">Sightseeing</option>
                    <option value="food">Dining / Food</option>
                    <option value="lodging">Lodging / Hotel</option>
                    <option value="flight">Flight / Transit</option>
                    <option value="leisure">Leisure / Wellness</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Location Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Uji Byodoin Temple"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cost ($ USD)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newCost}
                    onChange={e => setNewCost(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Notes / Booking Ref</label>
                <textarea
                  rows={2}
                  placeholder="Ticket numbers, dress code, confirmation code..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
