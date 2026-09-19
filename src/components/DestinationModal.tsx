import React, { useState } from 'react';
import { Destination } from '../types';
import {
  X,
  Star,
  Calendar,
  DollarSign,
  Sun,
  ShieldCheck,
  Sparkles,
  MapPin,
  CheckCircle2,
  Share2,
  Compass,
  ArrowRight
} from 'lucide-react';

interface DestinationModalProps {
  destination: Destination | null;
  onClose: () => void;
  onPlanTrip: (dest: Destination) => void;
  onGenerateAI: (dest: Destination) => void;
}

export const DestinationModal: React.FC<DestinationModalProps> = ({
  destination,
  onClose,
  onPlanTrip,
  onGenerateAI,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'highlights'>('overview');

  if (!destination) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        {/* Hero Banner Header */}
        <div className="relative h-72 sm:h-96 w-full overflow-hidden">
          <img
            src={destination.heroImage}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Top control bar */}
          <div className="absolute top-5 right-5 flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Trip link copied to clipboard!');
              }}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700 transition"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hero text overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
                  {destination.category}
                </span>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {destination.rating} ({destination.reviewsCount})
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  {destination.matchScore}% Match
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">{destination.name}</h2>
              <div className="flex items-center gap-2 text-slate-300 text-sm mt-1">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{destination.country} • {destination.region}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  onGenerateAI(destination);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI Architect</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onPlanTrip(destination);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition cursor-pointer"
              >
                <span>Plan Trip</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="border-b border-slate-800 px-6 flex gap-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'overview'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Vibe
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'highlights'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Curated Highlights
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'logistics'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Logistics & Budget
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[50vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <p className="text-base text-slate-300 leading-relaxed">
                {destination.description}
              </p>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Est. Daily Budget</span>
                  </div>
                  <div className="text-2xl font-bold text-white">${destination.estimatedBudgetPerDay}</div>
                  <span className="text-xs text-slate-400">per traveler</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Best Season</span>
                  </div>
                  <div className="text-sm font-bold text-white leading-tight">{destination.bestSeason}</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase mb-1">
                    <Sun className="w-4 h-4" />
                    <span>Live Weather</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{destination.weather.temp}°C</div>
                  <span className="text-xs text-slate-400">{destination.weather.condition}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Entry / Visa</span>
                  </div>
                  <div className="text-xs font-medium text-slate-300 leading-tight line-clamp-2">
                    {destination.visaRequirement}
                  </div>
                </div>
              </div>

              {/* Gallery snippet */}
              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-3 uppercase tracking-wider">Atmospheric Photo Gallery</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {destination.galleryImages.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Gallery ${i}`}
                      className="w-full h-32 object-cover rounded-xl border border-slate-800 hover:scale-105 transition duration-300"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Must-Experience Signature Encounters</h3>
              <div className="grid gap-3">
                {destination.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-cyan-500/40 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold text-slate-200">{highlight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logistics' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Entry & Border Regulations</span>
                </h4>
                <p className="text-sm text-slate-300">{destination.visaRequirement}</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Currency & Estimated Daily Breakdown</span>
                </h4>
                <p className="text-sm text-slate-300">
                  Official Currency: <strong>{destination.currency}</strong>. Estimated base expenses cover comfortable 4-star boutique hotel accommodations, 2 authentic dining experiences, regional transit passes, and tier-1 museum admissions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
