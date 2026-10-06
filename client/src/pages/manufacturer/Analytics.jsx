import { useEffect, useMemo, useState } from "react";
import Card from "../../components/common/Card";
import StatCard from "../../components/common/StatCard";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listProducts, getManufacturerStats } from "../../services/product.api";
import { BarChart3 } from "lucide-react";

const CATEGORY_LABELS = {
  food: "Food",
  medicine: "Medicine",
  cosmetics: "Cosmetics",
  fashion: "Fashion",
  fmcg: "FMCG",
  other: "Other",
};

// Magnitude across a single measure -> one hue, varying only opacity/length,
// never a rainbow (see dataviz skill: sequential = one hue).
function BarRow({ label, value, max, colorClass }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-slate-600 dark:text-slate-300" title={label}>
        {label}
      </span>
      <div className="h-2.5 flex-1 rounded-full bg-slate-100 dark:bg-white/5">
        <div
          className={`h-2.5 rounded-full ${colorClass}`}
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
          title={`${label}: ${value}`}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default function Analytics() {
  const [products, setProducts] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    listProducts()
      .then((res) => setProducts(res.data.products))
      .catch(() => setProducts([]));
    getManufacturerStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  }, []);

  const { topScanned, byCategory, active, recalled } = useMemo(() => {
    if (!products) return { topScanned: [], byCategory: [], active: 0, recalled: 0 };

    const topScanned = [...products].sort((a, b) => b.scanCount - a.scanCount).slice(0, 6);

    const counts = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const byCategory = Object.entries(counts).map(([category, count]) => ({
      category: CATEGORY_LABELS[category] || category,
      count,
    }));

    return {
      topScanned,
      byCategory,
      active: products.filter((p) => p.status === "active").length,
      recalled: products.filter((p) => p.status === "recalled").length,
    };
  }, [products]);

  if (!products) return <LoadingSkeleton rows={5} />;
  if (products.length === 0) {
    return <EmptyState icon={BarChart3} title="Nothing to analyze yet" description="Register a product to see analytics here." />;
  }

  const maxScans = Math.max(...topScanned.map((p) => p.scanCount), 1);
  const maxCategory = Math.max(...byCategory.map((c) => c.count), 1);
  const statusTotal = active + recalled || 1;

  return (
    <div className="flex flex-col gap-6">
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Products Registered" value={stats.productsRegistered} />
          <StatCard label="Verified Scans" value={stats.totalScans} />
          <StatCard label="Counterfeit Reports" value={stats.counterfeitReports} tone="danger" />
          <StatCard label="Ownership Transfers" value={stats.ownershipTransfers} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Scans by Product</h2>
          <div className="flex flex-col gap-3">
            {topScanned.map((p) => (
              <BarRow key={p._id} label={p.name} value={p.scanCount} max={maxScans} colorClass="bg-brand-600" />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Products by Category</h2>
          <div className="flex flex-col gap-3">
            {byCategory.map((c) => (
              <BarRow key={c.category} label={c.category} value={c.count} max={maxCategory} colorClass="bg-brand-600" />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Status Breakdown</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
            <div
              className="h-full bg-success-500"
              style={{ width: `${(active / statusTotal) * 100}%` }}
              title={`Active: ${active}`}
            />
            <div
              className="h-full bg-danger-500"
              style={{ width: `${(recalled / statusTotal) * 100}%` }}
              title={`Recalled: ${recalled}`}
            />
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success-500" /> Active{" "}
              <strong className="tabular-nums">{active}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-danger-500" /> Recalled{" "}
              <strong className="tabular-nums">{recalled}</strong>
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
