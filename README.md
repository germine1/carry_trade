# USD vs G10 Carry Monitor

A Vercel-ready dashboard for monitoring USD carry attractiveness, positioning stress, volatility pressure, and unwind risk across G10 currencies.

## What The Dashboard Shows

- **Overview regime**: a compact market read across USD/G10 carry trades.
- **Carry matrix**: spot, returns, carry, CFTC z-score, volatility z-score, CLP, MCLP, and regime.
- **Risk alerts**: generated from CLP, CLP momentum, crowding, and volatility thresholds.
- **Pair deep dives**: click a currency to inspect spot path, factor stack, and stress decomposition.
- **Carry backtest**: simulates an always-on long-USD carry trade from 2024 to today with USD 10m starting capital.

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

## Daily Refresh

The main dashboard now reads from a server-side market-data layer:

```text
app/api/market-data/route.ts
lib/market-data.ts
```

The route attempts to refresh:

- FX spot and recent returns from Yahoo Finance chart data.
- US two-year yield from FRED using `FRED_API_KEY`.
- Realized volatility from recent FX spot returns.

If live data is unavailable, the dashboard falls back to `lib/mock-data.ts` so the app still renders.

Vercel Cron is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/market-data?refresh=true",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This calls the refresh endpoint once per day at midnight UTC. Add `FRED_API_KEY` in Vercel project environment variables for Production and Preview.

## Model Notes

The dashboard uses a CLP-style framework:

```text
CLP = positioning score * carry factor * volatility score / volatility friction
MCLP = five-session percentage change in CLP
```

The formula is intentionally transparent for learning and iteration. Treat the current scores as a research framework, not a production trading signal.

## Backtest Notes

The backtest section uses a simple approximation:

```text
daily P&L return = USD-long spot return + annualized carry / 252
starting capital = USD 10,000,000
start date = 2024-01-02
```

The app attempts to pull daily FX spot history from Yahoo Finance on demand. If Yahoo is unavailable, it falls back to deterministic sample data so the dashboard still renders locally and on Vercel.

The event overlay is curated for major carry-risk episodes, including BOJ policy shifts, Japan FX intervention periods, Fed cuts, and broad risk-off shocks. It should be expanded as the research framework matures.
# qf622
