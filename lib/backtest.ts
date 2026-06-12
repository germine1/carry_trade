import type {
  BacktestEvent,
  BacktestPoint,
  BacktestPrice,
  BacktestResult,
  CurrencyCode,
  LossEpisode,
} from "./types";

const STARTING_CAPITAL = 10_000_000;
const START_DATE = "2024-01-02";

type BacktestConfig = {
  currency: CurrencyCode;
  pair: string;
  ticker: string;
  quoteConvention: "USD per FX" | "FX per USD";
  annualCarry: number;
};

export const backtestConfigs: BacktestConfig[] = [
  { currency: "JPY", pair: "USD/JPY", ticker: "JPY=X", quoteConvention: "FX per USD", annualCarry: 0.0482 },
  { currency: "CHF", pair: "USD/CHF", ticker: "CHF=X", quoteConvention: "FX per USD", annualCarry: 0.0378 },
  { currency: "EUR", pair: "EUR/USD", ticker: "EURUSD=X", quoteConvention: "USD per FX", annualCarry: 0.0185 },
  { currency: "GBP", pair: "GBP/USD", ticker: "GBPUSD=X", quoteConvention: "USD per FX", annualCarry: 0.0094 },
  { currency: "CAD", pair: "USD/CAD", ticker: "CAD=X", quoteConvention: "FX per USD", annualCarry: 0.0071 },
  { currency: "AUD", pair: "AUD/USD", ticker: "AUDUSD=X", quoteConvention: "USD per FX", annualCarry: 0.0048 },
  { currency: "NZD", pair: "NZD/USD", ticker: "NZDUSD=X", quoteConvention: "USD per FX", annualCarry: -0.0024 },
  { currency: "SEK", pair: "USD/SEK", ticker: "SEK=X", quoteConvention: "FX per USD", annualCarry: 0.0193 },
  { currency: "NOK", pair: "USD/NOK", ticker: "NOK=X", quoteConvention: "FX per USD", annualCarry: 0.0058 },
  { currency: "DKK", pair: "USD/DKK", ticker: "DKK=X", quoteConvention: "FX per USD", annualCarry: 0.0182 },
];

export const backtestStartDate = START_DATE;
export const backtestStartingCapital = STARTING_CAPITAL;

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const toUnixSeconds = (date: string) => Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);

const todayIso = () => new Date().toISOString().slice(0, 10);

export const marketEvents: BacktestEvent[] = [
  {
    date: "2024-03-19",
    title: "BOJ ends negative rates",
    category: "BOJ",
    detail: "The Bank of Japan ended its negative interest-rate policy, changing the funding-rate backdrop for JPY carry.",
    sourceLabel: "Bank of Japan",
    sourceUrl: "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2024/k240319a.pdf",
  },
  {
    date: "2024-04-29",
    title: "Japan suspected yen intervention",
    category: "Intervention",
    detail: "USD/JPY volatility rose as Japanese authorities were widely reported to have intervened around late April and early May.",
    sourceLabel: "Japan Ministry of Finance",
    sourceUrl: "https://www.mof.go.jp/english/policy/international_policy/reference/feio/index.htm",
  },
  {
    date: "2024-07-31",
    title: "BOJ hikes and QT plan",
    category: "BOJ",
    detail: "The BOJ raised rates and announced plans to reduce JGB purchases, a key catalyst for the August carry unwind.",
    sourceLabel: "Bank of Japan",
    sourceUrl: "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2024/k240731a.pdf",
  },
  {
    date: "2024-08-05",
    title: "Global carry unwind",
    category: "Risk",
    detail: "Risk assets sold off and JPY strengthened sharply, exposing crowded carry trades to forced deleveraging.",
    sourceLabel: "Market episode",
    sourceUrl: "https://www.bis.org/publ/qtrpdf/r_qt2409.htm",
  },
  {
    date: "2024-09-18",
    title: "Fed starts easing cycle",
    category: "Fed",
    detail: "The Fed cut the target range by 50 bps, reducing USD rate support at the margin.",
    sourceLabel: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20240918a.htm",
  },
  {
    date: "2024-11-07",
    title: "Fed cuts 25 bps",
    category: "Fed",
    detail: "The Fed lowered rates again, continuing the shift from peak carry support.",
    sourceLabel: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20241107a.htm",
  },
  {
    date: "2024-12-18",
    title: "Fed cuts 25 bps",
    category: "Fed",
    detail: "A further Fed cut tightened the gap between USD carry and lower-yielding funding currencies.",
    sourceLabel: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20241218a.htm",
  },
  {
    date: "2025-01-24",
    title: "BOJ hikes to around 0.5%",
    category: "BOJ",
    detail: "The BOJ raised its policy rate, further reducing the structural appeal of short-JPY funding.",
    sourceLabel: "Bank of Japan",
    sourceUrl: "https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2025/k250124a.pdf",
  },
  {
    date: "2025-04-02",
    title: "US tariff shock",
    category: "Trade",
    detail: "A trade-policy shock drove broad risk repricing and volatility, a hostile backdrop for leveraged carry.",
    sourceLabel: "White House",
    sourceUrl: "https://www.whitehouse.gov/",
  },
  {
    date: "2026-04-29",
    title: "Fed holds at 3.50%-3.75%",
    category: "Fed",
    detail: "The Fed held rates steady, keeping USD carry relevant while markets watched the next policy turn.",
    sourceLabel: "Federal Reserve",
    sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260429a.htm",
  },
];

export const fetchYahooPrices = async (ticker: string, startDate = START_DATE, endDate = todayIso()) => {
  const params = new URLSearchParams({
    period1: String(toUnixSeconds(startDate)),
    period2: String(toUnixSeconds(endDate) + 86_400),
    interval: "1d",
    events: "history",
    includeAdjustedClose: "true",
  });
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?${params.toString()}`, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${ticker}: ${response.status}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps: number[] | undefined = result?.timestamp;
  const closes: Array<number | null> | undefined = result?.indicators?.quote?.[0]?.close;

  if (!timestamps?.length || !closes?.length) {
    throw new Error(`Yahoo response had no prices for ${ticker}`);
  }

  return timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: closes[index],
    }))
    .filter((point): point is BacktestPrice => typeof point.close === "number" && Number.isFinite(point.close));
};

export const makeFallbackPrices = (config: BacktestConfig): BacktestPrice[] => {
  const start = new Date(`${START_DATE}T00:00:00Z`);
  const end = new Date(`${todayIso()}T00:00:00Z`);
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
  const base = config.quoteConvention === "FX per USD" ? 1.2 + config.annualCarry * 85 : 1.05 - config.annualCarry * 8;

  return Array.from({ length: totalDays + 1 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    const drift = config.annualCarry * index * 0.0009;
    const cycle = Math.sin(index / 28) * 0.025 + Math.cos(index / 73) * 0.018;
    const shock =
      iso >= "2024-08-01" && iso <= "2024-08-12"
        ? config.currency === "JPY"
          ? -0.09
          : -0.025
        : iso >= "2025-04-02" && iso <= "2025-04-14"
          ? -0.035
          : 0;
    const close = config.quoteConvention === "FX per USD" ? base * (1 + drift + cycle + shock) : base * (1 - drift + cycle - shock);

    return { date: iso, close: round(Math.max(close, 0.1), 5) };
  }).filter((_, index) => index % 7 !== 0 && index % 7 !== 6);
};

const spotReturnForLongUsd = (config: BacktestConfig, previousSpot: number, nextSpot: number) => {
  const rawReturn = nextSpot / previousSpot - 1;
  return config.quoteConvention === "FX per USD" ? rawReturn : -rawReturn;
};

export const runCarryBacktest = (
  config: BacktestConfig,
  prices: BacktestPrice[],
  dataSource: "Yahoo Finance" | "Fallback sample",
): BacktestResult => {
  const sortedPrices = [...prices].sort((left, right) => left.date.localeCompare(right.date));
  const dailyCarryReturn = config.annualCarry / 252;
  let equity = STARTING_CAPITAL;
  let peak = STARTING_CAPITAL;

  const points: BacktestPoint[] = sortedPrices.map((price, index) => {
    if (index === 0) {
      return {
        date: price.date,
        spot: price.close,
        equity,
        pnl: 0,
        drawdown: 0,
        dailyReturn: 0,
        spotReturn: 0,
        carryReturn: 0,
      };
    }

    const previousSpot = sortedPrices[index - 1].close;
    const spotReturn = spotReturnForLongUsd(config, previousSpot, price.close);
    const dailyReturn = spotReturn + dailyCarryReturn;
    equity *= 1 + dailyReturn;
    peak = Math.max(peak, equity);

    return {
      date: price.date,
      spot: price.close,
      equity: round(equity, 2),
      pnl: round(equity - STARTING_CAPITAL, 2),
      drawdown: round(equity / peak - 1, 4),
      dailyReturn: round(dailyReturn, 5),
      spotReturn: round(spotReturn, 5),
      carryReturn: round(dailyCarryReturn, 5),
    };
  });

  const lossEpisodes = buildLossEpisodes(points);
  const worstDay = points.reduce((worst, point) => (point.dailyReturn < worst.dailyReturn ? point : worst), points[0]);
  const maxDrawdown = points.reduce((worst, point) => Math.min(worst, point.drawdown), 0);
  const lastPoint = points[points.length - 1];

  return {
    summary: {
      currency: config.currency,
      pair: config.pair,
      finalEquity: lastPoint.equity,
      totalPnl: round(lastPoint.equity - STARTING_CAPITAL, 2),
      totalReturn: round(lastPoint.equity / STARTING_CAPITAL - 1, 4),
      maxDrawdown,
      worstDayReturn: worstDay.dailyReturn,
      worstDayDate: worstDay.date,
      lossDays: points.filter((point) => point.dailyReturn < 0).length,
      dataSource,
    },
    points,
    lossEpisodes,
    events: marketEvents,
  };
};

const buildLossEpisodes = (points: BacktestPoint[]): LossEpisode[] => {
  const episodes: LossEpisode[] = [];
  let currentStart: string | null = null;
  let currentTrough = "";
  let currentMaxDrawdown = 0;

  points.forEach((point) => {
    const underwater = point.drawdown < -0.015 || point.dailyReturn < -0.01;

    if (underwater && !currentStart) {
      currentStart = point.date;
      currentTrough = point.date;
      currentMaxDrawdown = point.drawdown;
    }

    if (currentStart && point.drawdown < currentMaxDrawdown) {
      currentTrough = point.date;
      currentMaxDrawdown = point.drawdown;
    }

    if (currentStart && point.drawdown >= -0.003 && point.dailyReturn >= 0) {
      episodes.push(makeEpisode(currentStart, currentTrough, point.date, currentMaxDrawdown));
      currentStart = null;
      currentTrough = "";
      currentMaxDrawdown = 0;
    }
  });

  if (currentStart) {
    episodes.push(makeEpisode(currentStart, currentTrough, null, currentMaxDrawdown));
  }

  return episodes
    .map((episode) => ({
      ...episode,
      events: eventsNearEpisode(episode),
    }))
    .sort((left, right) => left.maxDrawdown - right.maxDrawdown)
    .slice(0, 8);
};

const makeEpisode = (startDate: string, troughDate: string, endDate: string | null, maxDrawdown: number): LossEpisode => ({
  startDate,
  troughDate,
  endDate,
  durationDays: Math.max(
    1,
    Math.round(((new Date(`${endDate ?? troughDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86_400_000)),
  ),
  maxDrawdown: round(maxDrawdown, 4),
  events: [],
});

const eventsNearEpisode = (episode: LossEpisode) => {
  const start = new Date(`${episode.startDate}T00:00:00Z`).getTime() - 5 * 86_400_000;
  const end = new Date(`${episode.endDate ?? episode.troughDate}T00:00:00Z`).getTime() + 5 * 86_400_000;

  return marketEvents.filter((event) => {
    const eventTime = new Date(`${event.date}T00:00:00Z`).getTime();
    return eventTime >= start && eventTime <= end;
  });
};

export const getBacktestConfig = (currency: CurrencyCode) => backtestConfigs.find((config) => config.currency === currency);
