export type CurrencyCode =
  | "EUR"
  | "JPY"
  | "GBP"
  | "CHF"
  | "CAD"
  | "AUD"
  | "NZD"
  | "SEK"
  | "NOK"
  | "DKK";

export type Regime =
  | "Low Risk"
  | "Carry Supportive"
  | "Crowded Carry"
  | "High Unwind Risk"
  | "Active Liquidation";

export type AlertSeverity = "Info" | "Watch" | "Warning" | "Critical";

export type DataQuality = "Observed" | "Calculated" | "Proxy" | "Manual";

export type PairObservation = {
  currency: CurrencyCode;
  pair: string;
  quoteConvention: "USD per FX" | "FX per USD";
  spot: number;
  oneDayReturn: number;
  fiveDayReturn: number;
  twentyDayReturn: number;
  policyRateDiff: number;
  twoYearYieldDiff: number;
  cftcZScore: number;
  realizedVol: number;
  realizedVolZScore: number;
  volFriction: number;
  clpFiveDaysAgo: number;
  sparkline: number[];
  notes: string;
};

export type PairMetrics = PairObservation & {
  carryScore: number;
  carryFactor: number;
  positioningScore: number;
  volatilityScore: number;
  volatilityShock: number;
  carryCompression: number;
  clp: number;
  mclp: number;
  riskAdjustedCarry: number;
  regime: Regime;
  decomposition: {
    positioning: number;
    volatility: number;
    carry: number;
  };
};

export type PairSessionMetrics = {
  session: string;
  date: string;
  spot: number;
  cftcZScore: number;
  positioningScore: number;
  volatilityShock: number;
  volFriction: number;
  carryFactor: number;
  clp: number;
  mclp: number | null;
};

export type DataSourceStatus = {
  label: string;
  source: string;
  quality: DataQuality;
};

export type CurrencyRefreshStatus = {
  currency: CurrencyCode;
  source: "Live Yahoo/FRED" | "Fallback mock";
  message: string;
};

export type MarketDataResult = {
  timestamp: string;
  source: "Live Yahoo/FRED" | "Mixed live/fallback" | "Fallback mock";
  observations: PairObservation[];
  refreshStatuses: CurrencyRefreshStatus[];
  liveCount: number;
  fallbackCount: number;
};

export type CarryAlert = {
  currency: CurrencyCode;
  pair: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
};

export type BacktestPrice = {
  date: string;
  close: number;
};

export type BacktestPoint = {
  date: string;
  spot: number;
  equity: number;
  pnl: number;
  drawdown: number;
  dailyReturn: number;
  spotReturn: number;
  carryReturn: number;
};

export type BacktestEvent = {
  date: string;
  title: string;
  category: "Fed" | "BOJ" | "Intervention" | "Risk" | "Inflation" | "Trade";
  detail: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type LossEpisode = {
  startDate: string;
  troughDate: string;
  endDate: string | null;
  durationDays: number;
  maxDrawdown: number;
  events: BacktestEvent[];
};

export type BacktestSummary = {
  currency: CurrencyCode;
  pair: string;
  finalEquity: number;
  totalPnl: number;
  totalReturn: number;
  maxDrawdown: number;
  worstDayReturn: number;
  worstDayDate: string;
  lossDays: number;
  dataSource: "Yahoo Finance" | "Fallback sample";
};

export type BacktestResult = {
  summary: BacktestSummary;
  points: BacktestPoint[];
  lossEpisodes: LossEpisode[];
  events: BacktestEvent[];
};
