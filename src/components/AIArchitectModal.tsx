import { GoogleMapsLink } from './GoogleMapsLink';
import { isGeneratedTripPlan } from '../utils/validation';
import { parseJsonResponse } from '../utils/api';
import { useDialog } from '../hooks/useDialog';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  Send,
  CheckCircle2,
  ArrowRight,
  Compass,
  ShieldAlert,
  DollarSign,
} from 'lucide-react';
import { GeneratedTripPlan, PlaceItem } from '../types';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface AIArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationHint?: string;
  onImportPlanToTrip?: (plan: GeneratedTripPlan) => void;
}

export const AIArchitectModal: React.FC<AIArchitectModalProps> = ({
  isOpen,
  onClose,
  destinationHint = '',
  onImportPlanToTrip,
}) => {
  const requestRef = React.useRef<AbortController | null>(null);
  React.useEffect(() => {
    if (!isOpen) {
      requestRef.current?.abort();
      setIsLoading(false);
    }
    return () => requestRef.current?.abort();
  }, [isOpen]);
  const [destination, setDestination] = useState(destinationHint || '');
  const dialogRef = useDialog(isOpen, onClose);
  const [destPlace, setDestPlace] = useState<PlaceItem | null>(null);
  const [durationDays, setDurationDays] = useState(5);
  const [travelVibe, setTravelVibe] = useState('Culture & Gastronomy');
  const [budgetTier, setBudgetTier] = useState('Moderate');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedTripPlan | null>(
    null
  );

  useEffect(() => {
    setDestination(destinationHint);
    setDestPlace(null);
    setGeneratedPlan(null);
    setError('');
    setNotice('');
  }, [destinationHint, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!destination.trim()) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError('');
    setNotice('');
    setGeneratedPlan(null);

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        signal: AbortSignal.any([
          controller.signal,
          // Longer than the server's live-generation budget so retries can finish
          // and the caller still gets either a live plan or the labelled sample.
          AbortSignal.timeout(75000),
        ]),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destination.trim(),
          destCoords: destPlace
            ? { lat: destPlace.lat, lng: destPlace.lng }
            : undefined,
          days: durationDays,
          vibe: travelVibe,
          budgetTier,
        }),
      });

      const data = await parseJsonResponse<{
        success?: boolean;
        error?: string;
        notice?: string;
        notes?: string[];
        source?: 'ai' | 'sample';
        plan?: GeneratedTripPlan;
      }>(res);
      if (controller.signal.aborted) return;
      if (!res.ok || !isGeneratedTripPlan(data.plan))
        throw new Error(
          data.error || 'We couldn’t make your plan. Please try again.'
        );
      const repairNotes =
        Array.isArray(data.notes) && data.notes.length
          ? ` ${data.notes.join(' ')}`
          : '';
      setNotice(
        (data.notice ||
          (data.source === 'sample'
            ? 'Sample plan — live AI is unavailable.'
            : 'AI suggestions — double-check places, costs and opening times before you go.')) + repairNotes
      );
      setGeneratedPlan({
        ...data.plan,
        planningNote:
          data.source === 'sample'
            ? data.notice
            : 'AI suggestions — verify details before booking.',
      });
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : 'Connection lost. Please try again.'
        );
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trip assistant"
        className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl p-6 sm:p-8 space-y-6 my-8 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Your trip assistant
              </h3>
              <p className="text-xs text-slate-400">
                A starting point for your next adventure. You make it yours.
              </p>
            </div>
          </div>
          <button
            aria-label="Close trip assistant"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <PlaceAutocompleteInput
              id="ai-modal-dest-input"
              label="Destination (City, Town, Monument)"
              iconType="destination"
              required
              value={destination}
              placeholder="e.g. Agra, Kyoto, Paris, Machu Picchu..."
              onChange={(val, place) => {
                setDestination(val);
                setDestPlace(place || null);
              }}
              onSelectPlace={(place) => {
                setDestPlace(place);
              }}
            />
          </div>

          <div>
            <label
              htmlFor="aiarchitectmodal-field-1"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Trip Duration ({durationDays} Days)
            </label>
            <input
              id="aiarchitectmodal-field-1"
              type="range"
              min={2}
              max={14}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-3"
            />
          </div>

          <div>
            <label
              htmlFor="aiarchitectmodal-field-2"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Travel Style / Vibe
            </label>
            <select
              id="aiarchitectmodal-field-2"
              value={travelVibe}
              onChange={(e) => setTravelVibe(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Culture & Gastronomy">
                Culture, history & good food
              </option>
              <option value="Alpine Adventure & Trekking">
                Alpine Adventure, Lakes & Trekking
              </option>
              <option value="Cyberpunk & Nightlife">
                City life & evenings out
              </option>
              <option value="Relaxation & Wellness">
                Beach Retreat, Hot Springs & Wellness
              </option>
              <option value="Hidden Gems & Off-the-Beaten-Path">
                Hidden Gems & Off-the-Beaten-Path
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="aiarchitectmodal-field-3"
              className="text-xs font-bold text-slate-300 block mb-1.5"
            >
              Budget Expectation
            </label>
            <select
              id="aiarchitectmodal-field-3"
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="Budget">Budget-friendly</option>
              <option value="Moderate">A little comfort</option>
              <option value="Luxury">Something special</option>
            </select>
          </div>
        </div>

        {/* Generate Action Button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading || !destination.trim()}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-purple-900/30 transition duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Putting your ideas together…</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Create my itinerary</span>
            </>
          )}
        </button>

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
        {/* Results Area */}
        {generatedPlan && (
          <div className="space-y-4 pt-4 border-t border-slate-800 max-h-[40vh] overflow-y-auto pr-2">
            <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-800/40 space-y-2">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span>{generatedPlan.title}</span>
              </h4>
              <GoogleMapsLink place={generatedPlan.destination} />
              <p className="text-xs text-slate-300">{generatedPlan.summary}</p>
            </div>

            {/* Generated Days */}
            <div className="space-y-3">
              {generatedPlan.days?.map((d: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400">
                      Day {d.dayNumber}
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {d.theme}
                    </span>
                  </div>
                  <div className="grid gap-1.5 pt-1">
                    {d.activities?.map((a: any, aIdx: number) => (
                      <div
                        key={aIdx}
                        className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800/60 last:border-none"
                      >
                        <span className="font-mono text-cyan-300 text-[11px]">
                          {a.time}
                        </span>
                        <span className="flex-1 mx-3 font-medium text-white truncate">
                          {a.title}
                        </span>
                        {a.cost && (
                          <span className="font-mono text-emerald-400">
                            ${a.cost}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Import Button */}
            {onImportPlanToTrip && (
              <button
                onClick={() => {
                  onImportPlanToTrip(generatedPlan);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Import This Itinerary Into Active Trip Planner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
