import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listManufacturers, updateManufacturerStatus, listReports } from "../../services/admin.api";
import { listProducts } from "../../services/product.api";
import { useToast } from "../../hooks/useToast";
import { CircleCheck, Shield } from "lucide-react";

export default function AdminDashboard() {
  const [manufacturers, setManufacturers] = useState(null);
  const [pending, setPending] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [reports, setReports] = useState(null);
  const { showToast } = useToast();

  const refresh = () => {
    listManufacturers().then((res) => setManufacturers(res.data.manufacturers));
    listManufacturers({ status: "pending" }).then((res) => setPending(res.data.manufacturers));
    listProducts().then((res) => setProductCount(res.data.count));
    listReports({ status: "pending" }).then((res) => setReports(res.data.reports));
  };

  useEffect(refresh, []);

  const handleDecision = async (id, status) => {
    try {
      await updateManufacturerStatus(id, status);
      showToast(`Manufacturer ${status}`, "success");
      refresh();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update manufacturer", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Manufacturers" value={manufacturers?.length ?? "…"} />
        <StatCard label="Products" value={productCount ?? "…"} />
        <StatCard label="Pending Reports" value={reports?.length ?? "…"} tone="danger" />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Pending Manufacturer Approvals</h2>
          <Link to="/admin/manufacturers" className="text-sm font-medium text-brand-600 dark:text-brand-400">
            Manage all →
          </Link>
        </div>
        {pending === null ? (
          <LoadingSkeleton rows={3} />
        ) : pending.length === 0 ? (
          <EmptyState icon={CircleCheck} title="No pending approvals" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">GST</th>
                  <th className="pb-2">Wallet</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {pending.map((m) => (
                  <tr key={m._id}>
                    <td className="py-2.5 font-medium">{m.companyName}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.gstNumber}</td>
                    <td className="py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {m.walletAddress}
                    </td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="success" onClick={() => handleDecision(m._id, "approved")}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => handleDecision(m._id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent Counterfeit Reports</h2>
          <Link to="/admin/reports" className="text-sm font-medium text-brand-600 dark:text-brand-400">
            View all →
          </Link>
        </div>
        {reports === null ? (
          <LoadingSkeleton rows={3} />
        ) : reports.length === 0 ? (
          <EmptyState icon={Shield} title="No pending reports" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-2">Product ID</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {reports.slice(0, 5).map((r) => (
                  <tr key={r._id}>
                    <td className="py-2.5 font-mono text-xs">{r.productId}</td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">{r.userLocation || "—"}</td>
                    <td className="py-2.5">
                      <Badge status={r.status} />
                    </td>
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
