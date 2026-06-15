"use client";

import { useState } from "react";
import type { MarketDataResult } from "@/lib/types";

type RefreshStatusPanelProps = {
  initialMarketData: MarketDataResult;
};

export function RefreshStatusPanel({ initialMarketData }: RefreshStatusPanelProps) {
  const [marketData, setMarketData] = useState(initialMarketData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshNow = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Manual refresh bypasses the daily cache and asks the API to refresh each currency independently.
      const response = await fetch(`/api/market-data?refresh=true&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Refresh failed with ${response.status}`);
      }
      setMarketData((await response.json()) as MarketDataResult);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Refresh failed.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      {/* Refresh summary: separates dashboard render time from per-currency data freshness. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refresh Status</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {marketData.liveCount}/{marketData.refreshStatuses.length} live currencies
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {marketData.timestamp} · {marketData.source}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshNow}
          disabled={isRefreshing}
          className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isRefreshing ? "Refreshing..." : "Refresh live data"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {marketData.refreshStatuses.map((status) => (
          <div key={status.currency} className="rounded-md border border-line bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{status.currency}</p>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  status.source === "Live Yahoo/FRED"
                    ? "bg-emerald-100 text-positive"
                    : "bg-amber-100 text-warning"
                }`}
              >
                {status.source === "Live Yahoo/FRED" ? "Live" : "Fallback"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{status.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
