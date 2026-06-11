import Link from "next/link";
import type { PairMetrics } from "@/lib/types";
import { formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import { RegimeBadge } from "./RegimeBadge";
import { Sparkline } from "./Sparkline";

type CarryMatrixProps = {
  metrics: PairMetrics[];
};

export function CarryMatrix({ metrics }: CarryMatrixProps) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      {/* Section header: frames the table as the central risk surface. */}
      <div className="flex flex-col gap-1 border-b border-line px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">USD vs G10 Carry Matrix</h2>
          <p className="text-sm text-slate-600">Normalized as long USD versus each foreign currency.</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sorted by CLP risk</p>
      </div>

      {/* Table: dense by design, because this is the daily control-room view. */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-panel text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {[
                "CCY",
                "Spot",
                "5D",
                "20D",
                "Carry",
                "CFTC Z",
                "Vol Z",
                "CLP",
                "MCLP",
                "Regime",
                "Trend",
              ].map((header) => (
                <th key={header} className="border-b border-line px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((item) => (
              <tr key={item.currency} className="border-b border-line hover:bg-slate-50">
                <td className="border-b border-line px-4 py-3">
                  <Link href={`/pairs/${item.currency}`} className="font-semibold text-ink hover:text-blue-700">
                    {item.currency}
                  </Link>
                  <p className="text-xs text-slate-500">{item.pair}</p>
                </td>
                <td className="border-b border-line px-4 py-3 font-medium">{formatNumber(item.spot, item.spot > 10 ? 2 : 3)}</td>
                <td className="border-b border-line px-4 py-3">{formatSignedPercent(item.fiveDayReturn)}</td>
                <td className="border-b border-line px-4 py-3">{formatSignedPercent(item.twentyDayReturn)}</td>
                <td className="border-b border-line px-4 py-3">{formatPercent(item.policyRateDiff)}</td>
                <td className="border-b border-line px-4 py-3">{formatNumber(item.cftcZScore)}</td>
                <td className="border-b border-line px-4 py-3">{formatNumber(item.realizedVolZScore)}</td>
                <td className="border-b border-line px-4 py-3">
                  <RegimeBadge label={formatNumber(item.clp)} variant="risk" riskValue={item.clp} />
                </td>
                <td className="border-b border-line px-4 py-3">{formatSignedPercent(item.mclp)}</td>
                <td className="border-b border-line px-4 py-3">
                  <RegimeBadge label={item.regime} />
                </td>
                <td className="border-b border-line px-4 py-3">
                  <Sparkline values={item.sparkline} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
