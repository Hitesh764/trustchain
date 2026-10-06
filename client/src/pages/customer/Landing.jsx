import { Link } from "react-router-dom";
import { Link2, Lock, Zap } from "lucide-react";
import Card from "../../components/common/Card";

const HIGHLIGHTS = [
  { icon: Lock, label: "Immutable" },
  { icon: Zap, label: "Instant" },
  { icon: Link2, label: "Traceable" },
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/30">
        <Link2 className="h-8 w-8 text-white" strokeWidth={2} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">TrustChain</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Blockchain-based product authentication and anti-counterfeit system.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link to="/scan" className="btn-primary">
          Verify a Product
        </Link>
        <Link to="/register" className="btn-secondary">
          Register as Manufacturer
        </Link>
      </div>

      <div className="mt-14 grid grid-cols-3 gap-4">
        {HIGHLIGHTS.map((h) => (
          <Card key={h.label} className="flex flex-col items-center gap-1.5 py-5">
            <h.icon className="h-6 w-6 text-brand-600 dark:text-brand-400" strokeWidth={1.75} aria-hidden />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{h.label}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
