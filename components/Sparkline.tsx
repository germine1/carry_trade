"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type SparklineProps = {
  values: number[];
};

export function Sparkline({ values }: SparklineProps) {
  const [isMounted, setIsMounted] = useState(false);
  const data = values.map((value, index) => ({ index, value }));
  const formatTooltipValue = (value: ValueType | undefined, _name: NameType | undefined) => [
    typeof value === "number" ? value.toFixed(3) : value ?? "",
    "Spot",
  ] as const;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="h-12 w-28">
      {/* Tiny chart: enough to show direction without stealing table space. */}
      {isMounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 4, bottom: 6, left: 4 }}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Tooltip
              contentStyle={{ borderRadius: 8, borderColor: "#d9dee7", fontSize: 12 }}
              formatter={formatTooltipValue}
              labelFormatter={() => ""}
            />
            <Line type="monotone" dataKey="value" stroke="#245c9e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full rounded bg-slate-100" />
      )}
    </div>
  );
}
