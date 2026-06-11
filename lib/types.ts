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

export type CarryAlert = {
  currency: CurrencyCode;
  pair: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
};
