import type { CarryAlert } from "@/lib/types";

type AlertsPanelProps = {
  alerts: CarryAlert[];
};

const severityStyles = {
  Critical: "border-red-200 bg-red-50 text-danger",
  Warning: "border-amber-200 bg-amber-50 text-warning",
  Watch: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Info: "border-slate-200 bg-slate-50 text-slate-700",
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Alerts are written like a trading-risk blotter: short, ranked, and actionable. */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Risk Alerts</h2>
          <p className="text-sm text-slate-600">Generated from CLP, MCLP, positioning, and volatility thresholds.</p>
        </div>
        <span className="rounded-md bg-panel px-2.5 py-1 text-xs font-semibold text-slate-600">{alerts.length} live</span>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 8).map((alert) => (
          <article key={`${alert.currency}-${alert.title}`} className={`rounded-lg border p-3 ${severityStyles[alert.severity]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {alert.currency}: {alert.title}
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-700">{alert.detail}</p>
              </div>
              <span className="shrink-0 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold">{alert.severity}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
