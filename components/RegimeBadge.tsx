import { regimeTone, riskTone } from "@/lib/format";

type RegimeBadgeProps = {
  label: string;
  variant?: "regime" | "risk";
  riskValue?: number;
};

export function RegimeBadge({ label, variant = "regime", riskValue = 0 }: RegimeBadgeProps) {
  const tone = variant === "risk" ? riskTone(riskValue) : regimeTone(label);

  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}
