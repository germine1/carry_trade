import type {
  AlertSeverity,
  CarryAlert,
  DataSourceStatus,
  PairMetrics,
  PairObservation,
  PairSessionMetrics,
  Regime,
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

// Scores convert mixed market units into comparable 0+ stress and attractiveness values.
const scoreCarry = (policyRateDiff: number) => clamp((policyRateDiff + 0.5) / 5.25, 0.1, 1.35);
const scorePositioning = (zScore: number) => clamp(1 + zScore / 2.4, 0.35, 2.35);
const scoreVolatility = (zScore: number) => clamp(1 + zScore / 2.2, 0.45, 2.25);

// Regimes keep the dashboard interpretable; users should not need to reverse engineer raw scores.
const classifyRegime = (clp: number, mclp: number, carryScore: number): Regime => {
  if (clp >= 6.5 || (clp >= 4.5 && mclp >= 45)) return "Active Liquidation";
  if (clp >= 3.6 || mclp >= 35) return "High Unwind Risk";
  if (clp >= 2.4) return "Crowded Carry";
  if (carryScore >= 0.7 && clp < 2.4) return "Carry Supportive";
  return "Low Risk";
};

// Log decomposition explains whether stress comes from crowded positioning, volatility, or carry.
const decomposeStress = (positioningScore: number, volatilityScore: number, carryFactor: number) => {
  const positioning = Math.max(Math.log(positioningScore), 0.01);
  const volatility = Math.max(Math.log(volatilityScore), 0.01);
  const carry = Math.max(Math.log(carryFactor + 1), 0.01);
  const total = positioning + volatility + carry;

  return {
    positioning: round((positioning / total) * 100, 1),
    volatility: round((volatility / total) * 100, 1),
    carry: round((carry / total) * 100, 1),
  };
};

export const buildPairMetrics = (observation: PairObservation): PairMetrics => {
  const carryScore = scoreCarry(observation.policyRateDiff);
  const carryFactor = clamp(0.7 + carryScore * 0.55, 0.65, 1.55);
  const positioningScore = scorePositioning(observation.cftcZScore);
  const volatilityScore = scoreVolatility(observation.realizedVolZScore);
  const volatilityShock = round(Math.max(observation.realizedVolZScore, 0) * 9.4, 1);
  const carryCompression = round(Math.max(0, 1.2 - carryFactor) * 100, 1);
  const clp = round((positioningScore * carryFactor * volatilityScore) / observation.volFriction, 2);
  const mclp = round(((clp - observation.clpFiveDaysAgo) / observation.clpFiveDaysAgo) * 100, 1);
  const riskAdjustedCarry = round(observation.policyRateDiff / observation.realizedVol, 2);

  return {
    ...observation,
    carryScore: round(carryScore * 100, 1),
    carryFactor: round(carryFactor, 3),
    positioningScore: round(positioningScore, 2),
    volatilityScore: round(volatilityScore, 2),
    volatilityShock,
    carryCompression,
    clp,
    mclp,
    riskAdjustedCarry,
    regime: classifyRegime(clp, mclp, carryScore),
    decomposition: decomposeStress(positioningScore, volatilityScore, carryFactor),
  };
};

const sessionDates = ["18 May", "25 May", "29 May", "01 Jun", "03 Jun", "05 Jun"];

// Session history creates the lower-dashboard path view from today's snapshot.
// In production this should be replaced by true daily observations from yfinance/FRED/CFTC.
export const buildPairSessionHistory = (metrics: PairMetrics): PairSessionMetrics[] => {
  const startClp = Math.max(0.85, metrics.clpFiveDaysAgo * 0.66);
  const clpPath = [
    startClp,
    metrics.clpFiveDaysAgo * 0.93,
    metrics.clpFiveDaysAgo,
    metrics.clpFiveDaysAgo * 1.08,
    metrics.clp * 0.88,
    metrics.clp,
  ];

  return clpPath.map((clpValue, index) => {
    const progress = index / (clpPath.length - 1);
    const priorClp = index === 0 ? null : clpPath[Math.max(0, index - 2)];
    const spot = metrics.sparkline[Math.min(index, metrics.sparkline.length - 1)];
    const cftcZScore = round(metrics.cftcZScore * (0.52 + progress * 0.48), 2);
    const positioningScore = round(metrics.positioningScore * (0.58 + progress * 0.42), 2);
    const volatilityShock = round(metrics.volatilityShock * (0.12 + progress * 0.88), 1);
    const volFriction = round(clamp(1 - (1 - metrics.volFriction) * (0.18 + progress * 0.82), 0.45, 1.05), 3);
    const carryFactor = round(metrics.carryFactor * (0.98 + progress * 0.02), 3);

    return {
      session: index === clpPath.length - 1 ? "S-01" : `S-${15 - index * 3}`,
      date: sessionDates[index],
      spot,
      cftcZScore,
      positioningScore,
      volatilityShock,
      volFriction,
      carryFactor,
      clp: round(clpValue, 2),
      mclp: priorClp ? round(((clpValue - priorClp) / priorClp) * 100, 1) : null,
    };
  });
};

export const clpRegimeRows = [
  { range: "< 2.0", regime: "Normal", interpretation: "Low stress, ample risk capacity." },
  { range: "2.0 - 4.0", regime: "Watch", interpretation: "Elevated monitoring." },
  { range: "4.0 - 6.0", regime: "Stress", interpretation: "Rising stress, reduced capacity." },
  { range: "6.0 - 8.0", regime: "High Risk", interpretation: "High probability of forced de-risking." },
  { range: "> 8.0", regime: "Critical", interpretation: "Very high probability of unwind." },
];

export const mclpRegimeRows = [
  { range: "< 20%", regime: "Stable", interpretation: "No material acceleration." },
  { range: "20% - 50%", regime: "Acceleration", interpretation: "Risk is building." },
  { range: "50% - 100%", regime: "Convex Stress", interpretation: "Rapid deterioration." },
  { range: "> 100%", regime: "Kinetic Risk Alert", interpretation: "High risk of abrupt unwind." },
];

export const buildIndicatorRows = (metrics: PairMetrics) => [
  {
    indicator: "Z-COT positioning",
    value: metrics.cftcZScore.toFixed(2),
    interpretation:
      metrics.cftcZScore >= 1.8 ? "Crowding is elevated versus history." : "Positioning is not yet extreme.",
  },
  {
    indicator: "PSI positioning saturation",
    value: metrics.positioningScore.toFixed(2),
    interpretation:
      metrics.positioningScore >= 1.7 ? "Leveraged positioning pressure is high." : "Positioning pressure is contained.",
  },
  {
    indicator: "Volatility shock",
    value: `+${metrics.volatilityShock.toFixed(1)}%`,
    interpretation:
      metrics.volatilityShock >= 12 ? "Volatility is above recent mean." : "Volatility shock is moderate.",
  },
  {
    indicator: "Volatility friction",
    value: metrics.volFriction.toFixed(3),
    interpretation:
      metrics.volFriction < 0.8 ? "VaR and balance-sheet friction are material." : "Risk capacity remains usable.",
  },
  {
    indicator: "Carry factor",
    value: metrics.carryFactor.toFixed(3),
    interpretation:
      metrics.carryFactor >= 1 ? "Carry remains broadly supportive." : "Carry support is weakening.",
  },
  {
    indicator: "CLP liquidation pressure",
    value: metrics.clp.toFixed(2),
    interpretation: `${metrics.regime} regime.`,
  },
  {
    indicator: "MCLP 5-session momentum",
    value: `${metrics.mclp > 0 ? "+" : ""}${metrics.mclp.toFixed(1)}%`,
    interpretation:
      metrics.mclp > 100
        ? "Kinetic risk alert."
        : metrics.mclp > 50
          ? "Convex stress is developing."
          : metrics.mclp > 20
            ? "Risk acceleration is building."
            : "Momentum is stable.",
  },
];

export const buildDiagnosisRows = (metrics: PairMetrics) => [
  {
    title: "Funding Conditions",
    detail:
      metrics.carryFactor >= 1
        ? "The interest-rate differential remains supportive, so stress is not primarily an income problem."
        : "Carry support has softened, so funding economics need closer review.",
  },
  {
    title: "Leverage Build-up",
    detail:
      metrics.cftcZScore >= 1.8
        ? "Positioning is crowded, increasing the risk of one-sided liquidation."
        : "Positioning is not extreme, reducing immediate crowding pressure.",
  },
  {
    title: "Risk Capacity",
    detail:
      metrics.volFriction < 0.8
        ? "Volatility friction is reducing VaR capacity and can force de-risking even if carry stays positive."
        : "Volatility friction is manageable, leaving more room for risk absorption.",
  },
  {
    title: "Overall Diagnosis",
    detail:
      metrics.clp >= 3.6
        ? "The pair is vulnerable to a balance-sheet or volatility shock, especially if spot moves against carry."
        : "The pair is not yet in a high-stress zone, but changes in momentum should be watched.",
  },
];

export const dataSourceStatuses: DataSourceStatus[] = [
  { label: "FX spot and returns", source: "yfinance", quality: "Observed" },
  { label: "Realized volatility", source: "Calculated from spot returns", quality: "Calculated" },
  { label: "Rates and yields", source: "FRED / central-bank series", quality: "Observed" },
  { label: "CFTC positioning", source: "CFTC COT weekly files", quality: "Observed" },
  { label: "Implied volatility", source: "Paid market data preferred", quality: "Proxy" },
  { label: "Forward points", source: "Broker or paid FX data preferred", quality: "Proxy" },
];

export const buildAllMetrics = (observations: PairObservation[]) =>
  observations.map(buildPairMetrics).sort((left, right) => right.clp - left.clp);

const severityRank: Record<AlertSeverity, number> = {
  Critical: 4,
  Warning: 3,
  Watch: 2,
  Info: 1,
};

const makeAlert = (
  metrics: PairMetrics,
  severity: AlertSeverity,
  title: string,
  detail: string,
): CarryAlert => ({
  currency: metrics.currency,
  pair: metrics.pair,
  severity,
  title,
  detail,
});

// Alerts translate model thresholds into a risk-monitor style reading list.
export const buildAlerts = (metrics: PairMetrics[]) =>
  metrics
    .flatMap((item) => {
      const alerts: CarryAlert[] = [];

      if (item.clp >= 6.5) {
        alerts.push(
          makeAlert(
            item,
            "Critical",
            "Active liquidation pressure",
            `CLP is ${item.clp}, with ${item.mclp}% five-session momentum.`,
          ),
        );
      } else if (item.clp >= 3.6) {
        alerts.push(
          makeAlert(
            item,
            "Warning",
            "High unwind risk",
            `CLP is ${item.clp}; positioning and volatility deserve close monitoring.`,
          ),
        );
      }

      if (item.mclp >= 35) {
        alerts.push(
          makeAlert(
            item,
            "Warning",
            "Kinetic risk rising",
            `CLP momentum is ${item.mclp}%, suggesting fast deterioration in risk absorption.`,
          ),
        );
      }

      if (item.cftcZScore >= 1.8) {
        alerts.push(
          makeAlert(
            item,
            "Watch",
            "Crowding elevated",
            `CFTC positioning z-score is ${item.cftcZScore}, near crowded-trade territory.`,
          ),
        );
      }

      if (item.realizedVolZScore >= 1.4) {
        alerts.push(
          makeAlert(
            item,
            "Watch",
            "Volatility friction rising",
            `Realized volatility z-score is ${item.realizedVolZScore}.`,
          ),
        );
      }

      return alerts;
    })
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]);

export const summarizeMarket = (metrics: PairMetrics[]) => {
  const averageCarry = metrics.reduce((total, item) => total + item.carryScore, 0) / metrics.length;
  const averageClp = metrics.reduce((total, item) => total + item.clp, 0) / metrics.length;
  const highestRisk = metrics.reduce((top, item) => (item.clp > top.clp ? item : top), metrics[0]);
  const fastestDeterioration = metrics.reduce((top, item) => (item.mclp > top.mclp ? item : top), metrics[0]);

  return {
    averageCarry: round(averageCarry, 1),
    averageClp: round(averageClp, 2),
    highestRisk,
    fastestDeterioration,
    globalRegime: averageClp >= 3.6 ? "High Unwind Risk" : averageClp >= 2.4 ? "Crowded Carry" : "Carry Supportive",
  };
};
