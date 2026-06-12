"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { backtestConfigs, backtestStartDate, backtestStartingCapital } from "@/lib/backtest";
import { formatNumber, formatPercent, formatSignedPercent } from "@/lib/format";
import type { BacktestResult, CurrencyCode } from "@/lib/types";
import { MetricCard } from "./MetricCard";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const eventColors = {
  Fed: "#245c9e",
  BOJ: "#b3261e",
  Intervention: "#f59e0b",
  Risk: "#7c3aed",
  Inflation: "#0f766e",
  Trade: "#64748b",
};

const formatTooltipNumber = (value: unknown, decimals = 2) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(decimals) : "";

export function CarryBacktest() {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("JPY");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetch(`/api/backtest/${selectedCurrency}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Backtest request failed: ${response.status}`);
        }
        return response.json() as Promise<BacktestResult>;
      })
      .then((payload) => setResult(payload))
      .catch((requestError: Error) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [selectedCurrency]);

  const chartData = useMemo(
    () =>
      result?.points.map((point) => ({
        ...point,
        drawdownPct: point.drawdown * 100,
        equityMillions: point.equity / 1_000_000,
      })) ?? [],
    [result],
  );

  return (
    <section className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-soft">
      {/* Backtest header: defines the strategy assumptions and keeps the analysis separate from live monitoring. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Historical backtest</p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">USD/G10 Carry Trade Failure Map</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Simulates continuously holding a long-USD carry trade from {backtestStartDate} to today with{" "}
            {money(backtestStartingCapital)} starting capital. The chart highlights drawdowns and nearby macro events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-panel p-2">
          {backtestConfigs.map((config) => (
            <button
              key={config.currency}
              type="button"
              onClick={() => setSelectedCurrency(config.currency)}
              className={`min-w-14 rounded-md px-3 py-2 text-sm font-semibold transition ${
                selectedCurrency === config.currency
                  ? "bg-ink text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {config.currency}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorPanel message={error} /> : null}
      {isLoading ? <LoadingPanel /> : null}
      {!isLoading && result ? <BacktestBody result={result} chartData={chartData} /> : null}
    </section>
  );
}

function BacktestBody({
  result,
  chartData,
}: {
  result: BacktestResult;
  chartData: Array<BacktestResult["points"][number] & { drawdownPct: number; equityMillions: number }>;
}) {
  const worstEpisode = result.lossEpisodes[0];
  const activeEvents = result.events.filter((event) =>
    result.points.some((point) => Math.abs(new Date(point.date).getTime() - new Date(event.date).getTime()) <= 3 * 86_400_000),
  );

  return (
    <>
      {/* Summary strip: tells whether carry paid enough to overcome spot losses. */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Final equity"
          value={money(result.summary.finalEquity)}
          detail={`${formatSignedPercent(result.summary.totalReturn * 100)} total return.`}
          tone={result.summary.totalPnl >= 0 ? "good" : "danger"}
        />
        <MetricCard
          label="Total P&L"
          value={money(result.summary.totalPnl)}
          detail={`Starting capital ${money(10_000_000)}.`}
          tone={result.summary.totalPnl >= 0 ? "good" : "danger"}
        />
        <MetricCard
          label="Max drawdown"
          value={formatSignedPercent(result.summary.maxDrawdown * 100)}
          detail={worstEpisode ? `Worst trough ${worstEpisode.troughDate}.` : "No material drawdown."}
          tone={result.summary.maxDrawdown <= -0.08 ? "danger" : "watch"}
        />
        <MetricCard
          label="Worst day"
          value={formatSignedPercent(result.summary.worstDayReturn * 100)}
          detail={result.summary.worstDayDate}
          tone="watch"
        />
        <MetricCard
          label="Data"
          value={result.summary.dataSource}
          detail="Yahoo when available; deterministic fallback otherwise."
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="rounded-lg border border-line bg-panel p-5">
          {/* Equity timeline: the primary chart for seeing when the strategy made or lost money. */}
          <h3 className="text-lg font-semibold text-ink">{result.summary.pair} equity timeline</h3>
          <p className="mt-1 text-sm text-slate-600">Event markers show major rates, BOJ, intervention, and risk episodes.</p>
          <div className="mt-4 h-96 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e5e9f0" vertical={false} />
                <XAxis dataKey="date" minTickGap={36} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  yAxisId="equity"
                  tickFormatter={(value) => `$${Number(value).toFixed(1)}m`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis yAxisId="drawdown" orientation="right" hide domain={[-35, 5]} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }}
                  formatter={(value, name) => [
                    name === "Equity" ? `$${formatTooltipNumber(value)}m` : `${formatTooltipNumber(value)}%`,
                    name,
                  ]}
                />
                <Legend />
                {activeEvents.map((event) => (
                  <ReferenceLine
                    key={`${event.date}-${event.title}`}
                    x={event.date}
                    yAxisId="equity"
                    stroke={eventColors[event.category]}
                    strokeDasharray="4 4"
                    label={{ value: event.category, fill: eventColors[event.category], fontSize: 10, angle: -90 }}
                  />
                ))}
                <Line
                  yAxisId="equity"
                  type="monotone"
                  dataKey="equityMillions"
                  name="Equity"
                  stroke="#1f8a5b"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="drawdown"
                  type="monotone"
                  dataKey="drawdownPct"
                  name="Drawdown"
                  stroke="#b3261e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-5">
          {/* Drawdown area: isolates failure periods instead of mixing them with profitable carry accrual. */}
          <h3 className="text-lg font-semibold text-ink">Failure Periods</h3>
          <p className="mt-1 text-sm text-slate-600">Drawdowns show where carry failed to offset FX spot losses.</p>
          <div className="mt-4 h-96 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e5e9f0" vertical={false} />
                <XAxis dataKey="date" minTickGap={42} tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }}
                  formatter={(value) => [`${formatTooltipNumber(value)}%`, "Drawdown"]}
                />
                <ReferenceLine y={-5} stroke="#b76b14" strokeDasharray="4 4" />
                <ReferenceLine y={-10} stroke="#b3261e" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="drawdownPct" stroke="#b3261e" fill="#fee2e2" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <LossEpisodeTable episodes={result.lossEpisodes} />
        <EventPanel events={result.events} />
      </div>

      <section className="rounded-lg border border-line bg-panel p-5">
        {/* Interpretation: connects the backtest to the carry-risk framework in plain language. */}
        <h3 className="text-lg font-semibold text-ink">What This Backtest Is Testing</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          This is a simple continuous long-USD carry simulation. Daily P&L is approximated as spot return plus annualized
          carry divided by 252. For pairs quoted as USD per foreign currency, the USD-long spot return is inverted so all
          currencies are comparable.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Losses usually happen when spot moves against the carry faster than interest income accrues. The event markers
          help identify whether the failure occurred around policy surprises, intervention risk, volatility shocks, or
          broader risk-off periods.
        </p>
      </section>
    </>
  );
}

function LossEpisodeTable({ episodes }: { episodes: BacktestResult["lossEpisodes"] }) {
  return (
    <section className="rounded-lg border border-line bg-panel shadow-soft">
      {/* Loss table: ranks the periods where the carry strategy hurt the most. */}
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-semibold text-ink">Worst Loss Episodes</h3>
        <p className="text-sm text-slate-600">Ranked by maximum drawdown during the episode.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {["Start", "Trough", "End", "Duration", "Max DD", "Nearby events"].map((header) => (
                <th key={header} className="border-b border-line px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => (
              <tr key={`${episode.startDate}-${episode.troughDate}`} className="hover:bg-white">
                <td className="border-b border-line px-4 py-3">{episode.startDate}</td>
                <td className="border-b border-line px-4 py-3 font-semibold">{episode.troughDate}</td>
                <td className="border-b border-line px-4 py-3">{episode.endDate ?? "Open"}</td>
                <td className="border-b border-line px-4 py-3">{episode.durationDays}d</td>
                <td className="border-b border-line px-4 py-3 font-semibold text-danger">
                  {formatSignedPercent(episode.maxDrawdown * 100)}
                </td>
                <td className="border-b border-line px-4 py-3 text-slate-700">
                  {episode.events.length ? episode.events.map((event) => event.title).join("; ") : "No tagged event nearby"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EventPanel({ events }: { events: BacktestResult["events"] }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-soft">
      {/* Events: the initial curated overlay for explaining carry losses. */}
      <h3 className="text-lg font-semibold text-ink">Event Overlay</h3>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <article key={`${event.date}-${event.title}`} className="rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{event.title}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {event.date} · {event.category}
                </p>
              </div>
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md bg-panel px-2 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Source
              </a>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-700">{event.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LoadingPanel() {
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      {/* Loading state: explicit because live Yahoo pulls can take a moment. */}
      <p className="text-sm font-semibold text-slate-700">Loading backtest data...</p>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-5">
      {/* Error state: should be rare because the API has a fallback path. */}
      <p className="text-sm font-semibold text-danger">Backtest unavailable</p>
      <p className="mt-1 text-sm text-slate-700">{message}</p>
    </section>
  );
}
