"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PairMetrics } from "@/lib/types";

type PairChartsProps = {
  metrics: PairMetrics;
};

export function PairCharts({ metrics }: PairChartsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const spotData = metrics.sparkline.map((value, index) => ({
    session: `T-${metrics.sparkline.length - index - 1}`,
    spot: value,
  }));

  const factorData = [
    { factor: "Carry", value: metrics.carryScore },
    { factor: "Positioning", value: metrics.positioningScore * 40 },
    { factor: "Volatility", value: metrics.volatilityScore * 40 },
    { factor: "CLP", value: metrics.clp * 12 },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-96 rounded-lg border border-line bg-white p-5 shadow-soft" />
        <div className="h-96 rounded-lg border border-line bg-white p-5 shadow-soft" />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        {/* Spot path: shows whether price action is confirming or fighting the carry trade. */}
        <h2 className="text-lg font-semibold text-ink">Spot Path</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spotData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="spotFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#245c9e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#245c9e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="session" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={["dataMin", "dataMax"]} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }} />
              <Area type="monotone" dataKey="spot" stroke="#245c9e" fill="url(#spotFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        {/* Factor bars: quick comparison of the normalized inputs behind the regime. */}
        <h2 className="text-lg font-semibold text-ink">Normalized Factor Stack</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={factorData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="factor" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#d9dee7" }} />
              <Bar dataKey="value" fill="#1f8a5b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
