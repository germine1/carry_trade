import type { PairMetrics } from "@/lib/types";

type StressDecompositionProps = {
  metrics: PairMetrics;
};

const segments = [
  { key: "positioning", label: "Positioning", color: "bg-blue-700" },
  { key: "volatility", label: "Volatility", color: "bg-amber-500" },
  { key: "carry", label: "Carry", color: "bg-emerald-600" },
] as const;

export function StressDecomposition({ metrics }: StressDecompositionProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Decomposition: explains the why behind CLP instead of only displaying the level. */}
      <h2 className="text-lg font-semibold text-ink">Stress Decomposition</h2>
      <p className="mt-1 text-sm text-slate-600">Share of modeled stress by driver.</p>

      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.color}
            style={{ width: `${metrics.decomposition[segment.key]}%` }}
            title={`${segment.label}: ${metrics.decomposition[segment.key]}%`}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {segments.map((segment) => (
          <div key={segment.key} className="rounded-lg border border-line bg-panel p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{segment.label}</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-ink">{metrics.decomposition[segment.key]}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}
