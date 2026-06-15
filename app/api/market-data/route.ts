import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const refresh = new URL(request.url).searchParams.get("refresh") === "true";

  // Server-only refresh endpoint. Vercel Cron can hit this daily without exposing FRED_API_KEY.
  const marketData = await getMarketData(refresh ? "fresh" : "cached");

  return NextResponse.json(marketData, {
    headers: {
      "Cache-Control": refresh ? "no-store" : "s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
