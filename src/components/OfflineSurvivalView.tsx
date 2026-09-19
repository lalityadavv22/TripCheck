import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { EMERGENCY_DB, INITIAL_PACKING_LIST } from '../data/mockData';
import { PackingItem, EmergencyInfo } from '../types';
import {
  ShieldAlert,
  PhoneCall,
  CheckSquare,
  Square,
  Plus,
  ArrowLeftRight,
  WifiOff,
  AlertTriangle,
  Hospital,
  Compass,
  FileCheck,
} from 'lucide-react';

export const OfflineSurvivalView: React.FC<{
  tripId: string;
  country: string;
}> = ({ tripId, country }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(
    EMERGENCY_DB[country] ? country : 'Japan'
  );
  const [packingItems, setPackingItems] = useLocalStorage<PackingItem[]>(
    `packing:${tripId}`,
    INITIAL_PACKING_LIST
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] =
    useState<PackingItem['category']>('Essentials');

  // Currency Converter state
  const [calcAmount, setCalcAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('JPY');

  const exchangeRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.92,
    JPY: 154.5,
    GBP: 0.78,
    CHF: 0.88,
    ISK: 138.2,
    IDR: 15800.0,
  };

  const convertedValue =
    ((parseFloat(calcAmount) || 0) / exchangeRates[fromCurrency]) *
    exchangeRates[toCurrency];

  const currentEmergency: EmergencyInfo =
    EMERGENCY_DB[selectedCountry] || EMERGENCY_DB['Japan'];

  const togglePackingItem = (id: string) => {
    setPackingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAddPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: PackingItem = {
      id: `p-${Date.now()}`,
      category: newItemCat,
      name: newItemName.trim(),
      checked: false,
    };
    setPackingItems((prev) => [newItem, ...prev]);
    setNewItemName('');
  };

  const completedCount = packingItems.filter((p) => p.checked).length;
  const completionPercent = Math.round(
    (completedCount / packingItems.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Offline Status Header Banner */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <WifiOff className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              The essentials, all together
            </h2>
            <p className="text-xs text-slate-400">
              Packing, useful numbers, and a little peace of mind. Save
              important numbers separately before you travel.
            </p>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Country:</span>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
          >
            {Object.keys(EMERGENCY_DB).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Emergency Hotline Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-rose-50/30 border border-rose-200/50 shadow-lg">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Police</span>
          </div>
          <div className="text-3xl font-black text-rose-700 font-mono">
            <a href={`tel:${currentEmergency.police}`}>
              {currentEmergency.police}
            </a>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Local emergency dispatch
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200/50 shadow-lg">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-1">
            <Hospital className="w-4 h-4" />
            <span>Ambulance</span>
          </div>
          <div className="text-3xl font-black text-amber-700 font-mono">
            <a href={`tel:${currentEmergency.ambulance}`}>
              {currentEmergency.ambulance}
            </a>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Medical response
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50/30 border border-orange-200/50 shadow-lg">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>Fire Rescue</span>
          </div>
          <div className="text-3xl font-black text-orange-700 font-mono">
            <a href={`tel:${currentEmergency.fire}`}>{currentEmergency.fire}</a>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Fire & rescue squads
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-50/30 border border-cyan-200/50 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase mb-1">
            <PhoneCall className="w-4 h-4" />
            <span>Emergency line</span>
          </div>
          <div className="text-3xl font-black text-cyan-700 font-mono">
            <a href={`tel:${currentEmergency.emergencyGeneral}`}>
              {currentEmergency.emergencyGeneral}
            </a>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Local emergency reference
          </span>
        </div>
      </div>

      {/* Hospital & Embassy Contact Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Hospital className="w-4 h-4 text-cyan-400" />
          <span>Medical & embassy information</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-400 block mb-1 font-semibold">
              Hospital Referral:
            </span>
            <span className="text-slate-200 font-medium">
              {currentEmergency.hospital}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-400 block mb-1 font-semibold">
              Embassy Assistance:
            </span>
            <span className="text-slate-200 font-medium">
              {currentEmergency.embassySupport}
            </span>
          </div>
        </div>
        <p className="text-xs text-amber-300/90 italic bg-amber-50/20 p-3 rounded-xl border border-amber-200/30">
          Travel tip: {currentEmergency.tip}
        </p>
      </div>

      {/* Offline Tools: Currency Converter & Packing Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Currency Converter (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span>Currency estimate</span>
          </h3>

          <p className="text-xs text-slate-400">
            Illustrative rates, not live quotes. Check your provider before
            exchanging money. An internet connection is needed to reopen this
            app.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Amount
              </label>
              <input
                type="number"
                min="0"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-lg font-bold text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  From
                </label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  {Object.keys(exchangeRates).map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">To</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                >
                  {Object.keys(exchangeRates).map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200/40 text-center">
              <span className="text-xs text-slate-400">Exchange Result</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                {convertedValue.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{' '}
                {toCurrency}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Packing Checklist (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Your packing list</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {completedCount} of {packingItems.length} packed (
                {completionPercent}%)
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-cyan-500 flex items-center justify-center text-xs font-bold text-cyan-400">
              {completionPercent}%
            </div>
          </div>

          {/* Quick add item form */}
          <form onSubmit={handleAddPackingItem} className="flex gap-2">
            <input
              type="text"
              placeholder="Add packing item (e.g. Hiking boots, rain poncho)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="min-w-0 flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Checklist items */}
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {packingItems.map((item) => (
              <div
                key={item.id}
                role="checkbox"
                aria-checked={item.checked}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    togglePackingItem(item.id);
                  }
                }}
                onClick={() => togglePackingItem(item.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                  item.checked
                    ? 'bg-slate-950/40 border-slate-850 opacity-60'
                    : 'bg-slate-800/50 border-slate-700/60 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-medium ${item.checked ? 'line-through text-slate-500' : 'text-slate-200'}`}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
