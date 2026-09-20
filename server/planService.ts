const LIVE_PLAN_NOTICE = 'Live AI plan. Places, opening times, travel rules and prices are estimates — check them before you book.';

import { searchPlacesGlobal } from './placeSearch';
import { searchLocalPlaces, normalizePlaceQuery } from '../src/utils/places';
import { generateLivePlan, resolveModels } from './aiPlan';

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
    Number.isFinite(clientCoords.lat) &&
    Number.isFinite(clientCoords.lng) &&
    Math.abs(clientCoords.lat) <= 90 &&
    Math.abs(clientCoords.lng) <= 180
  ) {
    return { lat: clientCoords.lat, lng: clientCoords.lng };
  }

  const clean = (name || '').trim();
  if (!clean) return { lat: 28.6139, lng: 77.209 };

  // Check curated places
  const curated = searchLocalPlaces(clean).find((p) =>
    [p.name, p.label, ...(p.aliases || [])].some(
      (name) => normalizePlaceQuery(name) === normalizePlaceQuery(clean)
    )
  );
  if (curated) {
    return { lat: curated.lat, lng: curated.lng };
  }

  // Check Photon global search
  try {
    const { places: results } = await searchPlacesGlobal(clean);
    if (
      results.length > 0 &&
      Number.isFinite(results[0].lat) &&
      Number.isFinite(results[0].lng)
    ) {
      return { lat: results[0].lat, lng: results[0].lng };
    }
  } catch (err) {
    // fallback below
  }

  throw new Error(
    `We couldn’t locate ${clean}. Please choose a place from the suggestions.`
  );
}

function calculateDistanceKm(
  c1: { lat: number; lng: number },
  c2: { lat: number; lng: number }
): number {
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

export async function processPlanRequest(planInput: any): Promise<{ status: number; body: any }> {
  const req = { body: planInput };
  let resultStatus = 200;
  let resultBody: any = null;
  const res = {
    status(code: number) {
      resultStatus = code;
      return this;
    },
    json(data: any) {
      resultBody = data;
      return this;
    }
  };


  const input = req.body;
  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.destination !== 'string' ||
    !input.destination.trim() ||
    input.destination.length > 200 ||
    (input.origin !== undefined &&
      (typeof input.origin !== 'string' || input.origin.length > 200)) ||
    (input.days !== undefined &&
      (!Number.isInteger(input.days) || input.days < 1 || input.days > 14)) ||
    (input.travelers !== undefined &&
      (!Number.isInteger(input.travelers) ||
        input.travelers < 1 ||
        input.travelers > 20))
  ) {
    return res.status(400).json({
      success: false,
      error: 'Choose a destination, 1–14 days, and 1–20 travelers.',
    });
  }
  for (const field of ['originCoords', 'destCoords']) {
    const coords = input[field];
    if (
      coords !== undefined &&
      (!coords ||
        !Number.isFinite(coords.lat) ||
        !Number.isFinite(coords.lng) ||
        Math.abs(coords.lat) > 90 ||
        Math.abs(coords.lng) > 180)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please select valid map coordinates.',
      });
    }
  }
  if (
    (input.groupType &&
      !['Solo', 'Couple', 'Family', 'Friends'].includes(input.groupType)) ||
    (input.budgetTier &&
      !['Budget', 'Moderate', 'Luxury'].includes(input.budgetTier)) ||
    (input.vibe !== undefined &&
      (typeof input.vibe !== 'string' || input.vibe.length > 200))
  ) {
    return res.status(400).json({
      success: false,
      error: 'Please select valid travel preferences.',
    });
  }

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

  let originCoords: { lat: number; lng: number };
  let destCoords: { lat: number; lng: number };
  try {
    [originCoords, destCoords] = await Promise.all([
      resolveCoords(cleanOrigin, req.body.originCoords),
      resolveCoords(cleanDestination, req.body.destCoords),
    ]);
  } catch (error) {
    return res
      .status(422)
      .json({ success: false, error: (error as Error).message });
  }
  const distanceKm = calculateDistanceKm(originCoords, destCoords);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const outcome = await generateLivePlan(
      {
        origin: cleanOrigin,
        destination: cleanDestination,
        originCoords,
        destCoords,
        distanceKm,
        days: Math.min(Math.max(Number(days) || 5, 1), 14),
        travelers: Number(travelers) || 2,
        groupType,
        budgetTier: budgetTier || budget,
        vibe,
      },
      {
        apiKey,
        models: resolveModels(process.env.GEMINI_MODEL),
        baseUrl: process.env.GEMINI_BASE_URL || undefined,
        timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || undefined,
        deadlineMs: Number(process.env.GEMINI_DEADLINE_MS) || undefined,
        maxOutputTokens:
          Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || undefined,
        log: (message, detail) =>
          console.warn(`[ai-plan] ${message}`, detail ?? ''),
      }
    );
    if (outcome.status === 'ok') {
      return res.json({
        success: true,
        source: 'ai',
        model: outcome.model,
        notice: LIVE_PLAN_NOTICE,
        notes: outcome.notes,
        plan: outcome.plan,
      });
    }
    console.warn(
      `Live trip generation unavailable (${outcome.model}, ${outcome.attempts} attempt(s)): ${outcome.reason}. Serving the labelled sample plan.`
    );
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
      details:
        'Freedom to stop at viewpoints, highway dhabas, and countryside spots',
      isRecommended: distanceKm < 350,
    });
  } else {
    transitOptions.push({
      mode: 'bus',
      title: 'City-to-Airport Metro & Intercity Transit',
      duration: 'Flexible',
      estimatedCost: 35,
      details:
        'All-inclusive local metro and rapid transit pass for city center connectivity',
    });
  }

  const fallbackDays = Array.from({ length: numDays }, (_, i) => {
    const latOffset = Math.sin(i + 1) * 0.02;
    const lngOffset = Math.cos(i + 1) * 0.02;
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

  const dailyBudget =
    budgetTier === 'Budget' ? 60 : budgetTier === 'Luxury' ? 260 : 130;
  const hotelBase =
    budgetTier === 'Budget' ? 40 : budgetTier === 'Luxury' ? 240 : 110;

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
        perks: [
          'High-speed Wi-Fi',
          'Complimentary Breakfast',
          'Luggage Lockers',
          'Social Lounge',
        ],
        image:
          'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: `The Grand Heritage Boutique & Suites`,
        tier: 'Boutique',
        pricePerNight: hotelBase,
        rating: 4.88,
        location: `Historic Arts Quarter, ${cleanDestination.split(',')[0]}`,
        perks: [
          'Rooftop Skyline Terrace',
          'Artisanal Breakfast',
          'Express Check-in',
          'Cocktail Lounge',
        ],
        image:
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      },
      {
        name: `The Royal Palace Resort & Spa`,
        tier: 'Luxury',
        pricePerNight: Math.round(hotelBase * 2.4),
        rating: 4.97,
        location: `Scenic Waterfront, ${cleanDestination.split(',')[0]}`,
        perks: [
          'Heated Infinity Pool',
          'Michelin-starred dining',
          'Private Chauffeur',
          '24/7 Butler Service',
        ],
        image:
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
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
      // No live forecast is fetched, so no temperature is claimed.
      avgTempC: null,
      condition: 'Not included',
      packingTip:
        'Check a live forecast for your dates; pack layers and comfortable walking shoes.',
      bestTimeToVisit: 'Spring (March – May) & Autumn (September – November)',
    },
    budgetBreakdown: {
      transport: isFlightNeeded ? flightEstCost : trainEstCost,
      accommodation: hotelBase * numDays,
      food: dailyBudget * 0.45 * numDays,
      activities: dailyBudget * 0.35 * numDays,
      buffer: Math.round(dailyBudget * 0.2 * numDays),
      totalPerPerson: Math.round(
        (isFlightNeeded ? flightEstCost : trainEstCost) +
          hotelBase * numDays +
          dailyBudget * numDays
      ),
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

  // Templates are ideas, not verified venues, forecasts, or bookable offers.
  responsePlan.days.forEach((day) =>
    day.activities.forEach((activity) => {
      delete activity.lat;
      delete activity.lng;
    })
  );
  res.json({
    success: true,
    source: 'sample',
    notice:
      'Sample plan — live AI is unavailable. Stays, meals, weather and prices are illustrative, not verified recommendations.',
    plan: responsePlan,
  });


  return { status: resultStatus, body: resultBody };
}
