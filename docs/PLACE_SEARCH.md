# Worldwide place search and Google Maps links

## How search works

All search entry points (header, quick planner, trip generator, and assistant) share the same request/cancellation behavior. The header is no longer restricted to the seven inspiration cards.

1. A small client-side reference list provides immediate suggestions and aliases, including Gurugram / Gurgaon / गुरुग्राम / गुड़गांव, Rohtak and nearby towns.
2. The server includes the `all-the-cities` GeoNames gazetteer: **135,233 indexed records** in the locked package version. This index remains searchable when external providers are unavailable. It is loaded **only on the server**, not shipped to each browser.
3. Photon / OpenStreetMap performs live worldwide autocomplete for cities, towns, villages, hamlets, streets and landmarks. An optional **server-only** `GEOAPIFY_API_KEY` enables a second provider when the primary fails or returns no results. Google Maps links do not require a Google API key.
4. Users can open **any typed query** directly in Google Maps, even if the app's search providers find no match.

There is no A–Z whitelist or country restriction. Search supports Unicode, accent-insensitive matching in the city index, multi-word queries, and Gurugram's old/new names. For ambiguous names, add the country, or select the appropriate live result with its region. The offline gazetteer is a city/town index (primarily populations of 1,000+), **not every village, street, business, or current boundary worldwide**. Those depend on live-provider coverage. The dataset contains historical names and coordinates; it is not a current business listing.

Requests are debounced, cancelled when superseded, bounded by timeouts, deduplicated while in-flight, and cached for five minutes. Failed live lookups expire after 15 seconds rather than permanently hiding places after an outage. Nearby places with different names are not collapsed solely because they round to the same coordinate.

## Maps and privacy

There are no embedded map canvases, tile downloads, Leaflet or Mapbox SDKs. Destination cards/details, active trips, itinerary stops, and generated plans use `https://www.google.com/maps/search/?api=1&query=...` or the corresponding directions URL. Links encode the actual selected place/origin, open in a new tab, and include `noopener noreferrer`. Latest listing information/directions are shown by Google Maps after the user opens the link; TripCheck itself does not fetch Google traffic or business data.

Typed place names are sent to the app server and its search providers. No browser GPS access is requested. Opening an external link shares its query with Google. Provider keys stay on the server and are never included in API responses.

## Data attribution

- City index: [GeoNames](https://www.geonames.org/), via [`all-the-cities`](https://www.npmjs.com/package/all-the-cities). Package code is MIT; geographic data requires GeoNames attribution. See [GeoNames data terms](https://www.geonames.org/about.html).
- Live primary provider: [Photon](https://photon.komoot.io/), [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Optional secondary provider: [Geoapify](https://www.geoapify.com/). Configure your own provider account/plan for production traffic. Public Photon availability and throughput are not guaranteed.
- India emergency reference: the official ERSS FAQ identifies 112 for police, ambulance and fire assistance. [3](https://112.gov.in/faq). Other existing emergency records are reference data, not live-verified contacts; unsupported countries no longer fall back to Japan.

Provider attribution is also displayed with search results.
