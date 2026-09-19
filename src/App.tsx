import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { dateAfter, today, importDays } from './utils/trip';
import { Navbar, ActiveTab } from './components/Navbar';
import { Global2DWorldExplorer } from './components/Global2DWorldExplorer';
const NetflixCarousels = lazy(() =>
  import('./components/NetflixCarousels').then((module) => ({
    default: module.NetflixCarousels,
  }))
);
const DestinationModal = lazy(() =>
  import('./components/DestinationModal').then((module) => ({
    default: module.DestinationModal,
  }))
);
const TripPlannerView = lazy(() =>
  import('./components/TripPlannerView').then((module) => ({
    default: module.TripPlannerView,
  }))
);
const BudgetTrackerView = lazy(() =>
  import('./components/BudgetTrackerView').then((module) => ({
    default: module.BudgetTrackerView,
  }))
);
const OfflineSurvivalView = lazy(() =>
  import('./components/OfflineSurvivalView').then((module) => ({
    default: module.OfflineSurvivalView,
  }))
);
const VotingRoomView = lazy(() =>
  import('./components/VotingRoomView').then((module) => ({
    default: module.VotingRoomView,
  }))
);
const AIArchitectModal = lazy(() =>
  import('./components/AIArchitectModal').then((module) => ({
    default: module.AIArchitectModal,
  }))
);
const RouteItineraryGenerator = lazy(() =>
  import('./components/RouteItineraryGenerator').then((module) => ({
    default: module.RouteItineraryGenerator,
  }))
);
import { PlaceAutocompleteInput } from './components/PlaceAutocompleteInput';
import {
  DESTINATIONS,
  INITIAL_TRIPS,
  INITIAL_VOTING_CARDS,
} from './data/mockData';
import {
  Destination,
  Trip,
  Expense,
  VotingCard,
  GeneratedTripPlan,
} from './types';
import { Plus as PlusIcon, ArrowRight, Navigation } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('routes');
  const [destinations, setDestinations] = useState<Destination[]>(DESTINATIONS);
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [activeTrip, setActiveTrip] = useLocalStorage<Trip>(
    'active-trip',
    INITIAL_TRIPS[0]
  );
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isRouteGenOpen, setIsRouteGenOpen] = useState(false);
  const [aiDestinationHint, setAiDestinationHint] = useState('');
  const [quickOrigin, setQuickOrigin] = useState('');
  const [quickDestination, setQuickDestination] = useState('');

  // Expenses state
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('expenses', [
    {
      id: 'e-1',
      tripId: INITIAL_TRIPS[0].id,
      category: 'Lodging',
      amount: 850,
      currency: 'USD',
      description: 'Cerulean Tower Tokyu Hotel (Shibuya)',
      date: '2026-10-10',
      paidBy: 'Alex (You)',
    },
    {
      id: 'e-2',
      tripId: INITIAL_TRIPS[0].id,
      category: 'Flights',
      amount: 1100,
      currency: 'USD',
      description: 'Roundtrip Flight ANA Star Alliance',
      date: '2026-10-09',
      paidBy: 'Alex (You)',
    },
    {
      id: 'e-3',
      tripId: INITIAL_TRIPS[0].id,
      category: 'Dining',
      amount: 140,
      currency: 'USD',
      description: 'Shibuya Scramble Omakase Dinner',
      date: '2026-10-10',
      paidBy: 'Jordan',
    },
  ]);

  // Voting cards state
  const [votingCards, setVotingCards] = useLocalStorage<VotingCard[]>(
    'votes',
    INITIAL_VOTING_CARDS
  );

  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const handler = () => setStorageError(true);
    window.addEventListener('tripcheck:storage-error', handler);
    const id = new URLSearchParams(window.location.search).get('destination');
    if (id)
      setSelectedDestination(DESTINATIONS.find((d) => d.id === id) || null);
    return () => window.removeEventListener('tripcheck:storage-error', handler);
  }, []);
  // Sync with backend on startup
  useEffect(() => {
    fetch('/api/destinations')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) setDestinations(data);
      })
      .catch(() => {
        // use local mock data
      });
  }, []);

  const handleOpenAIWithDest = (dest?: Destination | string) => {
    setSelectedDestination(null);
    if (typeof dest === 'string') {
      setAiDestinationHint(dest);
    } else if (dest) {
      setAiDestinationHint(`${dest.name}, ${dest.country}`);
    } else {
      setAiDestinationHint(activeTrip.destination);
    }
    setIsAIModalOpen(true);
  };

  const handlePlanTripFromDest = (dest: Destination) => {
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: `A week in ${dest.name}`,
      destination: `${dest.name}, ${dest.country}`,
      country: dest.country,
      coverImage: dest.heroImage,
      startDate: today(),
      endDate: dateAfter(today(), 6),
      totalBudget: dest.estimatedBudgetPerDay * 7 * 2,
      currency: 'USD',
      travelers: 2,
      status: 'planning',
      days: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        date: dateAfter(today(), i),
        theme: i === 0 ? 'Arrive & settle in' : 'Make it your own',
        activities: [],
      })),
    };
    setSelectedDestination(null);
    setActiveTrip(newTrip);
    setActiveTab('planner');
  };

  const handleImportGeneratedPlan = (plan: GeneratedTripPlan) => {
    const convertedDays = importDays(plan.days, plan.destination, today());

    const newTrip: Trip = {
      id: `trip-gen-${Date.now()}`,
      title: plan.title,
      planningNote: plan.planningNote,
      destination: plan.destination,
      country: plan.destination.split(',').pop()?.trim() || '',
      coverImage:
        destinations.find((d) =>
          plan.destination
            .toLowerCase()
            .includes(d.name.split(' &')[0].toLowerCase())
        )?.heroImage || '/images/travel-placeholder.svg',
      startDate: today(),
      endDate: dateAfter(today(), plan.days.length - 1),
      totalBudget: plan.budgetBreakdown.totalPerPerson * plan.travelers,
      currency: 'USD',
      travelers: plan.travelers,
      status: 'planning',
      days: convertedDays,
    };

    setActiveTrip(newTrip);
    setIsRouteGenOpen(false);
    setIsAIModalOpen(false);
    setActiveTab('planner');
  };

  const handleVote = (cardId: string, direction: 'up' | 'down') => {
    setVotingCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        if (c.userVoted === direction) {
          // undo vote
          return {
            ...c,
            votesUp: direction === 'up' ? c.votesUp - 1 : c.votesUp,
            votesDown: direction === 'down' ? c.votesDown - 1 : c.votesDown,
            userVoted: undefined,
          };
        }
        return {
          ...c,
          votesUp:
            direction === 'up'
              ? c.votesUp + 1
              : c.userVoted === 'up'
                ? c.votesUp - 1
                : c.votesUp,
          votesDown:
            direction === 'down'
              ? c.votesDown + 1
              : c.userVoted === 'down'
                ? c.votesDown - 1
                : c.votesDown,
          userVoted: direction,
        };
      })
    );
  };

  const handleAddVotingCard = (newCard: VotingCard) => {
    setVotingCards((prev) => [newCard, ...prev]);
  };

  const handleAddExpense = (newExp: Expense) => {
    setExpenses((prev) => [newExp, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div
      className="app-shell"
      onErrorCapture={(event) => {
        const image = event.target;
        if (
          image instanceof HTMLImageElement &&
          !image.classList.contains('leaflet-tile') &&
          !image.src.endsWith('/images/travel-placeholder.svg')
        )
          image.src = '/images/travel-placeholder.svg';
      }}
    >
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {storageError && (
        <div className="storage-warning" role="alert">
          Browser storage is unavailable. Your changes may not survive a
          refresh.
          <button
            className="icon-button"
            aria-label="Dismiss storage warning"
            onClick={() => setStorageError(false)}
          >
            ×
          </button>
        </div>
      )}
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAIArchitect={() => handleOpenAIWithDest()}
        destinations={destinations}
        onSelectDestination={(dest) => setSelectedDestination(dest)}
      />

      {/* Main Content Area */}
      <main className="workspace-main" id="main-content">
        {activeTab !== 'routes' && (
          <div className="page-action-bar">
            <span>One trip. Everything in one place.</span>
            <button
              className="primary-button"
              onClick={() => setIsRouteGenOpen(true)}
            >
              <PlusIcon /> Plan a new trip
            </button>
          </div>
        )}
        {activeTrip.id === INITIAL_TRIPS[0].id &&
          !['routes', 'netflix'].includes(activeTab) && (
            <p className="mb-5 text-xs text-slate-400">
              You’re exploring an example trip. Plan a new trip to start fresh
              with your own details.
            </p>
          )}
        <Suspense
          fallback={
            <div className="empty-state" role="status">
              Opening your travel space…
            </div>
          }
        >
          {/* Tab 1: High-Resolution 2D Global Route Explorer */}
          {activeTab === 'routes' && (
            <Global2DWorldExplorer
              destinations={destinations}
              onSelectDestination={(dest) => setSelectedDestination(dest)}
              onPlanTripTo={(cityName) => {
                setQuickDestination(cityName);
                setIsRouteGenOpen(true);
              }}
              userOrigin={quickOrigin}
            >
              <form
                className="quick-plan"
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsRouteGenOpen(true);
                }}
              >
                <div className="quick-plan-intro">
                  <span className="quick-plan-icon">
                    <Navigation size={21} />
                  </span>
                  <div>
                    <strong>Let’s make a plan.</strong>
                    <span>Your next trip, made simple.</span>
                  </div>
                </div>
                <div className="quick-plan-field">
                  <label htmlFor="quick-origin-input">LEAVING FROM</label>
                  <PlaceAutocompleteInput
                    id="quick-origin-input"
                    compact
                    showCoordinatesBadge={false}
                    iconType="origin"
                    value={quickOrigin}
                    onChange={setQuickOrigin}
                    placeholder="Your city or airport"
                  />
                </div>
                <ArrowRight size={17} className="quick-plan-arrow" />
                <div className="quick-plan-field">
                  <label htmlFor="quick-dest-input">GOING TO</label>
                  <PlaceAutocompleteInput
                    id="quick-dest-input"
                    compact
                    showCoordinatesBadge={false}
                    iconType="destination"
                    value={quickDestination}
                    onChange={setQuickDestination}
                    placeholder="Somewhere new…"
                  />
                </div>
                <button className="primary-button" type="submit">
                  Plan my trip <ArrowRight size={16} />
                </button>
              </form>
            </Global2DWorldExplorer>
          )}

          {/* Tab 2: Netflix-Style Vibe Exploration */}
          {activeTab === 'netflix' && (
            <NetflixCarousels
              destinations={destinations}
              onSelectDestination={(dest) => setSelectedDestination(dest)}
              onOpenAIArchitect={handleOpenAIWithDest}
            />
          )}

          {/* Tab 3: Trip Itinerary & Map View */}
          {activeTab === 'planner' && (
            <TripPlannerView
              key={activeTrip.id}
              trip={activeTrip}
              onUpdateTrip={setActiveTrip}
              onOpenAIArchitect={handleOpenAIWithDest}
            />
          )}

          {/* Tab 4: Budget & Expenses */}
          {activeTab === 'budget' && (
            <BudgetTrackerView
              trip={activeTrip}
              expenses={expenses.filter((e) => e.tripId === activeTrip.id)}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {/* Tab 5: Offline Survival & Emergency */}
          {activeTab === 'survival' && (
            <OfflineSurvivalView
              key={activeTrip.id}
              tripId={activeTrip.id}
              country={activeTrip.country}
            />
          )}

          {/* Tab 6: Group Voting Room */}
          {activeTab === 'voting' && (
            <VotingRoomView
              trip={activeTrip}
              cards={votingCards.filter((c) => c.tripId === activeTrip.id)}
              onVote={handleVote}
              onAddCard={handleAddVotingCard}
            />
          )}
        </Suspense>
      </main>

      <Suspense
        fallback={
          <div className="storage-warning" role="status">
            Getting things ready…
          </div>
        }
      >
        {/* Destination Modal */}
        {selectedDestination && (
          <DestinationModal
            destination={selectedDestination}
            onClose={() => setSelectedDestination(null)}
            onPlanTrip={handlePlanTripFromDest}
            onGenerateAI={handleOpenAIWithDest}
          />
        )}

        {/* AI Travel Architect Modal */}
        {isAIModalOpen && (
          <AIArchitectModal
            isOpen={isAIModalOpen}
            onClose={() => setIsAIModalOpen(false)}
            destinationHint={aiDestinationHint}
            onImportPlanToTrip={handleImportGeneratedPlan}
          />
        )}

        {/* Origin-to-Destination Route Itinerary Generator Modal */}
        {isRouteGenOpen && (
          <RouteItineraryGenerator
            isOpen={isRouteGenOpen}
            onClose={() => setIsRouteGenOpen(false)}
            onImportTrip={handleImportGeneratedPlan}
            defaultOrigin={quickOrigin}
            defaultDestination={quickDestination}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
