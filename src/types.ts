export interface PlaceItem {
  id: string;
  name: string;
  label: string;
  city?: string;
  state?: string;
  country?: string;
  lat: number;
  lng: number;
  type: 'monument' | 'city' | 'town' | 'village' | 'attraction' | 'airport' | 'nature' | 'heritage' | 'general';
  categoryLabel?: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  category: 'Trending' | 'Alpine Escapes' | 'Neon Cyberpunk Cities' | 'Tropical Sanctuaries' | 'Cultural Heritage' | 'Nordic Wilderness';
  tagline: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  matchScore: number;
  estimatedBudgetPerDay: number;
  currency: string;
  bestSeason: string;
  visaRequirement: string;
  tags: string[];
  highlights: string[];
  weather: {
    temp: number;
    condition: string;
    icon: string;
    humidity: number;
  };
}

export interface ActivityItem {
  id: string;
  time: string;
  title: string;
  category: 'flight' | 'lodging' | 'sightseeing' | 'food' | 'transport' | 'leisure';
  locationName: string;
  lat?: number;
  lng?: number;
  cost: number;
  notes?: string;
  bookingRef?: string;
  isCompleted?: boolean;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  theme: string;
  activities: ActivityItem[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  country: string;
  coverImage: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  travelers: number;
  status: 'planning' | 'ongoing' | 'completed';
  days: ItineraryDay[];
}

export interface Expense {
  id: string;
  tripId: string;
  category: 'Flights' | 'Lodging' | 'Dining' | 'Activities' | 'Transit' | 'Misc';
  amount: number;
  currency: string;
  description: string;
  date: string;
  paidBy: string;
}

export interface PackingItem {
  id: string;
  category: 'Essentials' | 'Clothing' | 'Tech & Gear' | 'Medical' | 'Documents';
  name: string;
  checked: boolean;
  important?: boolean;
}

export interface VotingCard {
  id: string;
  tripId: string;
  title: string;
  type: 'Activity' | 'Dining' | 'Lodging';
  photo: string;
  description: string;
  costEst: number;
  votesUp: number;
  votesDown: number;
  userVoted?: 'up' | 'down';
}

export interface TransitOption {
  mode: 'flight' | 'train' | 'car' | 'bus';
  title: string;
  duration: string;
  estimatedCost: number;
  details: string;
  isRecommended?: boolean;
}

export interface HotelRecommendation {
  name: string;
  tier: 'Budget' | 'Boutique' | 'Luxury';
  pricePerNight: number;
  rating: number;
  location: string;
  perks: string[];
  image: string;
}

export interface FoodRecommendation {
  dishName: string;
  dishType: 'Street Food' | 'Local Delicacy' | 'Fine Dining' | 'Dessert';
  description: string;
  recommendedSpot: string;
  priceRange: string;
}

export interface GeneratedTripPlan {
  title: string;
  origin: string;
  originCoords: { lat: number; lng: number };
  destination: string;
  destCoords: { lat: number; lng: number };
  distanceKm: number;
  durationDays: number;
  travelers: number;
  groupType: 'Solo' | 'Couple' | 'Family' | 'Friends';
  budgetTier: 'Budget' | 'Moderate' | 'Luxury';
  vibe: string;
  summary: string;
  transitOptions: TransitOption[];
  days: {
    dayNumber: number;
    theme: string;
    activities: {
      time: string;
      title: string;
      category: string;
      location: string;
      cost: number;
      lat?: number;
      lng?: number;
      description?: string;
    }[];
  }[];
  hotels: HotelRecommendation[];
  foodGuide: FoodRecommendation[];
  weatherForecast: {
    avgTempC: number;
    condition: string;
    packingTip: string;
    bestTimeToVisit: string;
  };
  budgetBreakdown: {
    transport: number;
    accommodation: number;
    food: number;
    activities: number;
    buffer: number;
    totalPerPerson: number;
  };
  packingAdvice: string[];
  translations: {
    [key: string]: {
      languageName: string;
      greeting: string;
      summary: string;
    };
  };
}

export interface EmergencyInfo {
  country: string;
  police: string;
  ambulance: string;
  fire: string;
  emergencyGeneral: string;
  embassySupport: string;
  hospital: string;
  tip: string;
}
