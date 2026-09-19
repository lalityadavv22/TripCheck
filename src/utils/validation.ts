import type { GeneratedTripPlan } from '../types';

const object = (value: any) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value: any) => typeof value === 'string';
const number = (value: any) =>
  typeof value === 'number' && Number.isFinite(value);
const cost = (value: any) => number(value) && value >= 0;
const strings = (value: any) => Array.isArray(value) && value.every(string);
const list = (value: any, check: (item: any) => boolean) =>
  Array.isArray(value) && value.every((item) => object(item) && check(item));
const coords = (value: any) =>
  object(value) &&
  number(value.lat) &&
  number(value.lng) &&
  Math.abs(value.lat) <= 90 &&
  Math.abs(value.lng) <= 180;
const activityCoords = (value: any) =>
  (value.lat === undefined && value.lng === undefined) || coords(value);

/** Reject incomplete API output before a result screen or map can consume it. */
export function isGeneratedTripPlan(plan: any): plan is GeneratedTripPlan {
  return (
    object(plan) &&
    string(plan.title) &&
    string(plan.summary) &&
    string(plan.origin) &&
    string(plan.destination) &&
    coords(plan.originCoords) &&
    coords(plan.destCoords) &&
    cost(plan.distanceKm) &&
    Number.isInteger(plan.durationDays) &&
    plan.durationDays >= 1 &&
    plan.durationDays <= 14 &&
    Number.isInteger(plan.travelers) &&
    plan.travelers >= 1 &&
    plan.travelers <= 20 &&
    list(
      plan.days,
      (day) =>
        Number.isInteger(day.dayNumber) &&
        string(day.theme) &&
        list(
          day.activities,
          (a) =>
            string(a.time) &&
            string(a.title) &&
            string(a.category) &&
            string(a.location) &&
            cost(a.cost) &&
            activityCoords(a)
        )
    ) &&
    plan.days.length === plan.durationDays &&
    list(
      plan.hotels,
      (hotel) =>
        string(hotel.name) &&
        string(hotel.tier) &&
        cost(hotel.pricePerNight) &&
        number(hotel.rating) &&
        string(hotel.location) &&
        strings(hotel.perks) &&
        string(hotel.image)
    ) &&
    list(
      plan.transitOptions,
      (option) =>
        string(option.mode) &&
        string(option.title) &&
        string(option.duration) &&
        cost(option.estimatedCost) &&
        string(option.details)
    ) &&
    list(
      plan.foodGuide,
      (food) =>
        string(food.dishName) &&
        string(food.dishType) &&
        string(food.description) &&
        string(food.recommendedSpot) &&
        string(food.priceRange)
    ) &&
    object(plan.budgetBreakdown) &&
    [
      'transport',
      'accommodation',
      'food',
      'activities',
      'buffer',
      'totalPerPerson',
    ].every((key) => cost(plan.budgetBreakdown[key])) &&
    object(plan.weatherForecast) &&
    (plan.weatherForecast.avgTempC === null ||
      number(plan.weatherForecast.avgTempC)) &&
    string(plan.weatherForecast.condition) &&
    string(plan.weatherForecast.packingTip) &&
    strings(plan.packingAdvice) &&
    object(plan.translations) &&
    Object.values(plan.translations).every(
      (translation: any) => object(translation) && string(translation.summary)
    )
  );
}

export function isValidStoredData(key: string, value: any): boolean {
  if (key === 'saved-destinations') return strings(value);
  if (key.startsWith('packing:'))
    return list(
      value,
      (item) =>
        string(item.id) &&
        string(item.name) &&
        string(item.category) &&
        typeof item.checked === 'boolean'
    );
  if (key === 'expenses')
    return list(
      value,
      (e) =>
        string(e.id) &&
        string(e.tripId) &&
        string(e.description) &&
        string(e.category) &&
        cost(e.amount) &&
        string(e.currency) &&
        string(e.date) &&
        string(e.paidBy)
    );
  if (key === 'votes')
    return list(
      value,
      (c) =>
        string(c.id) &&
        string(c.tripId) &&
        string(c.title) &&
        string(c.description) &&
        string(c.photo) &&
        string(c.type) &&
        cost(c.costEst) &&
        cost(c.votesUp) &&
        cost(c.votesDown)
    );
  if (key === 'active-trip')
    return (
      object(value) &&
      [
        'id',
        'title',
        'destination',
        'country',
        'coverImage',
        'startDate',
        'endDate',
        'currency',
        'status',
      ].every((k) => string(value[k])) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.startDate) &&
      Number.isFinite(Date.parse(value.startDate)) &&
      cost(value.totalBudget) &&
      Number.isInteger(value.travelers) &&
      value.travelers > 0 &&
      list(
        value.days,
        (d) =>
          Number.isInteger(d.dayNumber) &&
          string(d.date) &&
          string(d.theme) &&
          list(
            d.activities,
            (a) =>
              string(a.id) &&
              string(a.time) &&
              string(a.title) &&
              string(a.category) &&
              string(a.locationName) &&
              cost(a.cost) &&
              activityCoords(a)
          )
      )
    );
  return value !== null;
}
