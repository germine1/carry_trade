import { pairObservations } from "./mock-data";
import type { CurrencyCode, PairObservation } from "./types";

type MarketDataResult = {
  timestamp: string;
  source: "Live Yahoo/FRED" | "Fallback mock";
  observations: PairObservation[];
};

type FxConfig = {
  currency: CurrencyCode;
  ticker: string;
  fredTwoYearSeries?: string;
};

const fxConfigs: FxConfig[] = [
  { currency: "JPY", ticker: "JPY=X" },
  { currency: "CHF", ticker: "CHF=X" },
  { currency: "EUR", ticker: "EURUSD=X" },
  { currency: "GBP", ticker: "GBPUSD=X" },
  { currency: "CAD", ticker: "CAD=X" },
  { currency: "AUD", ticker: "AUDUSD=X" },
  { currency: "NZD", ticker: "NZDUSD=X" },
  { currency: "SEK", ticker: "SEK=X" },
  { currency: "NOK", ticker: "NOK=X" },
  { currency: "DKK", ticker: "DKK=X" },
];

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const toUnixSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

const daysAgo = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

const formatTimestamp = () =>
  new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date());

// Yahoo chart data supplies daily spot history used for returns, realized volatility, and sparklines.
const fetchYahooHistory = async (ticker: string) => {
  const params = new URLSearchParams({
    period1: String(toUnixSeconds(daysAgo(80))),
    period2: String(toUnixSeconds(new Date()) + 86_400),
    interval: "1d",
    events: "history",
    includeAdjustedClose: "true",
  });
  const response = await fetch(`${YAHOO_BASE_URL}/${ticker}?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${ticker}: ${response.status}`);
  }

  const payload = await response.json();
  const closes: Array<number | null> | undefined = payload?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

  const prices = closes?.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? [];
  if (prices.length < 25) {
    throw new Error(`Yahoo returned too few prices for ${ticker}`);
  }

  return prices;
};

// FRED is used for a first live rates input. The model falls back if the key or series is unavailable.
const fetchLatestFredValue = async (seriesId: string) => {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error("FRED_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    sort_order: "desc",
    limit: "1",
  });
  const response = await fetch(`${FRED_BASE_URL}?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    throw new Error(`FRED request failed for ${seriesId}: ${response.status}`);
  }

  const payload = await response.json();
  const value = Number(payload?.observations?.[0]?.value);
  if (!Number.isFinite(value)) {
    throw new Error(`FRED returned invalid value for ${seriesId}`);
  }

  return value;
};

const annualizedRealizedVol = (prices: number[]) => {
  const returns = prices.slice(1).map((price, index) => price / prices[index] - 1);
  const recentReturns = returns.slice(-20);
  const mean = recentReturns.reduce((total, value) => total + value, 0) / recentReturns.length;
  const variance = recentReturns.reduce((total, value) => total + (value - mean) ** 2, 0) / recentReturns.length;

  return Math.sqrt(variance) * Math.sqrt(252) * 100;
};

const signedReturn = (prices: number[], lookback: number, quoteConvention: PairObservation["quoteConvention"]) => {
  const current = prices[prices.length - 1];
  const previous = prices[Math.max(0, prices.length - 1 - lookback)];
  const rawReturn = (current / previous - 1) * 100;

  // Convert to long-USD return convention for USD-per-foreign pairs.
  return quoteConvention === "USD per FX" ? -rawReturn : rawReturn;
};

const buildLiveObservation = async (observation: PairObservation) => {
  const config = fxConfigs.find((item) => item.currency === observation.currency);
  if (!config) return observation;

  const prices = await fetchYahooHistory(config.ticker);
  const realizedVol = annualizedRealizedVol(prices);
  const volZProxy = Math.max(-1, Math.min(3, (realizedVol - observation.realizedVol) / Math.max(observation.realizedVol * 0.45, 1)));
  const usTwoYear = await fetchLatestFredValue("DGS2").catch(() => null);
  const twoYearYieldDiff = usTwoYear ? round(usTwoYear - (observation.twoYearYieldDiff > 0 ? observation.policyRateDiff - observation.twoYearYieldDiff : 0), 2) : observation.twoYearYieldDiff;

  return {
    ...observation,
    spot: round(prices[prices.length - 1], prices[prices.length - 1] > 10 ? 2 : 4),
    oneDayReturn: round(signedReturn(prices, 1, observation.quoteConvention), 2),
    fiveDayReturn: round(signedReturn(prices, 5, observation.quoteConvention), 2),
    twentyDayReturn: round(signedReturn(prices, 20, observation.quoteConvention), 2),
    twoYearYieldDiff,
    realizedVol: round(realizedVol, 1),
    realizedVolZScore: round(volZProxy, 2),
    volFriction: round(Math.max(0.52, Math.min(1, 1 - Math.max(volZProxy, 0) * 0.13)), 3),
    sparkline: prices.slice(-7).map((price) => round(price, price > 10 ? 2 : 4)),
  };
};

export const getMarketData = async (): Promise<MarketDataResult> => {
  try {
    const observations = await Promise.all(pairObservations.map(buildLiveObservation));

    return {
      timestamp: `${formatTimestamp()} · daily cached`,
      source: "Live Yahoo/FRED",
      observations,
    };
  } catch {
    return {
      timestamp: `${formatTimestamp()} · fallback data`,
      source: "Fallback mock",
      observations: pairObservations,
    };
  }
};
