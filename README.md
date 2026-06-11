# USD vs G10 Carry Monitor

A Vercel-ready dashboard for monitoring USD carry attractiveness, positioning stress, volatility pressure, and unwind risk across G10 currencies.

## What The Dashboard Shows

- **Overview regime**: a compact market read across USD/G10 carry trades.
- **Carry matrix**: spot, returns, carry, CFTC z-score, volatility z-score, CLP, MCLP, and regime.
- **Risk alerts**: generated from CLP, CLP momentum, crowding, and volatility thresholds.
- **Pair deep dives**: click a currency to inspect spot path, factor stack, and stress decomposition.

## Currency Universe

The app tracks USD versus:

```text
EUR, JPY, GBP, CHF, CAD, AUD, NZD, SEK, NOK, DKK
```

All metrics are normalized as:

```text
Long USD versus the foreign currency
```

## Project Structure

```text
app/
  page.tsx                 Main dashboard
  pairs/[currency]/page.tsx Pair detail page

components/
  AlertsPanel.tsx          Risk alert list
  CarryMatrix.tsx          G10 dashboard table
  MetricCard.tsx           Summary metric cards
  PairCharts.tsx           Pair-level charts
  RegimeBadge.tsx          Regime and risk labels
  Sparkline.tsx            Compact table trend chart
  StressDecomposition.tsx  Driver breakdown

lib/
  format.ts                Formatting and UI tone helpers
  metrics.ts               Scoring, CLP, regimes, alerts
  mock-data.ts             Sample data for MVP
  types.ts                 Shared TypeScript types
```

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Deploy On Vercel

1. Push this project to GitHub, for example `germine1/carry_trade`.
2. In Vercel, choose **New Project**.
3. Import the GitHub repository.
4. Keep the default Next.js settings.
5. Deploy.

## Data Roadmap

The MVP uses sample data so the interface works immediately. The next step is to replace `lib/mock-data.ts` with real feeds:

- FX spot: Yahoo Finance, Stooq, Polygon, Twelve Data, Bloomberg, or Refinitiv.
- Rates: FRED, central banks, or market data APIs.
- CFTC positioning: CFTC Commitments of Traders files.
- Volatility: realized volatility first, implied volatility later if a data source is available.

## Model Notes

The dashboard uses a CLP-style framework:

```text
CLP = positioning score * carry factor * volatility score / volatility friction
MCLP = five-session percentage change in CLP
```

The formula is intentionally transparent for learning and iteration. Treat the current scores as a research framework, not a production trading signal.
# qf622
