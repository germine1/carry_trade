type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "good" | "watch" | "danger";
};

const toneStyles = {
  neutral: "border-line bg-white",
  good: "border-emerald-200 bg-emerald-50",
  watch: "border-amber-200 bg-amber-50",
  danger: "border-red-200 bg-red-50",
};

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <section className={`rounded-lg border p-4 shadow-soft ${toneStyles[tone]}`}>
      {/* Header: short label for scan-first dashboard reading. */}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>

      {/* Primary number: the single value this card is responsible for. */}
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>

      {/* Context: small explanation so the metric is meaningful without a legend hunt. */}
      <p className="mt-1 text-sm leading-5 text-slate-600">{detail}</p>
    </section>
  );
}
