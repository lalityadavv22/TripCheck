import React, { useState } from 'react';
import {
  Compass,
  Map,
  CalendarDays,
  Wallet,
  Backpack,
  Users,
  Search,
  Sparkles,
  ArrowUpRight,
  X,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { Destination } from '../types';
import { useDialog } from '../hooks/useDialog';

export type ActiveTab =
  'routes' | 'netflix' | 'planner' | 'budget' | 'survival' | 'voting';
export const NAV_LINKS = [
  { id: 'routes', label: 'Explore', icon: Compass },
  { id: 'netflix', label: 'Get inspired', icon: Map },
  { id: 'planner', label: 'My itinerary', icon: CalendarDays },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'survival', label: 'Travel essentials', icon: Backpack },
  { id: 'voting', label: 'Group ideas', icon: Users },
] as const;

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAIArchitect: () => void;
  destinations: Destination[];
  onSelectDestination: (dest: Destination) => void;
}
export function Navbar({
  activeTab,
  onTabChange,
  onOpenAIArchitect,
  destinations,
  onSelectDestination,
}: Props) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useDialog(searchOpen, () => setSearchOpen(false));
  const filtered = destinations.filter((d) =>
    `${d.name} ${d.country} ${d.tags.join(' ')}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  return (
    <>
      <div className="mobile-topbar">
        <button className="brand" onClick={() => onTabChange('routes')}>
          <span className="brand-icon">
            <Compass size={22} />
          </span>
          TripCheck<span className="brand-dot">.</span>
        </button>
        <button
          className="icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <button
          className="brand desktop-brand"
          onClick={() => onTabChange('routes')}
        >
          <span className="brand-icon">
            <Compass size={23} />
          </span>
          TripCheck<span className="brand-dot">.</span>
        </button>
        <div className="sidebar-section-label">YOUR NEXT CHAPTER</div>
        <nav aria-label="Main navigation">
          {NAV_LINKS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(id);
                setMenuOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {activeTab === id && <ChevronRight size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-invite">
          <span className="little-spark">
            <Sparkles size={21} />
          </span>
          <h3>A little help, a great trip.</h3>
          <p>Turn your travel ideas into a day-by-day plan.</p>
          <button onClick={onOpenAIArchitect}>
            Try the trip assistant <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="profile-avatar">Y</span>
          <div>
            <strong>Your travel space</strong>
            <span>Saved on this browser</span>
          </div>
          <span className="status-dot" />
        </div>
      </aside>
      <header className="workspace-header">
        <div className="breadcrumb">
          Your workspace <ChevronRight size={14} />
          <strong>{NAV_LINKS.find((n) => n.id === activeTab)?.label}</strong>
        </div>
        <div className="header-actions">
          <button
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={17} />
            <span>Find a destination</span>
            <kbd>⌕</kbd>
          </button>
          <div className="header-divider" />
          <span className="profile-avatar small">Y</span>
        </div>
      </header>
      {searchOpen && (
        <div className="dialog-backdrop">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Find a destination"
            className="search-dialog"
          >
            <div className="dialog-title">
              <h2>Where would you like to go?</h2>
              <button
                className="icon-button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="search-field">
              <Search size={19} />
              <input
                data-autofocus
                aria-label="Search destinations"
                placeholder="Try Tokyo, Italy, or beaches…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="search-results">
              {filtered.length ? (
                filtered.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDestination(d);
                      setSearchOpen(false);
                    }}
                  >
                    <img src={d.heroImage} alt="" />
                    <div>
                      <strong>{d.name}</strong>
                      <span>{d.country}</span>
                    </div>
                    <span>~${d.estimatedBudgetPerDay}/day</span>
                    <ChevronRight size={16} />
                  </button>
                ))
              ) : (
                <p>No matches yet. Try another city or country.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
