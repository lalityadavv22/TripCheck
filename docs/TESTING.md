# TripCheck — verification report

Date: 19 September 2026

## Result

- **38 automated tests passed** in the final full Chromium run (13 API cases and 25 browser cases).
- `npm run lint` — TypeScript check passed.
- `npm run build` — production client and Express server built successfully; no oversized JavaScript chunk warning after code splitting.
- Production smoke test — built server started, Explore and Budget loaded, expense dialog opened, no browser runtime errors.
- Desktop and mobile screenshots were inspected. Additional visual polish improves emergency-card contrast.

## Coverage

| Area | Verified |
| --- | --- |
| Explore | Local photos, filters, price sorting, saving/unsaving, empty state, persistence |
| Search | Matching, no results, destination opening, shared destination deep link |
| Inspiration | Carousel control, keyboard destination opening |
| Autocomplete | Keyboard suggestion selection, quick-form handoff, stale request cancellation, focus dismissal |
| Destinations | Detail tabs, creation of a dated seven-day trip, Escape dismissal |
| Itinerary | Add day, correct end date, add/complete/delete activity, persistence, map visibility, empty-map state |
| Budget | Create/delete expense, reject negative amounts, persistence, trip-specific isolation |
| Essentials | Country selection, dialable emergency links, currency calculation, packing add/check, keyboard use, persistence |
| Group ideas | Add free-cost idea, upvote/downvote/switch/undo, persistence, trip-specific isolation |
| Route generator | Real local sample API response, traveler count, all result tabs, Hindi summary, import, unique activity IDs |
| Trip assistant | Sample-plan import, visible network error, no fabricated success result |
| Failure paths | Invalid API input, missing coordinates, incomplete AI output, request cancellation, corrupt browser storage |
| Map | Layer switching, fit bounds, viewport-sized expansion, Escape, hide/show lifecycle, unavailable tile message |
| Security | Activity names in Leaflet popups are escaped instead of interpreted as HTML |
| Responsive | Every main page at 360, 390, 768, 1440, and 1920px; no horizontal page overflow; mobile dialogs and generated results |
| Accessibility | Search focus trap/restoration, keyboard packing and destination cards, labels, modal dismissal |

Browser tests deliberately abort third-party browser requests so results do not depend on image or map-provider uptime. The app's own API is real except in the explicit network-error/malformed-response tests. TypeScript, development mode, and production smoke checks were run separately.

## Not verified / remaining boundaries

- **Live Gemini generation:** no API key was configured. The clearly labeled sample-plan path was verified. Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` to test your provider account.
- **External map tiles and global geocoding:** this environment could not reach those providers. Map controls, local curated search, failure handling, and coordinate validation were verified; external rendering/coverage is not certified.
- **Travel information:** prices, sample stays, weather, and exchange rates are illustrative, not booking quotes or live data. Emergency links were inspected, not dialed; phone numbers, visa rules, opening times, and local conditions were not independently verified.
- **Storage:** trips, expenses, ideas, saved destinations, and packing are saved to this browser, not a server database. This app has one active trip and does not offer an archived-trip switcher. Creating/importing a new trip replaces the current itinerary. Group voting is local, not real-time collaboration.
- **Offline:** persisted state survives refresh, but there is no service worker or offline map download. Reopening the app requires a connection; the UI now says so.
- Chromium was used for browser automation. Safari/Firefox and physical-device testing have not been performed.

## Run locally

Node 22 or newer is recommended.

```bash
npm ci
npx playwright install --with-deps chromium
npm run lint
npm test
npm run build
NODE_ENV=production npm start
```

The suite starts a development server automatically if port 3000 is free. If one is already running, it reuses it outside CI. Run sample-plan tests without `GEMINI_API_KEY` so the result is deterministic. Do not run tests against a personal browser profile.

For an existing Chromium installation:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm test
```

In the restricted workspace, Chromium and its libraries were temporarily provisioned outside the repository. Browser binaries, screenshots, traces, test reports, and build output are excluded from version control. `npx playwright show-report` opens the local detailed test report.
