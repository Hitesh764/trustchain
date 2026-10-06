import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/common/Card";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { getManufacturerStats, getRecentScans } from "../../services/product.api";
import { formatDate } from "../../utils/format";
import { Package, Search } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState(null);

  useEffect(() => {
    getManufacturerStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats({ productsRegistered: 0, active: 0, recalled: 0, totalScans: 0, counterfeitReports: 0 }));
    getRecentScans()
      .then((res) => setScans(res.data.scans))
      .catch(() => setScans([]));
  }, []);

  if (!stats) return <LoadingSkeleton rows={5} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Products Registered" value={stats.productsRegistered} />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Recalled" value={stats.recalled} tone="danger" />
        <StatCard label="Verified Scans" value={stats.totalScans} />
        <StatCard label="Counterfeit Reports" value={stats.counterfeitReports} tone="danger" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent Scans</h2>
          <Link to="/dashboard/products" className="text-sm font-medium text-brand-600 dark:text-brand-400">
            View products →
          </Link>
        </div>

        {scans === null ? (
          <LoadingSkeleton rows={3} />
        ) : stats.productsRegistered === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Register your first product to start tracking scans here."
            action={
              <Link to="/dashboard/add-product" className="btn-primary">
                Add Product
              </Link>
            }
          />
        ) : scans.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No scans yet"
            description="Once a customer scans one of your products' QR codes, it'll show up here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Batch</th>
                  <th className="pb-2">Scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {scans.map((s, i) => (
                  <tr key={`${s.productId}-${s.scannedAt}-${i}`}>
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{s.batchNo}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(s.scannedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
