import type { AlertSeverity, CarryAlert, PairMetrics, PairObservation, Regime } from "./types";

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
  const clp = round((positioningScore * carryFactor * volatilityScore) / observation.volFriction, 2);
  const mclp = round(((clp - observation.clpFiveDaysAgo) / observation.clpFiveDaysAgo) * 100, 1);
  const riskAdjustedCarry = round(observation.policyRateDiff / observation.realizedVol, 2);

  return {
    ...observation,
    carryScore: round(carryScore * 100, 1),
    carryFactor: round(carryFactor, 3),
    positioningScore: round(positioningScore, 2),
    volatilityScore: round(volatilityScore, 2),
    clp,
    mclp,
    riskAdjustedCarry,
    regime: classifyRegime(clp, mclp, carryScore),
    decomposition: decomposeStress(positioningScore, volatilityScore, carryFactor),
  };
};

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
