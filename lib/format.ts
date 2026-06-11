export const formatPercent = (value: number, decimals = 1) => `${value.toFixed(decimals)}%`;

export const formatSignedPercent = (value: number, decimals = 1) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals = 2) => value.toFixed(decimals);

export const riskTone = (value: number) => {
  if (value >= 6.5) return "bg-red-100 text-danger border-red-200";
  if (value >= 3.6) return "bg-amber-100 text-warning border-amber-200";
  if (value >= 2.4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-emerald-100 text-positive border-emerald-200";
};

export const regimeTone = (regime: string) => {
  if (regime === "Active Liquidation") return "bg-red-100 text-danger border-red-200";
  if (regime === "High Unwind Risk") return "bg-amber-100 text-warning border-amber-200";
  if (regime === "Crowded Carry") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (regime === "Carry Supportive") return "bg-emerald-100 text-positive border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};
