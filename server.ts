import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store
const destinations = [
  {
    id: 'tokyo-japan',
    name: 'Tokyo',
    country: 'Japan',
    region: 'Asia',
    category: 'Neon Cyberpunk Cities',
    tagline: 'Where ancient shrines meet neon-drenched sky-scrapers',
    description: 'An electric metropolis where centuries-old traditions fuse seamlessly with futuristic technology, Michelin-starred culinary artistry, and vibrant subcultures.',
    heroImage: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 35.6762,
    lng: 139.6503,
    rating: 4.95,
    reviewsCount: 1420,
    matchScore: 98,
    estimatedBudgetPerDay: 180,
    currency: 'JPY',
    bestSeason: 'March – May & Sept – Nov',
    visaRequirement: 'Visa-free for 90 days (68+ countries)',
    tags: ['Cyberpunk', 'Culinary', 'Culture', 'High-Speed Rail'],
    highlights: ['Shibuya Crossing & Sky Observatory', 'TeamLab Planets Immersive Art', 'Tsukiji Outer Market Tasting Tour'],
    weather: { temp: 18, condition: 'Clear', icon: 'Sun', humidity: 52 },
  },
  {
    id: 'reykjavik-iceland',
    name: 'Reykjavík & The Highlands',
    country: 'Iceland',
    region: 'Europe',
    category: 'Nordic Wilderness',
    tagline: 'Land of fire, emerald aurora glaciers, and geothermal springs',
    description: 'Venture into primeval volcanic landscapes, cascading basalt waterfalls, crystalline ice caves, and unwind in world-renowned thermal lagoons under the Northern Lights.',
    heroImage: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 64.1466,
    lng: -21.9426,
    rating: 4.92,
    reviewsCount: 980,
    matchScore: 96,
    estimatedBudgetPerDay: 260,
    currency: 'ISK',
    bestSeason: 'Sept – March (Aurora) or June – Aug (Midnight Sun)',
    visaRequirement: 'Schengen Visa regulations apply',
    tags: ['Aurora', 'Hot Springs', 'Glaciers', 'Adventure'],
    highlights: ['Blue Lagoon & Sky Lagoon Geothermal Spa', 'Golden Circle Geysir & Gullfoss', 'Katla Glacier Ice Cave Expedition'],
    weather: { temp: 4, condition: 'Chilly & Clear', icon: 'CloudSnow', humidity: 78 },
  },
  {
    id: 'bali-indonesia',
    name: 'Bali & Nusa Penida',
    country: 'Indonesia',
    region: 'Southeast Asia',
    category: 'Tropical Sanctuaries',
    tagline: 'Emerald rice terraces, spiritual water temples & oceanic cliffs',
    description: 'An island paradise teeming with spiritual serenity in Ubud, dramatic coastal surf breaks in Uluwatu, and secluded turquoise coves in Nusa Penida.',
    heroImage: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
    ],
    lat: -8.4095,
    lng: 115.1889,
    rating: 4.88,
    reviewsCount: 2310,
    matchScore: 95,
    estimatedBudgetPerDay: 75,
    currency: 'IDR',
    bestSeason: 'April – October (Dry Season)',
    visaRequirement: 'Visa on Arrival (VoA) 30 days',
    tags: ['Tropical', 'Wellness', 'Surfing', 'Temples'],
    highlights: ['Tegallalang Sacred Rice Terraces', 'Uluwatu Sunset Fire Dance', 'Kelingking T-Rex Beach Viewpoint'],
    weather: { temp: 29, condition: 'Tropical Warmth', icon: 'Sun', humidity: 75 },
  },
  {
    id: 'zermatt-switzerland',
    name: 'Zermatt & The Matterhorn',
    country: 'Switzerland',
    region: 'Europe',
    category: 'Alpine Escapes',
    tagline: 'Iconic pyramidal alpine peaks, pristine powder & luxury chalets',
    description: 'A car-free alpine wonderland at the foot of the legendary Matterhorn peak, featuring the highest cable car in Europe and pristine glacier ski routes.',
    heroImage: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 45.9765,
    lng: 7.7491,
    rating: 4.96,
    reviewsCount: 840,
    matchScore: 94,
    estimatedBudgetPerDay: 320,
    currency: 'CHF',
    bestSeason: 'Dec – April (Skiing) or July – Sept (Hiking)',
    visaRequirement: 'Schengen Visa regulations apply',
    tags: ['Alpine', 'Skiing', 'Luxury', 'Scenic Trains'],
    highlights: ['Gornergrat Cogwheel Railway', 'Matterhorn Glacier Paradise 3,883m', 'Five Lakes Alpine Hike (5-Seenweg)'],
    weather: { temp: 2, condition: 'Snowy Peak', icon: 'CloudSnow', humidity: 65 },
  },
  {
    id: 'cairo-egypt',
    name: 'Cairo & Giza',
    country: 'Egypt',
    region: 'Middle East & Africa',
    category: 'Cultural Heritage',
    tagline: 'Colossal ancient wonders, Nile feluccas & bustling bazaars',
    description: 'Immerse in the timeless cradle of civilization with the Great Pyramids of Giza, the newly opened Grand Egyptian Museum, and twilight cruises on the Nile.',
    heroImage: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 30.0444,
    lng: 31.2357,
    rating: 4.79,
    reviewsCount: 1650,
    matchScore: 91,
    estimatedBudgetPerDay: 85,
    currency: 'EGP',
    bestSeason: 'October – April (Mild weather)',
    visaRequirement: 'e-Visa available online (30 days)',
    tags: ['History', 'Pyramids', 'Nile Cruise', 'Archaeology'],
    highlights: ['Great Pyramid of Khufu & Sphinx', 'Grand Egyptian Museum (GEM)', 'Khan el-Khalili 14th-century Bazaar'],
    weather: { temp: 26, condition: 'Sunny & Warm', icon: 'Sun', humidity: 38 },
  },
  {
    id: 'banff-canada',
    name: 'Banff & Lake Louise',
    country: 'Canada',
    region: 'North America',
    category: 'Alpine Escapes',
    tagline: 'Electric turquoise glacial lakes framed by the Canadian Rockies',
    description: 'Surreal glacier-fed turquoise waters, towering pine forests, thermal springs, and scenic wildlife sightings along the world-famous Icefields Parkway.',
    heroImage: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 51.1784,
    lng: -115.5708,
    rating: 4.93,
    reviewsCount: 1120,
    matchScore: 97,
    estimatedBudgetPerDay: 210,
    currency: 'CAD',
    bestSeason: 'June – Sept (Lakes) or Dec – March (Skiing)',
    visaRequirement: 'eTA required for visa-exempt foreign nationals',
    tags: ['Glacial Lakes', 'Hiking', 'Canoeing', 'Wildlife'],
    highlights: ['Moraine Lake & Lake Louise Canoeing', 'Peyto Lake Wolf-Shaped Panorama', 'Banff Upper Hot Springs Soak'],
    weather: { temp: 12, condition: 'Crisp & Sunny', icon: 'Sun', humidity: 45 },
  },
  {
    id: 'amalfi-italy',
    name: 'Amalfi Coast & Positano',
    country: 'Italy',
    region: 'Europe',
    category: 'Trending',
    tagline: 'Pastel cliffside villas cascading into the azure Tyrrhenian Sea',
    description: 'Dramatic vertical cliffs dressed in pastel villas, fragrant lemon groves, cliffside trattorias, and yacht cruises navigating the crystalline waters of Capri.',
    heroImage: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1600&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    ],
    lat: 40.634,
    lng: 14.6027,
    rating: 4.91,
    reviewsCount: 1890,
    matchScore: 99,
    estimatedBudgetPerDay: 290,
    currency: 'EUR',
    bestSeason: 'May – June & September (Avoid peak August)',
    visaRequirement: 'Schengen Visa regulations apply',
    tags: ['Coastal', 'Romance', 'Fine Dining', 'Scenic Drive'],
    highlights: ['Path of the Gods (Sentiero degli Dei)', 'Private Speedboat to Capri Blue Grotto', 'Sunset Limoncello in Positano'],
    weather: { temp: 24, condition: 'Mediterranean Breeze', icon: 'Sun', humidity: 60 },
  },
];

// Curated instant database of top global monuments, heritage landmarks, and cities
interface PlaceRecord {
  id: string;
  name: string;
  label: string;
  city?: string;
  state?: string;
  country: string;
  lat: number;
  lng: number;
  type: 'monument' | 'city' | 'town' | 'village' | 'attraction' | 'airport' | 'nature' | 'heritage' | 'general';
  categoryLabel?: string;
}

const CURATED_GLOBAL_PLACES: PlaceRecord[] = [
  // Iconic World Monuments & Heritage
  { id: 'taj-mahal', name: 'Taj Mahal', label: 'Taj Mahal, Agra, Uttar Pradesh, India', city: 'Agra', state: 'Uttar Pradesh', country: 'India', lat: 27.1750, lng: 78.0421, type: 'monument', categoryLabel: 'UNESCO World Heritage' },
  { id: 'eiffel-tower', name: 'Eiffel Tower', label: 'Eiffel Tower, Paris, Île-de-France, France', city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8584, lng: 2.2945, type: 'monument', categoryLabel: 'Iconic Wonder' },
  { id: 'colosseum', name: 'Colosseum', label: 'Colosseum, Rome, Lazio, Italy', city: 'Rome', state: 'Lazio', country: 'Italy', lat: 41.8902, lng: 12.4922, type: 'monument', categoryLabel: 'Ancient Roman Monument' },
  { id: 'machu-picchu', name: 'Machu Picchu', label: 'Machu Picchu, Cusco, Peru', city: 'Aguas Calientes', state: 'Cusco', country: 'Peru', lat: -13.1631, lng: -72.5450, type: 'monument', categoryLabel: 'Incan Citadel Wonder' },
  { id: 'statue-of-liberty', name: 'Statue of Liberty', label: 'Statue of Liberty, New York, USA', city: 'New York', state: 'New York', country: 'USA', lat: 40.6892, lng: -74.0445, type: 'monument', categoryLabel: 'National Monument' },
  { id: 'great-pyramids', name: 'Pyramids of Giza', label: 'Great Pyramids of Giza, Cairo, Egypt', city: 'Giza', state: 'Cairo', country: 'Egypt', lat: 29.9792, lng: 31.1342, type: 'monument', categoryLabel: 'Ancient Wonder' },
  { id: 'burj-khalifa', name: 'Burj Khalifa', label: 'Burj Khalifa, Downtown Dubai, UAE', city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', lat: 25.1972, lng: 55.2744, type: 'monument', categoryLabel: 'Modern Megatall Wonder' },
  { id: 'angkor-wat', name: 'Angkor Wat', label: 'Angkor Wat, Siem Reap, Cambodia', city: 'Siem Reap', state: 'Siem Reap', country: 'Cambodia', lat: 13.4125, lng: 103.8670, type: 'monument', categoryLabel: 'UNESCO Temple Complex' },
  { id: 'sagrada-familia', name: 'Sagrada Família', label: 'Sagrada Família, Barcelona, Catalonia, Spain', city: 'Barcelona', state: 'Catalonia', country: 'Spain', lat: 41.4036, lng: 2.1744, type: 'monument', categoryLabel: 'Gaudí Architectural Masterpiece' },
  { id: 'great-wall', name: 'Great Wall of China', label: 'Great Wall of China (Badaling), Beijing, China', city: 'Beijing', state: 'Beijing', country: 'China', lat: 40.3584, lng: 116.0156, type: 'monument', categoryLabel: 'Historic Wall Wonder' },
  { id: 'petra-jordan', name: 'Petra Treasury (Al-Khazneh)', label: 'Petra, Ma\'an Governorate, Jordan', city: 'Wadi Musa', state: 'Ma\'an', country: 'Jordan', lat: 30.3285, lng: 35.4444, type: 'monument', categoryLabel: 'Rose City Wonder' },
  { id: 'hawa-mahal', name: 'Hawa Mahal', label: 'Hawa Mahal, Jaipur, Rajasthan, India', city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9239, lng: 75.8267, type: 'monument', categoryLabel: 'Palace of Winds' },
  { id: 'red-fort', name: 'Red Fort (Lal Qila)', label: 'Red Fort, Old Delhi, Delhi, India', city: 'Delhi', state: 'Delhi', country: 'India', lat: 28.6562, lng: 77.2410, type: 'monument', categoryLabel: 'Mughal Fortress' },
  { id: 'qutub-minar', name: 'Qutub Minar', label: 'Qutub Minar, Mehrauli, New Delhi, India', city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.5245, lng: 77.1855, type: 'monument', categoryLabel: 'UNESCO Victory Minaret' },
  { id: 'golden-temple', name: 'Golden Temple (Harmandir Sahib)', label: 'Golden Temple, Amritsar, Punjab, India', city: 'Amritsar', state: 'Punjab', country: 'India', lat: 31.6200, lng: 74.8765, type: 'monument', categoryLabel: 'Spiritual Sanctum' },
  { id: 'kedarnath', name: 'Kedarnath Temple', label: 'Kedarnath, Rudraprayag, Uttarakhand, India', city: 'Kedarnath', state: 'Uttarakhand', country: 'India', lat: 30.7346, lng: 79.0669, type: 'monument', categoryLabel: 'Himalayan Shrine' },
  { id: 'badrinath', name: 'Badrinath Temple', label: 'Badrinath, Chamoli, Uttarakhand, India', city: 'Badrinath', state: 'Uttarakhand', country: 'India', lat: 30.7433, lng: 79.4938, type: 'monument', categoryLabel: 'Himalayan Pilgrimage' },
  { id: 'ayodhya-ram-mandir', name: 'Ram Mandir Ayodhya', label: 'Shri Ram Janmabhoomi Mandir, Ayodhya, Uttar Pradesh, India', city: 'Ayodhya', state: 'Uttar Pradesh', country: 'India', lat: 26.7922, lng: 82.1998, type: 'monument', categoryLabel: 'Historic Sacred Temple' },
  { id: 'kashi-vishwanath', name: 'Kashi Vishwanath Temple', label: 'Kashi Vishwanath, Varanasi, Uttar Pradesh, India', city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', lat: 25.3109, lng: 83.0107, type: 'monument', categoryLabel: 'Ghats & Jyotirlinga' },
  { id: 'meenakshi-temple', name: 'Meenakshi Amman Temple', label: 'Meenakshi Temple, Madurai, Tamil Nadu, India', city: 'Madurai', state: 'Tamil Nadu', country: 'India', lat: 9.9195, lng: 78.1193, type: 'monument', categoryLabel: 'Dravidian Architecture' },
  { id: 'konark-sun-temple', name: 'Konark Sun Temple', label: 'Konark Sun Temple, Puri, Odisha, India', city: 'Konark', state: 'Odisha', country: 'India', lat: 19.8876, lng: 86.0945, type: 'monument', categoryLabel: 'UNESCO Sun Chariot' },
  { id: 'gateway-of-india', name: 'Gateway of India', label: 'Gateway of India, Colaba, Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 18.9220, lng: 72.8347, type: 'monument', categoryLabel: 'Colonial Arch Landmark' },
  { id: 'india-gate', name: 'India Gate', label: 'India Gate, Rajpath, New Delhi, India', city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6129, lng: 77.2295, type: 'monument', categoryLabel: 'National War Memorial' },
  { id: 'charminar', name: 'Charminar', label: 'Charminar, Old City, Hyderabad, Telangana, India', city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3616, lng: 78.4747, type: 'monument', categoryLabel: 'Four Minarets Monument' },
  { id: 'victoria-memorial', name: 'Victoria Memorial', label: 'Victoria Memorial, Kolkata, West Bengal, India', city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5448, lng: 88.3426, type: 'monument', categoryLabel: 'Marble Palace Landmark' },
  { id: 'ajanta-caves', name: 'Ajanta Caves', label: 'Ajanta Caves, Aurangabad/Chhatrapati Sambhajinagar, Maharashtra, India', city: 'Aurangabad', state: 'Maharashtra', country: 'India', lat: 20.5519, lng: 75.7033, type: 'monument', categoryLabel: 'Rock-Cut Cave Paintings' },
  { id: 'ellora-caves', name: 'Kailasa Temple (Ellora Caves)', label: 'Kailasa Temple, Ellora, Maharashtra, India', city: 'Ellora', state: 'Maharashtra', country: 'India', lat: 20.0238, lng: 75.1793, type: 'monument', categoryLabel: 'Monolithic Rock Temple' },
  { id: 'khajuraho-temples', name: 'Khajuraho Temples', label: 'Khajuraho Group of Monuments, Chhatarpur, Madhya Pradesh, India', city: 'Khajuraho', state: 'Madhya Pradesh', country: 'India', lat: 24.8515, lng: 79.9214, type: 'monument', categoryLabel: 'UNESCO Nagara Architecture' },
  { id: 'statue-of-unity', name: 'Statue of Unity', label: 'Statue of Unity, Kevadia, Gujarat, India', city: 'Kevadia', state: 'Gujarat', country: 'India', lat: 21.8380, lng: 73.7191, type: 'monument', categoryLabel: 'World Tallest Statue' },
  { id: 'city-palace-udaipur', name: 'City Palace Udaipur', label: 'City Palace, Lake Pichola, Udaipur, Rajasthan, India', city: 'Udaipur', state: 'Rajasthan', country: 'India', lat: 24.5764, lng: 73.6835, type: 'monument', categoryLabel: 'Lakeside Royal Palace' },
  { id: 'jaisalmer-fort', name: 'Jaisalmer Fort (Sonar Qila)', label: 'Jaisalmer Fort, Thar Desert, Rajasthan, India', city: 'Jaisalmer', state: 'Rajasthan', country: 'India', lat: 26.9124, lng: 70.9126, type: 'monument', categoryLabel: 'Golden Living Fort' },
  { id: 'mount-fuji', name: 'Mount Fuji', label: 'Mount Fuji, Honshu, Japan', city: 'Fujinomiya', state: 'Shizuoka', country: 'Japan', lat: 35.3606, lng: 138.7274, type: 'nature', categoryLabel: 'Sacred Volcanic Peak' },
  { id: 'fushimi-inari', name: 'Fushimi Inari Taisha', label: 'Fushimi Inari Shrine, Kyoto, Japan', city: 'Kyoto', state: 'Kansai', country: 'Japan', lat: 34.9671, lng: 135.7727, type: 'monument', categoryLabel: '10,000 Torii Gates Shrine' },
  { id: 'kinkaku-ji', name: 'Kinkaku-ji (Golden Pavilion)', label: 'Kinkaku-ji, Kyoto, Japan', city: 'Kyoto', state: 'Kansai', country: 'Japan', lat: 35.0394, lng: 135.7292, type: 'monument', categoryLabel: 'Zen Temple Wonder' },
  { id: 'big-ben', name: 'Big Ben & Elizabeth Tower', label: 'Big Ben, Westminster, London, UK', city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5007, lng: -0.1246, type: 'monument', categoryLabel: 'Historic Clock Tower' },
  { id: 'louvre-museum', name: 'Louvre Museum', label: 'Louvre Museum, Paris, France', city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8606, lng: 2.3376, type: 'attraction', categoryLabel: 'World Premier Art Museum' },
  { id: 'acropolis-athens', name: 'Acropolis of Athens (Parthenon)', label: 'Acropolis, Athens, Attica, Greece', city: 'Athens', state: 'Attica', country: 'Greece', lat: 37.9715, lng: 23.7257, type: 'monument', categoryLabel: 'Ancient Greek Citadel' },
  { id: 'sydney-opera-house', name: 'Sydney Opera House', label: 'Sydney Opera House, Sydney, NSW, Australia', city: 'Sydney', state: 'New South Wales', country: 'Australia', lat: -33.8568, lng: 151.2153, type: 'monument', categoryLabel: 'Architectural Icon' },
  { id: 'christ-redeemer', name: 'Christ the Redeemer', label: 'Christ the Redeemer, Rio de Janeiro, Brazil', city: 'Rio de Janeiro', state: 'Rio de Janeiro', country: 'Brazil', lat: -22.9519, lng: -43.2105, type: 'monument', categoryLabel: 'Art Deco Wonder' },

  // Key Global Cities & Hill Stations
  { id: 'city-delhi', name: 'New Delhi', label: 'New Delhi, Delhi, India', city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090, type: 'city', categoryLabel: 'Capital Territory' },
  { id: 'city-mumbai', name: 'Mumbai', label: 'Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777, type: 'city', categoryLabel: 'Financial Capital & Coast' },
  { id: 'city-bengaluru', name: 'Bengaluru (Bangalore)', label: 'Bengaluru, Karnataka, India', city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946, type: 'city', categoryLabel: 'Silicon Valley of India' },
  { id: 'city-jaipur', name: 'Jaipur', label: 'Jaipur, Rajasthan, India', city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9124, lng: 75.7873, type: 'city', categoryLabel: 'The Pink City' },
  { id: 'city-udaipur', name: 'Udaipur', label: 'Udaipur, Rajasthan, India', city: 'Udaipur', state: 'Rajasthan', country: 'India', lat: 24.5854, lng: 73.7125, type: 'city', categoryLabel: 'City of Lakes' },
  { id: 'city-manali', name: 'Manali', label: 'Manali, Kullu, Himachal Pradesh, India', city: 'Manali', state: 'Himachal Pradesh', country: 'India', lat: 32.2432, lng: 77.1892, type: 'town', categoryLabel: 'Himalayan Adventure Resort' },
  { id: 'city-shimla', name: 'Shimla', label: 'Shimla, Himachal Pradesh, India', city: 'Shimla', state: 'Himachal Pradesh', country: 'India', lat: 31.1048, lng: 77.1734, type: 'city', categoryLabel: 'Queen of Hills' },
  { id: 'city-rishikesh', name: 'Rishikesh', label: 'Rishikesh, Dehradun, Uttarakhand, India', city: 'Rishikesh', state: 'Uttarakhand', country: 'India', lat: 30.0869, lng: 78.2676, type: 'town', categoryLabel: 'Yoga & Ganga Rafting' },
  { id: 'city-goa', name: 'Goa (Panaji)', label: 'Panaji, North Goa, Goa, India', city: 'Panaji', state: 'Goa', country: 'India', lat: 15.4909, lng: 73.8278, type: 'city', categoryLabel: 'Coastal Beach Paradise' },
  { id: 'city-varanasi', name: 'Varanasi', label: 'Varanasi, Uttar Pradesh, India', city: 'Varanasi', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lng: 82.9739, type: 'city', categoryLabel: 'Spiritual City of Ghats' },
  { id: 'city-tokyo', name: 'Tokyo', label: 'Tokyo, Kantō, Japan', city: 'Tokyo', state: 'Kantō', country: 'Japan', lat: 35.6762, lng: 139.6503, type: 'city', categoryLabel: 'Metropolis of the Future' },
  { id: 'city-kyoto', name: 'Kyoto', label: 'Kyoto, Kansai, Japan', city: 'Kyoto', state: 'Kansai', country: 'Japan', lat: 35.0116, lng: 135.7681, type: 'city', categoryLabel: 'Ancient Imperial Capital' },
  { id: 'city-paris', name: 'Paris', label: 'Paris, Île-de-France, France', city: 'Paris', state: 'Île-de-France', country: 'France', lat: 48.8566, lng: 2.3522, type: 'city', categoryLabel: 'City of Light' },
  { id: 'city-london', name: 'London', label: 'London, England, United Kingdom', city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, type: 'city', categoryLabel: 'Historic Global Hub' },
  { id: 'city-rome', name: 'Rome', label: 'Rome, Lazio, Italy', city: 'Rome', state: 'Lazio', country: 'Italy', lat: 41.9028, lng: 12.4964, type: 'city', categoryLabel: 'The Eternal City' },
  { id: 'city-dubai', name: 'Dubai', label: 'Dubai, United Arab Emirates', city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, type: 'city', categoryLabel: 'Futuristic Desert Oasis' },
  { id: 'city-singapore', name: 'Singapore', label: 'Singapore, Singapore', city: 'Singapore', state: 'Central', country: 'Singapore', lat: 1.3521, lng: 103.8198, type: 'city', categoryLabel: 'Garden City State' },
  { id: 'city-bangkok', name: 'Bangkok', label: 'Bangkok, Thailand', city: 'Bangkok', state: 'Central', country: 'Thailand', lat: 13.7563, lng: 100.5018, type: 'city', categoryLabel: 'Golden Temples & Nightlife' },
  { id: 'city-bali', name: 'Bali (Denpasar/Ubud)', label: 'Ubud, Bali, Indonesia', city: 'Ubud', state: 'Bali', country: 'Indonesia', lat: -8.5069, lng: 115.2625, type: 'nature', categoryLabel: 'Island of the Gods' },
  { id: 'city-newyork', name: 'New York City', label: 'New York City, New York, USA', city: 'New York', state: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, type: 'city', categoryLabel: 'The Big Apple' },
  { id: 'city-zurich', name: 'Zurich', label: 'Zurich, Switzerland', city: 'Zurich', state: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, type: 'city', categoryLabel: 'Alpine Financial Capital' },
  { id: 'city-zermatt', name: 'Zermatt', label: 'Zermatt (Matterhorn), Valais, Switzerland', city: 'Zermatt', state: 'Valais', country: 'Switzerland', lat: 45.9765, lng: 7.7491, type: 'town', categoryLabel: 'Matterhorn Alpine Village' },
  { id: 'city-banff', name: 'Banff', label: 'Banff, Alberta, Canada', city: 'Banff', state: 'Alberta', country: 'Canada', lat: 51.1784, lng: -115.5708, type: 'town', categoryLabel: 'Rocky Mountain National Park' },
  { id: 'city-reykjavik', name: 'Reykjavík', label: 'Reykjavík, Capital Region, Iceland', city: 'Reykjavík', state: 'Capital Region', country: 'Iceland', lat: 64.1466, lng: -21.9426, type: 'city', categoryLabel: 'Northern Lights Gateway' },
  { id: 'city-pokhara', name: 'Pokhara', label: 'Pokhara, Gandaki Province, Nepal', city: 'Pokhara', state: 'Gandaki', country: 'Nepal', lat: 28.2096, lng: 83.9856, type: 'city', categoryLabel: 'Annapurna Himalayan Gateway' },
  { id: 'city-kathmandu', name: 'Kathmandu', label: 'Kathmandu, Bagmati Province, Nepal', city: 'Kathmandu', state: 'Bagmati', country: 'Nepal', lat: 27.7172, lng: 85.3240, type: 'city', categoryLabel: 'Historic Himalayan Capital' },
];

// In-memory cache for live Photon geocoding searches
const placeSearchCache = new Map<string, PlaceRecord[]>();

// Universal place resolver using OpenStreetMap Photon API + Curated DB
async function searchPlacesGlobal(query: string): Promise<PlaceRecord[]> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) {
    return CURATED_GLOBAL_PLACES.slice(0, 10);
  }

  const cacheKey = cleanQ.toLowerCase();
  if (placeSearchCache.has(cacheKey)) {
    return placeSearchCache.get(cacheKey)!;
  }

  // 1. Check curated instant list
  const localMatches = CURATED_GLOBAL_PLACES.filter(p => {
    const hay = `${p.name} ${p.label} ${p.city || ''} ${p.country}`.toLowerCase();
    return hay.includes(cacheKey);
  });

  // 2. Query Photon OpenStreetMap API (covers every country, small city, village, and monument)
  let liveResults: PlaceRecord[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2600);

    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=10`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const features = data.features || [];

      liveResults = features.map((f: any, idx: number) => {
        const props = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0]; // [lng, lat]
        const lng = Number(coords[0]);
        const lat = Number(coords[1]);

        const name = props.name || props.city || props.street || cleanQ;
        const city = props.city || props.town || props.village || props.county || '';
        const state = props.state || '';
        const country = props.country || '';

        // Determine place type
        const osmKey = props.osm_key || '';
        const osmVal = props.osm_value || '';
        let type: PlaceRecord['type'] = 'city';
        let categoryLabel = 'City';

        if (
          osmKey === 'tourism' ||
          osmKey === 'historic' ||
          osmVal === 'monument' ||
          osmVal === 'attraction' ||
          osmVal === 'castle' ||
          osmVal === 'memorial' ||
          osmVal === 'ruins' ||
          osmVal === 'archaeological_site' ||
          osmVal === 'place_of_worship'
        ) {
          type = 'monument';
          categoryLabel = 'Monument / Heritage Landmark';
        } else if (osmVal === 'aerodrome' || osmKey === 'aeroway' || osmVal === 'airport') {
          type = 'airport';
          categoryLabel = 'Airport / Transit Hub';
        } else if (osmVal === 'town') {
          type = 'town';
          categoryLabel = 'Town';
        } else if (osmVal === 'village' || osmVal === 'hamlet') {
          type = 'village';
          categoryLabel = 'Village';
        } else if (osmVal === 'peak' || osmKey === 'natural' || osmVal === 'lake' || osmVal === 'beach') {
          type = 'nature';
          categoryLabel = 'Nature & Landscape';
        }

        // Build clean readable label
        const parts = [name];
        if (city && city.toLowerCase() !== name.toLowerCase()) parts.push(city);
        if (state && state.toLowerCase() !== city.toLowerCase()) parts.push(state);
        if (country) parts.push(country);
        const label = parts.join(', ');

        return {
          id: `photon-${props.osm_id || idx}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name,
          label,
          city,
          state,
          country,
          lat,
          lng,
          type,
          categoryLabel,
        };
      });
    }
  } catch (err) {
    // If external query times out, use local matches
  }

  // Combine and deduplicate
  const combined: PlaceRecord[] = [];
  const seenKeys = new Set<string>();

  // Prioritize exact/high-match local curated items first
  for (const item of localMatches) {
    const key = `${item.lat.toFixed(2)},${item.lng.toFixed(2)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  }

  // Add live OSM features
  for (const item of liveResults) {
    const key = `${item.lat.toFixed(2)},${item.lng.toFixed(2)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  }

  // Cache results (max 200 items in cache)
  if (placeSearchCache.size > 200) {
    placeSearchCache.clear();
  }
  placeSearchCache.set(cacheKey, combined.slice(0, 10));

  return combined.slice(0, 10);
}

// Accurate coordinate resolution for any city or monument
async function resolveCoords(
  name: string,
  clientCoords?: { lat?: number; lng?: number }
): Promise<{ lat: number; lng: number }> {
  // If user or autocomplete passed verified coordinates, use them directly
  if (
    clientCoords &&
    typeof clientCoords.lat === 'number' &&
    typeof clientCoords.lng === 'number' &&
    !isNaN(clientCoords.lat) &&
    !isNaN(clientCoords.lng) &&
    (clientCoords.lat !== 0 || clientCoords.lng !== 0)
  ) {
    return { lat: clientCoords.lat, lng: clientCoords.lng };
  }

  const clean = (name || '').trim();
  if (!clean) return { lat: 28.6139, lng: 77.2090 };

  // Check curated places
  const lower = clean.toLowerCase();
  const curated = CURATED_GLOBAL_PLACES.find(
    p =>
      p.name.toLowerCase() === lower ||
      p.label.toLowerCase().includes(lower) ||
      lower.includes(p.name.toLowerCase())
  );
  if (curated) {
    return { lat: curated.lat, lng: curated.lng };
  }

  // Check Photon global search
  try {
    const results = await searchPlacesGlobal(clean);
    if (results.length > 0 && results[0].lat && results[0].lng) {
      return { lat: results[0].lat, lng: results[0].lng };
    }
  } catch (err) {
    // fallback below
  }

  // Default coordinate calculation if all lookups fail
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  const lat = 20 + ((Math.abs(hash) % 4000) / 100) - 20;
  const lng = 50 + ((Math.abs(hash * 3) % 12000) / 100) - 60;
  return { lat, lng };
}

function calculateDistanceKm(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TripCheck AI Route & Itinerary Engine', timestamp: new Date().toISOString() });
});

// Autocomplete endpoint for any global city, town, village, or monument
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    const query = String(req.query.q || '');
    const places = await searchPlacesGlobal(query);
    res.json({ success: true, places });
  } catch (err: any) {
    res.json({ success: true, places: CURATED_GLOBAL_PLACES.slice(0, 8) });
  }
});

// Destinations list
app.get('/api/destinations', (req, res) => {
  res.json(destinations);
});

// AI Travel Architect (Gemini 3.8 Flash + Comprehensive Route & Itinerary Generator)
app.post('/api/ai/plan', async (req, res) => {
  const {
    origin = '',
    destination = '',
    days = 5,
    travelers = 2,
    groupType = 'Couple',
    budget = 'Moderate',
    budgetTier = 'Moderate',
    vibe = 'Culture & Gastronomy',
  } = req.body;

  const cleanOrigin = (origin || '').trim() || 'New Delhi, India';
  const cleanDestination = (destination || '').trim() || 'Agra, India';

  const originCoords = await resolveCoords(cleanOrigin, req.body.originCoords);
  const destCoords = await resolveCoords(cleanDestination, req.body.destCoords);
  const distanceKm = calculateDistanceKm(originCoords, destCoords);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = `You are an elite travel architect like TripCheck.
Create a comprehensive, personalized travel itinerary and route guide.
Origin (Leaving from): "${cleanOrigin}" (lat: ${originCoords.lat}, lng: ${originCoords.lng})
Destination (Going to): "${cleanDestination}" (lat: ${destCoords.lat}, lng: ${destCoords.lng})
Estimated distance: ${distanceKm} km
Trip duration: ${days} days
Travelers: ${travelers} (${groupType})
Budget tier: "${budgetTier || budget}"
Vibe: "${vibe}"

CRITICAL MAPPING INSTRUCTION:
The destination is located exactly at latitude: ${destCoords.lat}, longitude: ${destCoords.lng}.
For every activity in the "days" array, you MUST provide precise and realistic "lat" (number) and "lng" (number) coordinates within 0.01 to 0.05 degrees of ${destCoords.lat}, ${destCoords.lng} representing the actual spots, monuments, viewpoints, and restaurants in ${cleanDestination}.

Respond ONLY with pure valid JSON in this exact structure without markdown or backticks:
{
  "title": "${days}-Day ${cleanDestination} Journey from ${cleanOrigin}",
  "origin": "${cleanOrigin}",
  "destination": "${cleanDestination}",
  "distanceKm": ${distanceKm},
  "durationDays": ${days},
  "travelers": ${travelers},
  "groupType": "${groupType}",
  "budgetTier": "${budgetTier || budget}",
  "vibe": "${vibe}",
  "summary": "Captivating 2-3 sentences describing this specific journey from ${cleanOrigin} to ${cleanDestination}.",
  "transitOptions": [
    {
      "mode": "flight",
      "title": "Commercial Airline Flight or Transit",
      "duration": "Duration e.g. 2h 45m",
      "estimatedCost": 120,
      "details": "Major airlines, terminal & luggage guidelines",
      "isRecommended": true
    },
    {
      "mode": "train",
      "title": "High-Speed Rail / Express Train",
      "duration": "Duration e.g. 4h 15m or N/A",
      "estimatedCost": 45,
      "details": "Comfortable reserved coach or scenic rail route"
    },
    {
      "mode": "car",
      "title": "Road Highway / Cab / Self-Drive",
      "duration": "Duration e.g. 3h 30m drive",
      "estimatedCost": 60,
      "details": "Scenic highway drive with highway stops"
    }
  ],
  "days": [
    {
      "dayNumber": 1,
      "theme": "Arrival & Atmosphere",
      "activities": [
        { "time": "09:30", "title": "Morning Exploration", "category": "sightseeing", "location": "Historic Landmark", "cost": 20, "lat": ${destCoords.lat}, "lng": ${destCoords.lng}, "description": "Details about morning visit" },
        { "time": "13:00", "title": "Authentic Regional Lunch", "category": "food", "location": "Famous Quarter", "cost": 30, "lat": ${destCoords.lat + 0.005}, "lng": ${destCoords.lng + 0.005}, "description": "Signature dining spot" },
        { "time": "16:00", "title": "Afternoon Landmark", "category": "sightseeing", "location": "Heritage Monument", "cost": 15, "lat": ${destCoords.lat - 0.004}, "lng": ${destCoords.lng + 0.004}, "description": "Immersive highlight" },
        { "time": "19:30", "title": "Evening Dinner & Nightfall Vibe", "category": "food", "location": "Waterfront or Promenade", "cost": 45, "lat": ${destCoords.lat + 0.002}, "lng": ${destCoords.lng - 0.006}, "description": "Atmospheric evening" }
      ]
    }
  ],
  "hotels": [
    { "name": "Cozy Central Hostel/Inn", "tier": "Budget", "pricePerNight": 45, "rating": 4.6, "location": "Central area", "perks": ["Free Wi-Fi", "Walkable to metro", "Breakfast included"], "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80" },
    { "name": "Heritage Boutique Hotel", "tier": "Boutique", "pricePerNight": 140, "rating": 4.85, "location": "Historic Quarter", "perks": ["Rooftop view", "Artisan breakfast", "Concierge"], "image": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80" },
    { "name": "Grand Panorama Luxury Resort", "tier": "Luxury", "pricePerNight": 320, "rating": 4.96, "location": "Prime District", "perks": ["Infinity pool & Spa", "Michelin dining", "Chauffeur transfer"], "image": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80" }
  ],
  "foodGuide": [
    { "dishName": "Iconic Local Specialty", "dishType": "Local Delicacy", "description": "Must-taste traditional dish", "recommendedSpot": "Best historic eatery", "priceRange": "$15 - $25" },
    { "dishName": "Famous Street Food", "dishType": "Street Food", "description": "Flavorful quick bite", "recommendedSpot": "Night Market stall", "priceRange": "$5 - $10" },
    { "dishName": "Artisanal Dessert", "dishType": "Dessert", "description": "Sweet culinary indulgence", "recommendedSpot": "Local pastry house", "priceRange": "$8 - $14" }
  ],
  "weatherForecast": {
    "avgTempC": 22,
    "condition": "Pleasant & Clear",
    "packingTip": "Layered light apparel, sun hat, and comfortable walking shoes",
    "bestTimeToVisit": "March - May & September - November"
  },
  "budgetBreakdown": {
    "transport": 350,
    "accommodation": 400,
    "food": 250,
    "activities": 180,
    "buffer": 100,
    "totalPerPerson": 1280
  },
  "packingAdvice": [
    "Passport & digital copies of reservations",
    "Universal multi-pin plug adapter & high-capacity power bank",
    "Weather-appropriate breathable layers & walking footwear",
    "Local currency cash for street food stalls and small cafes"
  ],
  "translations": {
    "hi": { "languageName": "Hindi", "greeting": "नमस्ते", "summary": "Hindi translation of summary" },
    "es": { "languageName": "Spanish", "greeting": "¡Hola!", "summary": "Spanish translation of summary" },
    "fr": { "languageName": "French", "greeting": "Bonjour", "summary": "French translation of summary" }
  }
}`;

      let response;
      // List of supported high-performance models in priority order according to skill guidance
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let lastModelError: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              },
            });
            if (response && response.text) {
              break;
            }
          } catch (modelErr: any) {
            lastModelError = modelErr;
            const isSpikeOrUnavailable =
              modelErr?.status === 'UNAVAILABLE' ||
              modelErr?.code === 503 ||
              String(modelErr?.message || '').includes('high demand') ||
              String(modelErr?.message || '').includes('503');

            if (isSpikeOrUnavailable && attempt === 0) {
              // Quick 500ms jitter before retry or next model
              await new Promise(r => setTimeout(r, 500));
              continue;
            }
            // Move to next candidate model
            break;
          }
        }
        if (response && response.text) break;
      }

      if (response && response.text) {
        const text = response.text || '';
        const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        parsed.originCoords = originCoords;
        parsed.destCoords = destCoords;
        return res.json({ success: true, plan: parsed });
      } else if (lastModelError) {
        console.warn('Gemini models temporarily at capacity, serving high-fidelity tailored plan:', lastModelError?.message || lastModelError);
      }
    }
  } catch (err: any) {
    console.warn('Gemini API call warning, using tailored offline plan:', err?.message || err);
  }

  // High-fidelity fallback itinerary tailored to origin & destination
  const numDays = Math.min(Math.max(Number(days) || 4, 1), 14);
  const isFlightNeeded = distanceKm > 600;
  const flightEstCost = Math.round(Math.max(120, distanceKm * 0.08));
  const trainEstCost = Math.round(Math.max(25, distanceKm * 0.04));

  const transitOptions = [];
  if (isFlightNeeded) {
    transitOptions.push({
      mode: 'flight',
      title: `Commercial Flights: ${cleanOrigin.split(',')[0]} ✈ ${cleanDestination.split(',')[0]}`,
      duration: `${Math.round(distanceKm / 750) + 2}h (flight + transit)`,
      estimatedCost: flightEstCost,
      details: 'Major international carriers with round-trip check-in luggage',
      isRecommended: true,
    });
  }
  if (distanceKm < 2000) {
    transitOptions.push({
      mode: 'train',
      title: 'High-Speed Express Rail / Sleeper',
      duration: `${Math.round(distanceKm / 90) + 1}h`,
      estimatedCost: trainEstCost,
      details: 'Reserved panoramic coach with onboard cafe and power sockets',
      isRecommended: !isFlightNeeded,
    });
  }
  if (distanceKm < 800) {
    transitOptions.push({
      mode: 'car',
      title: 'Scenic Highway Road Trip / Private Cab',
      duration: `${Math.round(distanceKm / 60)}h drive`,
      estimatedCost: Math.round(distanceKm * 0.12),
      details: 'Freedom to stop at viewpoints, highway dhabas, and countryside spots',
      isRecommended: distanceKm < 350,
    });
  } else {
    transitOptions.push({
      mode: 'bus',
      title: 'City-to-Airport Metro & Intercity Transit',
      duration: 'Flexible',
      estimatedCost: 35,
      details: 'All-inclusive local metro and rapid transit pass for city center connectivity',
    });
  }

  const fallbackDays = Array.from({ length: numDays }, (_, i) => {
    const latOffset = (Math.sin(i + 1) * 0.02);
    const lngOffset = (Math.cos(i + 1) * 0.02);
    return {
      dayNumber: i + 1,
      theme:
        i === 0
          ? `Departure from ${cleanOrigin.split(',')[0]} & Welcome to ${cleanDestination.split(',')[0]}`
          : i === 1
          ? `Iconic Architectural Wonders & Historic Core`
          : i === 2
          ? `Artisan Markets, Street Food & Panoramic Viewpoints`
          : i === 3
          ? `Natural Landscapes, Gardens & Cultural Immersion`
          : `Hidden Neighborhoods & Golden Hour Farewell (Day ${i + 1})`,
      activities: [
        {
          time: '09:00',
          title: `Morning expedition around historic ${cleanDestination.split(',')[0]} district`,
          category: 'sightseeing',
          location: `${cleanDestination.split(',')[0]} Old Town`,
          cost: 25,
          lat: destCoords.lat + latOffset,
          lng: destCoords.lng + lngOffset,
          description: `Stroll through the oldest corridors and marvel at centuries-old cultural monuments.`,
        },
        {
          time: '12:30',
          title: `Chef-curated authentic culinary lunch`,
          category: 'food',
          location: `Central ${cleanDestination.split(',')[0]} Food Market`,
          cost: 35,
          lat: destCoords.lat + latOffset + 0.005,
          lng: destCoords.lng + lngOffset + 0.005,
          description: `Taste freshly prepared regional delicacies made with seasonal farm-to-table ingredients.`,
        },
        {
          time: '15:30',
          title: `Signature landmark & panoramic observation deck`,
          category: 'sightseeing',
          location: `${destination.split(',')[0]} Panorama Lookout`,
          cost: 30,
          lat: destCoords.lat + latOffset - 0.006,
          lng: destCoords.lng + lngOffset - 0.006,
          description: `Take in 360-degree skyline views and capture incredible photography memories.`,
        },
        {
          time: '19:30',
          title: `Candlelit dinner & evening stroll`,
          category: 'food',
          location: `Waterfront Promenade, ${destination.split(',')[0]}`,
          cost: 65,
          lat: destCoords.lat + latOffset + 0.008,
          lng: destCoords.lng + lngOffset - 0.004,
          description: `Savor evening beverages and signature desserts as the city lights illuminate.`,
        },
      ],
    };
  });

  const dailyBudget = budgetTier === 'Budget' ? 60 : budgetTier === 'Luxury' ? 260 : 130;
  const hotelBase = budgetTier === 'Budget' ? 40 : budgetTier === 'Luxury' ? 240 : 110;

  const responsePlan = {
    title: `${numDays}-Day ${cleanDestination} Master Expedition from ${cleanOrigin}`,
    origin: cleanOrigin,
    originCoords,
    destination: cleanDestination,
    destCoords,
    distanceKm,
    durationDays: numDays,
    travelers: Number(travelers) || 2,
    groupType,
    budgetTier,
    vibe,
    summary: `A bespoke journey traversing ${distanceKm.toLocaleString()} km from ${cleanOrigin} to ${cleanDestination}. Tailored for ${travelers} travelers (${groupType}) with a ${budgetTier} aesthetic, blending world-renowned attractions with authentic local culture.`,
    transitOptions,
    days: fallbackDays,
    hotels: [
      {
        name: `${cleanDestination.split(',')[0]} Urban Nomad Social Hub`,
        tier: 'Budget',
        pricePerNight: Math.round(hotelBase * 0.45),
        rating: 4.65,
        location: `Central Metro Corridor, ${cleanDestination.split(',')[0]}`,
        perks: ['High-speed Wi-Fi', 'Complimentary Breakfast', 'Luggage Lockers', 'Social Lounge'],
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: `The Grand Heritage Boutique & Suites`,
        tier: 'Boutique',
        pricePerNight: hotelBase,
        rating: 4.88,
        location: `Historic Arts Quarter, ${cleanDestination.split(',')[0]}`,
        perks: ['Rooftop Skyline Terrace', 'Artisanal Breakfast', 'Express Check-in', 'Cocktail Lounge'],
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: `The Royal Palace Resort & Spa`,
        tier: 'Luxury',
        pricePerNight: Math.round(hotelBase * 2.4),
        rating: 4.97,
        location: `Scenic Waterfront, ${cleanDestination.split(',')[0]}`,
        perks: ['Heated Infinity Pool', 'Michelin-starred dining', 'Private Chauffeur', '24/7 Butler Service'],
        image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      },
    ],
    foodGuide: [
      {
        dishName: `Signature ${cleanDestination.split(',')[0]} Specialty Platter`,
        dishType: 'Local Delicacy',
        description: `Slow-cooked traditional staple revered across generations, bursting with distinctive local spices and aromas.`,
        recommendedSpot: `Old Town Heritage Kitchen`,
        priceRange: `$14 - $28`,
      },
      {
        dishName: `Crisp Street Food Skewers & Dumplings`,
        dishType: 'Street Food',
        description: `Sizzling hot snacks served right off the charcoal grill with house-made dipping sauces.`,
        recommendedSpot: `Bustling Night Bazaar`,
        priceRange: `$4 - $10`,
      },
      {
        dishName: `Warm Artisan Sweet Pastry & Regional Tea`,
        dishType: 'Dessert',
        description: `A delicate sweet confection paired with aromatic infused tea or single-origin roasted coffee.`,
        recommendedSpot: `Artisan Grand Bakery Cafe`,
        priceRange: `$6 - $12`,
      },
    ],
    weatherForecast: {
      avgTempC: 22,
      condition: 'Clear Skies & Mild Breeze',
      packingTip: 'Light breathable daytime attire, a light evening jacket, and sturdy comfortable footwear.',
      bestTimeToVisit: 'Spring (March – May) & Autumn (September – November)',
    },
    budgetBreakdown: {
      transport: isFlightNeeded ? flightEstCost : trainEstCost,
      accommodation: hotelBase * numDays,
      food: dailyBudget * 0.45 * numDays,
      activities: dailyBudget * 0.35 * numDays,
      buffer: Math.round(dailyBudget * 0.2 * numDays),
      totalPerPerson: Math.round((isFlightNeeded ? flightEstCost : trainEstCost) + hotelBase * numDays + dailyBudget * numDays),
    },
    packingAdvice: [
      'Original passport with at least 6 months validity & physical backup copies',
      'Universal power plug adapter + portable high-speed power bank',
      'Comfortable walking shoes broken in for long exploring sessions',
      'Offline emergency contact cards and local currency bills for micro-vendors',
    ],
    translations: {
      hi: {
        languageName: 'Hindi (हिन्दी)',
        greeting: 'नमस्ते',
        summary: `${origin} से ${destination} की यह ${numDays} दिनों की यात्रा आपके लिए बेहतरीन अनुभव लेकर आएगी। इसमें स्थानीय संस्कृति, स्वादिष्ट भोजन और प्रमुख आकर्षण शामिल हैं।`,
      },
      es: {
        languageName: 'Spanish (Español)',
        greeting: '¡Hola y Bienvenidos!',
        summary: `Un viaje inolvidable de ${numDays} días desde ${origin} hasta ${destination}, combinando gastronomía local y vistas impresionantes.`,
      },
      fr: {
        languageName: 'French (Français)',
        greeting: 'Bienvenue!',
        summary: `Un itinéraire sur mesure de ${numDays} jours de ${origin} à ${destination}, alliant culture, cuisine et paysages époustouflants.`,
      },
    },
  };

  res.json({ success: true, plan: responsePlan });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TravellPlan TREK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
