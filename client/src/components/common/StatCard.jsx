export default function StatCard({ label, value, hint, tone = "brand" }) {
  const toneClasses = {
    brand: "text-brand-600 dark:text-brand-400",
    success: "text-success-600 dark:text-success-400",
    danger: "text-danger-600 dark:text-danger-400",
  };

  return (
    <div className="glass-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
