import { NextResponse } from "next/server";
import { backtestConfigs, fetchYahooPrices, getBacktestConfig, makeFallbackPrices, runCarryBacktest } from "@/lib/backtest";
import type { CurrencyCode } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    currency: string;
  }>;
};

const isCurrencyCode = (value: string): value is CurrencyCode =>
  backtestConfigs.some((config) => config.currency === value);

export async function GET(_request: Request, context: RouteContext) {
  const { currency } = await context.params;
  if (!isCurrencyCode(currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 404 });
  }

  const config = getBacktestConfig(currency);

  if (!config) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 404 });
  }

  try {
    // Live path: yfinance-style Yahoo chart data gives daily FX spot for the backtest.
    const prices = await fetchYahooPrices(config.ticker);
    return NextResponse.json(runCarryBacktest(config, prices, "Yahoo Finance"));
  } catch {
    // Fallback path: keeps the dashboard functional on networks where Yahoo is unavailable.
    return NextResponse.json(runCarryBacktest(config, makeFallbackPrices(config), "Fallback sample"));
  }
}
