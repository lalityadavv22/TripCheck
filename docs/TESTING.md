# TripCheck — verification report

Date: 19 September 2026

## Result

- **63 automated tests passed** in the final full Chromium run against the production server (15 API cases, 37 browser cases, 11 place-search/URL tests).
- `npm run lint` — TypeScript check passed.
- `npm run build` — production client and Express server built successfully; no oversized JavaScript chunk warning after code splitting.
- Production verification — built server started successfully with the externalized city-index package; Albuquerque search returned GeoNames results. The full suite ran against this production server with no browser runtime errors.
- Desktop Gurugram search and mobile Google Maps cards were visually inspected. A touch-context check confirmed the cursor decoration is hidden.
- **Live trip generation (2026-09-19):** 17 tests in `tests/livePlan.spec.ts` drive the real Google SDK and the real `/api/ai/plan` endpoint against a local stand-in Gemini service, and the same check was repeated against the built `dist/server.cjs` bundle (`source: "ai"`, correct model, repaired/normalized plan). Total for the round: **43 browser-free tests passed** (17 live generation, 15 API, 11 place search) plus `npm run lint` and `npm run build`.
- Three previously timing-sensitive search paths passed three consecutive runs. Software-rendered sandbox Chromium uses one worker: initial parallel runs experienced scheduling timeouts, so the final run avoids software-renderer contention.

## Coverage

| Area | Verified |
| --- | --- |
| Explore | Local photos, filters, price sorting, saving/unsaving, empty state, persistence |
| Search | Gurugram/Gurgaon/Hindi aliases, global city index, village fixtures, global-to-planner exact coordinate handoff, no results, fallback Google Maps query, shared destination deep link |
| Inspiration | Carousel control, keyboard destination opening |
| Autocomplete | Keyboard suggestion selection, quick-form handoff, stale request cancellation, focus dismissal |
| Destinations | Detail tabs/highlights, creation of a dated seven-day trip, share failure recovery, Escape dismissal |
| Itinerary | Add day, correct end date, add/complete/delete activity, persistence, per-day Google Maps stop links and empty state |
| Budget | Create/delete expense, reject negative amounts, persistence, trip-specific isolation |
| Essentials | Country selection, India 112 links, no invented emergency numbers for unsupported countries, currency calculation, packing add/check, keyboard use, persistence |
| Group ideas | Add free-cost idea, upvote/downvote/switch/undo, persistence, trip-specific isolation |
| Route generator | Real local sample API response, traveler count, all result tabs, Hindi summary, import, unique activity IDs |
| Trip assistant | Sample-plan import, visible network error, no fabricated success result |
| Live generation | Complete plan, 503 retry, bad key stops early, model fallback, schema rejection retry, truncated JSON repair, fenced/prose output, empty thinking response, copied coordinates dropped, extra days trimmed, budget recomputed, missing sections kept usable, end-to-end `source: "ai"` and labelled-sample fallback |
| Failure paths | Invalid API input, missing coordinates, incomplete AI output, request cancellation, corrupt browser storage |
| Google Maps | Correct destination and origin URLs, per-stop links, Unicode/query encoding, new-tab security attributes, no embedded map/canvas/iframe |
| Search service | Invalid/zero coordinates, OSM result parsing, Geoapify fallback, distinct nearby places, TTL expiry, coalescing, provider outage, 135k+ index including Jind/Albuquerque/El Tarter/São Paulo |
| Cursor | Pointer following, grow/shrink states, click-through, preference persistence, keyboard hiding, reduced motion and touch suppression |
| Security | Arbitrary activity names are URL-encoded, not interpreted as HTML; provider keys remain server-only |
| Responsive | Every main page at 360, 390, 768, 1440, and 1920px; no horizontal page overflow; mobile dialogs and generated results |
| Accessibility | Search focus trap/restoration, keyboard packing and destination cards, labels, modal dismissal |

Browser tests deliberately abort third-party browser requests. The app's own API is real except in explicit failure/malformed-response/village-fixture tests. Place-search unit tests inject provider fixtures and clocks, testing both success and failure without requiring external uptime. TypeScript and production build were checked separately.

## Not verified / remaining boundaries

- **Live Gemini generation:** the model-facing code path (prompt, retries, JSON repair, normalization, validation, response shape) is verified against a local stand-in endpoint, not against Google. This workspace has no `GEMINI_API_KEY` and no network egress to `generativelanguage.googleapis.com` (TLS is cut: `curl` fails with `SSL_ERROR_SYSCALL`), so a real provider call, its quota and its latency are unverified here. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) on the deployment and check `GET /api/ai/status` — `live: true` means requests will reach the model.
- **Live worldwide geocoding:** external providers were unavailable in this workspace. Provider behavior was tested with fixtures; the actual server city index was tested end-to-end. There is no claim that every village/address is indexed. Any typed query can be opened in Google Maps; Google’s actual website, current listings and directions were not verified here. There are no embedded maps or tile requests. See [place-search coverage](PLACE_SEARCH.md).
- **Travel information:** prices, sample stays, weather, and exchange rates are illustrative, not booking quotes or live data. Emergency links were inspected, not dialed; India’s 112 entry links to the official ERSS reference; other phone numbers, visa rules, opening times, and local conditions were not independently verified.
- **Storage:** trips, expenses, ideas, saved destinations, and packing are saved to this browser, not a server database. This app has one active trip and does not offer an archived-trip switcher. Creating/importing a new trip replaces the current itinerary. Group voting is local, not real-time collaboration.
- **Offline:** persisted state survives refresh, but there is no service worker. The server-side city index works without a geocoder connection, not without a reachable app server. Reopening the app requires a connection; the UI now says so.
- Chromium was used for browser automation. Safari/Firefox and physical-device testing have not been performed. The browser suite (`tests/app.spec.ts`) was **not re-run in the live-generation round**: this workspace cannot download Chromium (`cdn.playwright.dev` is unreachable), so the 43 tests above are the API/unit-level suites. Run `npx playwright install --with-deps chromium && npm test` where a browser is available.

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

For an existing Chromium installation (uses a single test worker to accommodate software-rendered sandbox browsers):

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm test
```

In the restricted workspace, Chromium and its libraries were temporarily provisioned outside the repository. Browser binaries, screenshots, traces, test reports, and build output are excluded from version control. `npx playwright show-report` opens the local detailed test report.
