"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber, formatPercent, formatSignedPercent, regimeTone } from "@/lib/format";
import {
  buildDiagnosisRows,
  buildIndicatorRows,
  buildPairSessionHistory,
  clpRegimeRows,
  dataSourceStatuses,
  mclpRegimeRows,
} from "@/lib/metrics";
import type { CurrencyCode, PairMetrics } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { RegimeBadge } from "./RegimeBadge";
import { StressDecomposition } from "./StressDecomposition";

type CurrencyDetailToggleProps = {
  metrics: PairMetrics[];
  initialCurrency: CurrencyCode;
};

const qualityTone = {
  Observed: "bg-emerald-100 text-positive border-emerald-200",
  Calculated: "bg-blue-100 text-blue-800 border-blue-200",
  Proxy: "bg-amber-100 text-warning border-amber-200",
  Manual: "bg-slate-100 text-slate-700 border-slate-200",
};

const clpThresholds = [
  { value: 2, label: "Watch", color: "#1f8a5b" },
  { value: 4, label: "Stress", color: "#b76b14" },
  { value: 6, label: "High Risk", color: "#b3261e" },
  { value: 8, label: "Critical", color: "#7f1d1d" },
];

export function CurrencyDetailToggle({ metrics, initialCurrency }: CurrencyDetailToggleProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(initialCurrency);
  const [isMounted, setIsMounted] = useState(false);

  const selected = metrics.find((item) => item.currency === selectedCurrency) ?? metrics[0];
  const sessionHistory = useMemo(() => buildPairSessionHistory(selected), [selected]);
  const indicatorRows = useMemo(() => buildIndicatorRows(selected), [selected]);
  const diagnosisRows = useMemo(() => buildDiagnosisRows(selected), [selected]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="space-y-5 rounded-lg border border-line bg-panel p-4 shadow-soft md:p-5">
      {/* Currency toggle: lets the top overview stay fixed while the lower analysis changes by pair. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Selected currency analysis</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">{selected.pair} stress and momentum</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Use the toggle to inspect each USD/G10 carry trade without leaving the overview dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-white p-2">
          {metrics.map((item) => (
            <button
              key={item.currency}
              type="button"
              onClick={() => setSelectedCurrency(item.currency)}
              className={`min-w-14 rounded-md px-3 py-2 text-sm font-semibold transition ${
                item.currency === selected.currency
                  ? "bg-ink text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.currency}
            </button>
          ))}
        </div>
      </div>

      {/* Risk assessment: mirrors the institutional report's first read of the selected pair. */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <section className={`rounded-lg border p-5 ${regimeTone(selected.regime)}`}>
          <p className="text-sm font-semibold uppercase tracking-wide">Systemic Risk Assessment</p>
          <h3 className="mt-3 text-2xl font-semibold">{selected.regime}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{selected.notes}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="CLP" value={formatNumber(selected.clp)} detail="Liquidation pressure." tone={selected.clp >= 6.5 ? "danger" : selected.clp >= 3.6 ? "watch" : "neutral"} />
          <MetricCard label="MCLP 5s" value={formatSignedPercent(selected.mclp)} detail="Momentum of CLP." tone={selected.mclp >= 50 ? "danger" : selected.mclp >= 20 ? "watch" : "neutral"} />
          <MetricCard label="Z-COT" value={formatNumber(selected.cftcZScore)} detail="Positioning z-score." tone={selected.cftcZScore >= 1.8 ? "watch" : "neutral"} />
          <MetricCard label="Vol shock" value={`+${formatPercent(selected.volatilityShock)}`} detail="Volatility above mean." tone={selected.volatilityShock >= 12 ? "watch" : "neutral"} />
          <MetricCard label="VF" value={formatNumber(selected.volFriction, 3)} detail="Lower means more friction." tone={selected.volFriction < 0.8 ? "watch" : "neutral"} />
          <MetricCard label="CF" value={formatNumber(selected.carryFactor, 3)} detail="Carry factor." tone={selected.carryFactor >= 1 ? "good" : "neutral"} />
        </section>
      </div>

      {/* Chart grid: shows the path, drivers, and acceleration behind today's regime. */}
      <div className="grid gap-5 xl:grid-cols-3">
        <ChartShell title="CLP Stress Path" subtitle="Thresholds show watch, stress, high-risk, and critical zones.">
          {isMounted ? <ClpPathChart data={sessionHistory} /> : <ChartPlaceholder />}
        </ChartShell>
        <ChartShell title="Component Evolution" subtitle="PSI, VF, and CF reveal what changed recently.">
          {isMounted ? <ComponentEvolutionChart data={sessionHistory} /> : <ChartPlaceholder />}
        </ChartShell>
        <ChartShell title="MCLP Momentum" subtitle="Five-session acceleration is the kinetic-risk signal.">
          {isMounted ? <MomentumChart data={sessionHistory} /> : <ChartPlaceholder />}
        </ChartShell>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <EvolutionTable data={sessionHistory} />
        <StressDecomposition metrics={selected} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <KeyIndicators rows={indicatorRows} />
        <DiagnosisPanel rows={diagnosisRows} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <RegimeClassification />
        <DataSourcePanel />
      </div>
    </section>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Chart shell: gives each chart a consistent title, purpose, and stable height. */}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      <div className="mt-4 h-72 min-w-0">{children}</div>
    </section>
  );
}

function ChartPlaceholder() {
  return <div className="h-full w-full rounded-md bg-slate-100" />;
}

function ClpPathChart({ data }: { data: ReturnType<typeof buildPairSessionHistory> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis domain={[0, 9]} tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }} />
        {clpThresholds.map((threshold) => (
          <ReferenceLine
            key={threshold.label}
            y={threshold.value}
            stroke={threshold.color}
            strokeDasharray="4 4"
            label={{ value: threshold.label, fill: threshold.color, fontSize: 11, position: "right" }}
          />
        ))}
        <Line type="monotone" dataKey="clp" name="CLP" stroke="#b3261e" strokeWidth={3} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ComponentEvolutionChart({ data }: { data: ReturnType<typeof buildPairSessionHistory> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }} />
        <Legend />
        <Line type="monotone" dataKey="positioningScore" name="PSI" stroke="#b3261e" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="volFriction" name="VF" stroke="#245c9e" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="carryFactor" name="CF" stroke="#1f8a5b" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MomentumChart({ data }: { data: ReturnType<typeof buildPairSessionHistory> }) {
  const chartData = data.filter((item) => item.mclp !== null);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 18, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#e5e9f0" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }} />
        <ReferenceLine y={20} stroke="#1f8a5b" strokeDasharray="4 4" />
        <ReferenceLine y={50} stroke="#b76b14" strokeDasharray="4 4" />
        <ReferenceLine y={100} stroke="#b3261e" strokeDasharray="4 4" />
        <Bar dataKey="mclp" name="MCLP 5s" fill="#f59e0b" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EvolutionTable({ data }: { data: ReturnType<typeof buildPairSessionHistory> }) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      {/* Evolution table: the report-like audit trail for how stress built over recent sessions. */}
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">Dynamic Evolution Table</h3>
        <p className="text-sm text-slate-600">Recent-session model path for the selected currency.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-panel text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Session", "Date", "Spot", "Z-COT", "VS", "PSI", "VF", "CF", "CLP", "MCLP"].map((header) => (
                <th key={header} className="border-b border-line px-3 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={`${item.session}-${item.date}`} className="hover:bg-slate-50">
                <td className="border-b border-line px-3 py-3 font-semibold">{item.session}</td>
                <td className="border-b border-line px-3 py-3">{item.date}</td>
                <td className="border-b border-line px-3 py-3">{formatNumber(item.spot, item.spot > 10 ? 2 : 3)}</td>
                <td className="border-b border-line px-3 py-3">{formatNumber(item.cftcZScore)}</td>
                <td className="border-b border-line px-3 py-3">+{formatPercent(item.volatilityShock)}</td>
                <td className="border-b border-line px-3 py-3">{formatNumber(item.positioningScore)}</td>
                <td className="border-b border-line px-3 py-3">{formatNumber(item.volFriction, 3)}</td>
                <td className="border-b border-line px-3 py-3">{formatNumber(item.carryFactor, 3)}</td>
                <td className="border-b border-line px-3 py-3 font-semibold">{formatNumber(item.clp)}</td>
                <td className="border-b border-line px-3 py-3">
                  {item.mclp === null ? "N/A" : formatSignedPercent(item.mclp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KeyIndicators({ rows }: { rows: ReturnType<typeof buildIndicatorRows> }) {
  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      {/* Key indicators: turns each model input into a concise interpretation. */}
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">Key Indicators</h3>
        <p className="text-sm text-slate-600">Latest value and signal interpretation.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.indicator} className="hover:bg-slate-50">
                <td className="border-b border-line px-4 py-3 font-semibold text-ink">{row.indicator}</td>
                <td className="border-b border-line px-4 py-3 font-semibold text-danger">{row.value}</td>
                <td className="border-b border-line px-4 py-3 text-slate-700">{row.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiagnosisPanel({ rows }: { rows: ReturnType<typeof buildDiagnosisRows> }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Diagnosis: plain-English research notes for learning and presentation. */}
      <h3 className="text-lg font-semibold text-ink">Funding And Leverage Diagnosis</h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.title} className="rounded-lg border border-line bg-panel p-3">
            <p className="text-sm font-semibold text-ink">{row.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{row.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RegimeClassification() {
  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      {/* Methodology table: keeps the thresholds visible so users know how labels are assigned. */}
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">Risk Regime Classification</h3>
      </div>
      <div className="grid gap-0 md:grid-cols-2">
        <RegimeTable title="CLP Level" rows={clpRegimeRows} />
        <RegimeTable title="MCLP 5s" rows={mclpRegimeRows} />
      </div>
    </section>
  );
}

function RegimeTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ range: string; regime: string; interpretation: string }>;
}) {
  return (
    <div className="overflow-x-auto border-b border-line md:border-b-0 md:border-r md:last:border-r-0">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-panel text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="border-b border-line px-4 py-3 font-semibold">{title}</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Regime</th>
            <th className="border-b border-line px-4 py-3 font-semibold">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${title}-${row.range}`}>
              <td className="border-b border-line px-4 py-3">{row.range}</td>
              <td className="border-b border-line px-4 py-3">
                <RegimeBadge label={row.regime} />
              </td>
              <td className="border-b border-line px-4 py-3 text-slate-700">{row.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataSourcePanel() {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Source badges: makes clear which fields can come from free data and which are proxies. */}
      <h3 className="text-lg font-semibold text-ink">Data Availability Map</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Yahoo Finance and FRED cover the MVP, but CFTC and option/forward data need separate sources.
      </p>
      <div className="mt-4 space-y-3">
        {dataSourceStatuses.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-panel p-3">
            <div>
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              <p className="mt-1 text-sm text-slate-600">{item.source}</p>
            </div>
            <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${qualityTone[item.quality]}`}>
              {item.quality}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
