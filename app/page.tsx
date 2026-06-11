import { AlertsPanel } from "@/components/AlertsPanel";
import { CarryMatrix } from "@/components/CarryMatrix";
import { MetricCard } from "@/components/MetricCard";
import { RegimeBadge } from "@/components/RegimeBadge";
import { marketTimestamp, pairObservations } from "@/lib/mock-data";
import { buildAlerts, buildAllMetrics, summarizeMarket } from "@/lib/metrics";
import { formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";

export default function Home() {
  const metrics = buildAllMetrics(pairObservations);
  const alerts = buildAlerts(metrics);
  const summary = summarizeMarket(metrics);

  return (
    <main className="min-h-screen px-4 py-6 text-ink md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top bar: establishes the dashboard as a live market monitor, not a static report. */}
        <header className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Carry trade control room</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">USD vs G10 Carry Monitor</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tracks carry attractiveness, speculative crowding, volatility friction, CLP pressure, and unwind momentum
              across major USD currency trades.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <RegimeBadge label={summary.globalRegime} />
            <p className="text-sm text-slate-500">Last updated: {marketTimestamp}</p>
          </div>
        </header>

        {/* Metric strip: gives the reader the state of the market before they inspect rows. */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Average carry score"
            value={formatPercent(summary.averageCarry)}
            detail="Higher means USD carry is broadly attractive versus G10."
            tone="good"
          />
          <MetricCard
            label="Average CLP"
            value={formatNumber(summary.averageClp)}
            detail="Composite liquidation pressure across all monitored pairs."
            tone={summary.averageClp >= 3.6 ? "watch" : "neutral"}
          />
          <MetricCard
            label="Highest risk pair"
            value={summary.highestRisk.pair}
            detail={`CLP ${summary.highestRisk.clp}, regime ${summary.highestRisk.regime}.`}
            tone={summary.highestRisk.clp >= 6.5 ? "danger" : "watch"}
          />
          <MetricCard
            label="Fastest deterioration"
            value={summary.fastestDeterioration.currency}
            detail={`MCLP ${formatSignedPercent(summary.fastestDeterioration.mclp)} over five sessions.`}
            tone="watch"
          />
        </section>

        {/* Main layout: table on the left, alerts on the right for immediate triage. */}
        <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <CarryMatrix metrics={metrics} />
          <AlertsPanel alerts={alerts} />
        </section>
      </div>
    </main>
  );
}
