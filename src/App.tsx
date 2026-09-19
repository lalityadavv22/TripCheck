import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { Global2DWorldExplorer } from './components/Global2DWorldExplorer';
import { NetflixCarousels } from './components/NetflixCarousels';
import { DestinationModal } from './components/DestinationModal';
import { TripPlannerView } from './components/TripPlannerView';
import { BudgetTrackerView } from './components/BudgetTrackerView';
import { OfflineSurvivalView } from './components/OfflineSurvivalView';
import { VotingRoomView } from './components/VotingRoomView';
import { AIArchitectModal } from './components/AIArchitectModal';
import { RouteItineraryGenerator } from './components/RouteItineraryGenerator';
import { PlaceAutocompleteInput } from './components/PlaceAutocompleteInput';
import { DESTINATIONS, INITIAL_TRIPS, INITIAL_VOTING_CARDS } from './data/mockData';
import { Destination, Trip, Expense, VotingCard, GeneratedTripPlan } from './types';
import { Compass, Sparkles, MapPin, Film, Layers, ArrowRight, Navigation, Plane } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('routes');
  const [destinations, setDestinations] = useState<Destination[]>(DESTINATIONS);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip>(INITIAL_TRIPS[0]);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isRouteGenOpen, setIsRouteGenOpen] = useState(false);
  const [aiDestinationHint, setAiDestinationHint] = useState('');
  const [quickOrigin, setQuickOrigin] = useState('');
  const [quickDestination, setQuickDestination] = useState('');

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([
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
  const [votingCards, setVotingCards] = useState<VotingCard[]>(INITIAL_VOTING_CARDS);

  // Sync with backend on startup
  useEffect(() => {
    fetch('/api/destinations')
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) setDestinations(data);
      })
      .catch(() => {
        // use local mock data
      });
  }, []);

  const handleOpenAIWithDest = (dest?: Destination | string) => {
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
      title: `Expedition to ${dest.name}`,
      destination: `${dest.name}, ${dest.country}`,
      country: dest.country,
      coverImage: dest.heroImage,
      startDate: '2026-11-01',
      endDate: '2026-11-08',
      totalBudget: dest.estimatedBudgetPerDay * 7 * 2,
      currency: 'USD',
      travelers: 2,
      status: 'planning',
      days: [
        {
          dayNumber: 1,
          date: '2026-11-01',
          theme: 'Arrival & Welcome Dinner',
          activities: [
            {
              id: `act-${Date.now()}-1`,
              time: '14:00',
              title: `Check into ${dest.name} Boutique Hotel`,
              category: 'lodging',
              locationName: `${dest.name} City Center`,
              lat: dest.lat,
              lng: dest.lng,
              cost: dest.estimatedBudgetPerDay * 0.6,
              notes: 'Early check-in requested',
            },
            {
              id: `act-${Date.now()}-2`,
              time: '18:30',
              title: `Sunset Experience: ${dest.highlights[0] || 'Scenic Viewpoint'}`,
              category: 'sightseeing',
              locationName: dest.highlights[0] || dest.name,
              lat: dest.lat + 0.01,
              lng: dest.lng + 0.01,
              cost: 30,
            },
          ],
        },
      ],
    };
    setActiveTrip(newTrip);
    setActiveTab('planner');
  };

  const handleImportPlanToTrip = (title: string, destinationName: string, generatedDays: any[]) => {
    const convertedDays = generatedDays.map((d: any) => ({
      dayNumber: d.dayNumber,
      date: `Day ${d.dayNumber}`,
      theme: d.theme || 'Exploration',
      activities: (d.activities || []).map((a: any, idx: number) => ({
        id: `gen-act-${Date.now()}-${idx}`,
        time: a.time || '10:00',
        title: a.title || 'Sightseeing',
        category: a.category || 'sightseeing',
        locationName: destinationName,
        lat: 35.6762 + (Math.random() - 0.5) * 0.03,
        lng: 139.6503 + (Math.random() - 0.5) * 0.03,
        cost: a.cost || 0,
        notes: 'Synthesized by Gemini Travel Architect',
      })),
    }));

    setActiveTrip(prev => ({
      ...prev,
      title: title || prev.title,
      destination: destinationName || prev.destination,
      days: convertedDays,
    }));
    setActiveTab('planner');
  };

  const handleImportGeneratedPlan = (plan: GeneratedTripPlan) => {
    const convertedDays = plan.days.map(d => ({
      dayNumber: d.dayNumber,
      date: `Day ${d.dayNumber}`,
      theme: d.theme || 'Exploration',
      activities: (d.activities || []).map((a, idx) => ({
        id: `act-gen-${Date.now()}-${idx}`,
        time: a.time || '10:00',
        title: a.title,
        category: a.category as any,
        locationName: a.location || plan.destination,
        lat: a.lat || (plan.destCoords ? plan.destCoords.lat + (Math.random() - 0.5) * 0.02 : 35.6762),
        lng: a.lng || (plan.destCoords ? plan.destCoords.lng + (Math.random() - 0.5) * 0.02 : 139.6503),
        cost: a.cost || 0,
        notes: a.description || 'Curated by TripCheck AI',
        isCompleted: false,
      })),
    }));

    const newTrip: Trip = {
      id: `trip-gen-${Date.now()}`,
      title: plan.title,
      destination: plan.destination,
      country: plan.destination.split(',').pop()?.trim() || '',
      coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      startDate: '2026-11-01',
      endDate: `2026-11-${String(plan.durationDays).padStart(2, '0')}`,
      totalBudget: plan.budgetBreakdown.totalPerPerson * plan.travelers,
      currency: 'USD',
      travelers: plan.travelers,
      status: 'planning',
      days: convertedDays,
    };

    setActiveTrip(newTrip);
    setIsRouteGenOpen(false);
    setActiveTab('planner');
  };

  const handleVote = (cardId: string, direction: 'up' | 'down') => {
    setVotingCards(prev =>
      prev.map(c => {
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
          votesUp: direction === 'up' ? c.votesUp + 1 : (c.userVoted === 'up' ? c.votesUp - 1 : c.votesUp),
          votesDown: direction === 'down' ? c.votesDown + 1 : (c.userVoted === 'down' ? c.votesDown - 1 : c.votesDown),
          userVoted: direction,
        };
      })
    );
  };

  const handleAddVotingCard = (newCard: VotingCard) => {
    setVotingCards(prev => [newCard, ...prev]);
  };

  const handleAddExpense = (newExp: Expense) => {
    setExpenses(prev => [newExp, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAIArchitect={() => handleOpenAIWithDest()}
        destinations={destinations}
        onSelectDestination={dest => setSelectedDestination(dest)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TripCheck Route & Itinerary Generator Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-cyan-500/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">TripCheck Route & Itinerary Generator</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold">HIGH-RES 2D ROUTES</span>
              </div>
              <p className="text-xs text-slate-400">Where from? Where to? Get flights, trains, stays, food & full schedule in 1 click.</p>
            </div>
          </div>

          {/* Inputs & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-56">
              <PlaceAutocompleteInput
                id="quick-origin-input"
                iconType="origin"
                compact
                showCoordinatesBadge={false}
                value={quickOrigin}
                onChange={val => setQuickOrigin(val)}
                placeholder="From: city or airport..."
              />
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 hidden sm:block shrink-0 self-center" />

            <div className="w-full sm:w-56">
              <PlaceAutocompleteInput
                id="quick-dest-input"
                iconType="destination"
                compact
                showCoordinatesBadge={false}
                value={quickDestination}
                onChange={val => setQuickDestination(val)}
                placeholder="To: city, monument, village..."
              />
            </div>

            <button
              onClick={() => setIsRouteGenOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap self-stretch sm:self-center"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Generate Itinerary</span>
            </button>
          </div>
        </div>

        {/* Tab 1: High-Resolution 2D Global Route Explorer */}
        {activeTab === 'routes' && (
          <Global2DWorldExplorer
            destinations={destinations}
            onSelectDestination={dest => setSelectedDestination(dest)}
            onPlanTripTo={(cityName) => {
              setQuickDestination(cityName);
              setIsRouteGenOpen(true);
            }}
            userOrigin={quickOrigin}
          />
        )}

        {/* Tab 2: Netflix-Style Vibe Exploration */}
        {activeTab === 'netflix' && (
          <NetflixCarousels
            destinations={destinations}
            onSelectDestination={dest => setSelectedDestination(dest)}
            onOpenAIArchitect={handleOpenAIWithDest}
          />
        )}

        {/* Tab 3: Trip Itinerary & Map View */}
        {activeTab === 'planner' && (
          <TripPlannerView
            trip={activeTrip}
            onUpdateTrip={setActiveTrip}
            onOpenAIArchitect={handleOpenAIWithDest}
          />
        )}

        {/* Tab 4: Budget & Expenses */}
        {activeTab === 'budget' && (
          <BudgetTrackerView
            trip={activeTrip}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {/* Tab 5: Offline Survival & Emergency */}
        {activeTab === 'survival' && (
          <OfflineSurvivalView />
        )}

        {/* Tab 6: Group Voting Room */}
        {activeTab === 'voting' && (
          <VotingRoomView
            trip={activeTrip}
            cards={votingCards}
            onVote={handleVote}
            onAddCard={handleAddVotingCard}
          />
        )}
      </main>

      {/* Destination Modal */}
      <DestinationModal
        destination={selectedDestination}
        onClose={() => setSelectedDestination(null)}
        onPlanTrip={handlePlanTripFromDest}
        onGenerateAI={handleOpenAIWithDest}
      />

      {/* AI Travel Architect Modal */}
      <AIArchitectModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        destinationHint={aiDestinationHint}
        onImportPlanToTrip={handleImportPlanToTrip}
      />

      {/* Origin-to-Destination Route Itinerary Generator Modal */}
      <RouteItineraryGenerator
        isOpen={isRouteGenOpen}
        onClose={() => setIsRouteGenOpen(false)}
        onImportTrip={handleImportGeneratedPlan}
        defaultOrigin={quickOrigin}
        defaultDestination={quickDestination}
      />
    </div>
  );
}

export default App;
