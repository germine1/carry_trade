import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricCard } from "@/components/MetricCard";
import { PairCharts } from "@/components/PairCharts";
import { RegimeBadge } from "@/components/RegimeBadge";
import { StressDecomposition } from "@/components/StressDecomposition";
import { pairObservations } from "@/lib/mock-data";
import { buildAllMetrics } from "@/lib/metrics";
import { formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

type PairPageProps = {
  params: Promise<{
    currency: CurrencyCode;
  }>;
};

export function generateStaticParams() {
  return pairObservations.map((item) => ({ currency: item.currency }));
}

export default async function PairPage({ params }: PairPageProps) {
  const { currency } = await params;
  const metrics = buildAllMetrics(pairObservations);
  const pair = metrics.find((item) => item.currency === currency);

  if (!pair) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 text-ink md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation and identity: keeps the pair detail connected to the overview workflow. */}
        <header className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:text-blue-900">
            Back to dashboard
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pair deep dive</p>
              <h1 className="mt-1 text-3xl font-semibold text-ink">{pair.pair}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{pair.notes}</p>
            </div>
            <RegimeBadge label={pair.regime} />
          </div>
        </header>

        {/* Pair metrics: the fastest way to understand carry, crowding, vol, and momentum. */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Spot"
            value={formatNumber(pair.spot, pair.spot > 10 ? 2 : 3)}
            detail={`${pair.quoteConvention}; 5D move ${formatSignedPercent(pair.fiveDayReturn)}.`}
          />
          <MetricCard
            label="Policy carry"
            value={formatPercent(pair.policyRateDiff)}
            detail={`2Y yield differential is ${formatPercent(pair.twoYearYieldDiff)}.`}
            tone={pair.policyRateDiff > 1 ? "good" : "neutral"}
          />
          <MetricCard
            label="CLP"
            value={formatNumber(pair.clp)}
            detail={`Five-session momentum is ${formatSignedPercent(pair.mclp)}.`}
            tone={pair.clp >= 6.5 ? "danger" : pair.clp >= 3.6 ? "watch" : "neutral"}
          />
          <MetricCard
            label="Risk-adjusted carry"
            value={formatNumber(pair.riskAdjustedCarry)}
            detail={`Realized volatility is ${formatPercent(pair.realizedVol)}.`}
            tone={pair.riskAdjustedCarry > 0.3 ? "good" : "neutral"}
          />
        </section>

        <PairCharts metrics={pair} />

        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <StressDecomposition metrics={pair} />

          {/* Interpretation: a plain-English reading of the model state for learning and review. */}
          <aside className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">Institutional Read</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {pair.currency} is currently classified as <strong>{pair.regime}</strong>. The model assigns{" "}
              <strong>{pair.decomposition.positioning}%</strong> of stress to positioning,{" "}
              <strong>{pair.decomposition.volatility}%</strong> to volatility, and{" "}
              <strong>{pair.decomposition.carry}%</strong> to carry compression.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The dashboard should be read as a risk monitor: attractive carry can remain intact while crowded positioning
              and higher volatility still increase the chance of forced deleveraging.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
