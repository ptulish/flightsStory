# SkyHistory

> Every flight you've ever taken, stitched into one map.

SkyHistory analyzes your inbox (Gmail / iCloud / IMAP), finds airline ticket
confirmations, parses them with an LLM, and builds an interactive dashboard out
of your travel history — maps, stats, charts, and stories from every trip.

This repository now contains a working full-stack implementation:

- React frontend with Gmail/iCloud connect flow
- Node API with OAuth + SSE scanning endpoints
- Redis-backed parse queue with dedicated worker
- Postgres persistence with flight deduplication

## Stack

- **React 18** + **Vite 5** for the app shell
- **Tailwind CSS** with a hand-rolled dark design system
- **Lucide React** for icons
- **React Router** for routing
- **TanStack Query** for data fetching (wired but not yet hitting a real API)
- **Recharts** for charts
- **react-simple-maps** + **d3-geo** + **world-atlas** for the world map
- **Framer Motion** for animations

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run dev:server # API at http://localhost:8787
npm run dev:worker # queue worker
npm run build    # production bundle to dist/
npm run preview  # serve the production build
```

Use `.env.example` as a template for local environment setup.

Then open the app and click **Demo** to see the full dashboard with realistic
data (~80 flights across 5 years, 26 countries, 14 airlines).

## What's done

- [x] Connect screen with three sources: Gmail, iCloud (App Password), Demo.
- [x] Animated scanner progress page (stages: connect → index → filter →
      fetch → AI parse → save).
- [x] Stats grid: flights, distance flown, countries, total spend, time aloft,
      favourite airline.
- [x] World map with great-circle arcs, hover tooltips, zoom controls, and
      airport markers sized by visit count.
- [x] Charts: activity by year, top airlines, top routes, cabin breakdown,
      monthly heatmap, milestone cards.
- [x] Ticket list page with search, filters (year / airline / cabin), sort,
      pagination, expandable rows, and CSV export.
- [x] Settings page with privacy explainer, JSON export, and one-click
      "delete all my data".
- [x] Mobile-friendly responsive layout.
- [x] Backend OAuth + Gmail scan pipeline.
- [x] iCloud IMAP session + scan pipeline.
- [x] Redis parse queue + worker process.
- [x] Postgres storage with flight deduplication.

## How real backends drop in

The dashboard is fed by a single source-agnostic data layer:
[`src/api/flights.js`](./src/api/flights.js). It exposes three functions
(`fetchDemo`, `fetchGmail`, `fetchIcloud`) that all return the same shape: a
list of flight rows ready for `enrichFlight()` in `src/utils/stats.js`.

## Production deployment

Production setup is documented in [`DEPLOY.md`](./DEPLOY.md).

- Frontend: Netlify
- API + Worker + Redis + Postgres: Render/Railway

To wire the real pipeline:

| MVP | Replace                              | With                                                                                  |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | `fetchGmail`                         | Server endpoint `GET /api/gmail/scan` streaming SSE progress events to `onProgress`.  |
| 2   | The "AI parsing" stage               | Backend job that calls Gemini Flash with the prompt in section 3.2 of the spec.       |
| 3   | (already done)                       | The dashboard already consumes the canonical `Flight` row.                            |
| 4   | `fetchIcloud`                        | Server-side IMAP scan once App Password flow is wired (no client-side IMAP).          |
| 5   | UI polish                            | Animations are in; error toasts & empty states can be deepened.                       |

The progress channel already supports the granular stages required for a
"Smotrim pochty… Nashli 15 biletov…" experience, with messages-scanned and
tickets-found counters.

## Database schema (target)

This is the shape SkyHistory expects from the backend, mirroring the spec:

```
Users      (id, email, auth_type)
Flights    (user_id, airline, flight_number, from_iata, to_iata,
            departure_date, price, currency, cabin, source, raw_subject)
Airports   (iata_code, city, country, lat, lng)   -- src/data/airports.js seeds this
```

`computeStats(flights)` in [`src/utils/stats.js`](./src/utils/stats.js) is the
single function that produces every metric on the dashboard from a flat
`Flights[]` array.

## Privacy

- We never store email passwords (Gmail uses OAuth, iCloud uses App Passwords
  held in memory only during a scan).
- HTTPS is mandatory for any deployment.
- "Delete all data" wipes Postgres rows + browser cache in one click.
- Demo mode runs entirely in the browser — nothing leaves the page.

## Project layout

```
src/
  api/flights.js          # source-agnostic data fetchers (demo + stubs)
  components/
    FlightMap.jsx         # world map with arc layer
    Layout.jsx            # sidebar + header + auth-aware nav
    StatsGrid.jsx         # animated metric cards
    TicketList.jsx        # search/filter/sort/expand table
    charts/               # one component per chart, all consume `stats` slices
  data/
    airports.js           # IATA → {city, country, lat, lng}
    airlines.js           # IATA → {name, brand color}
    demoFlights.js        # ~80 demo flights + FX rates
  pages/
    ConnectPanel.jsx      # Gmail / iCloud / Demo picker
    ScannerProgress.jsx   # animated multi-stage scan
    Dashboard.jsx         # main dashboard
    Tickets.jsx           # full ticket archive + CSV export
    Settings.jsx          # privacy, export, wipe
  state/session.jsx       # connected source + flights, persisted to localStorage
  styles/index.css        # Tailwind layers + custom design tokens
  utils/
    format.js             # currency, dates, durations, distances
    geo.js                # haversine distance
    stats.js              # the single computeStats(flights) aggregator
    useAnimatedNumber.js  # rAF-based number tween for stat cards
```

## License

MIT
