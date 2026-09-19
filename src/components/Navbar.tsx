import React, { useState } from 'react';
import {
  Compass,
  Globe,
  Film,
  MapPin,
  Wallet,
  ShieldAlert,
  Users,
  Search,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { Destination } from '../types';

export type ActiveTab = 'routes' | 'netflix' | 'planner' | 'budget' | 'survival' | 'voting';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAIArchitect: () => void;
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenAIArchitect,
  destinations,
  onSelectDestination,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filtered = searchQuery.trim()
    ? destinations.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const navLinks: { id: ActiveTab; label: string; icon: React.ReactNode; isNew?: boolean }[] = [
    { id: 'routes', label: '2D Route Map', icon: <Compass className="w-4 h-4 text-cyan-400" /> },
    { id: 'netflix', label: 'Netflix Vibe', icon: <Film className="w-4 h-4" /> },
    { id: 'planner', label: 'Trip Itinerary', icon: <MapPin className="w-4 h-4" /> },
    { id: 'budget', label: 'Budget Ledger', icon: <Wallet className="w-4 h-4" /> },
    { id: 'survival', label: 'Offline Survival', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'voting', label: 'Group Voting', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('routes')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Compass className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">TripCheck</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-extrabold tracking-wider border border-cyan-500/30">
                  AI ROUTE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Smart Itinerary & Route Generator</p>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => onTabChange(link.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
                  activeTab === link.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </nav>

          {/* Search Trigger & AI Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 text-xs transition cursor-pointer"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Search destinations...</span>
            </button>

            <button
              onClick={onOpenAIArchitect}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Architect</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-1 animate-in slide-in-from-top-2">
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => {
                  onTabChange(link.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === link.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Global Smart Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 space-y-4">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-cyan-400 absolute left-3.5" />
              <input
                type="text"
                autoFocus
                placeholder="Search by country, city, vibe (e.g. Cyberpunk, Alps, Bali)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-3 text-slate-400 hover:text-white text-xs"
              >
                ESC
              </button>
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
              {searchQuery.trim() === '' ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Type to explore destinations, tags, or themes...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No destinations found matching "{searchQuery}".
                </div>
              ) : (
                filtered.map(dest => (
                  <div
                    key={dest.id}
                    onClick={() => {
                      onSelectDestination(dest);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-3 flex items-center gap-3.5 hover:bg-slate-800/80 rounded-xl cursor-pointer transition"
                  >
                    <img
                      src={dest.heroImage}
                      alt={dest.name}
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate">{dest.name}</h4>
                        <span className="text-xs font-semibold text-emerald-400 font-mono">
                          ${dest.estimatedBudgetPerDay}/day
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{dest.country} • {dest.category}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
