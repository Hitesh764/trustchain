import { useEffect, useState } from "react";
import Card from "../../components/common/Card";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listManufacturers, updateManufacturerStatus } from "../../services/admin.api";
import { useToast } from "../../hooks/useToast";
import { Factory } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "deactivated", label: "Deactivated" },
];

export default function ManufacturerList() {
  const [manufacturers, setManufacturers] = useState(null);
  const [status, setStatus] = useState("");
  const { showToast } = useToast();

  const fetchList = () => {
    listManufacturers({ status: status || undefined }).then((res) => setManufacturers(res.data.manufacturers));
  };

  useEffect(fetchList, [status]);

  const handleUpdate = async (id, newStatus) => {
    try {
      await updateManufacturerStatus(id, newStatus);
      showToast(`Manufacturer marked ${newStatus}`, "success");
      fetchList();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update manufacturer", "error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Select
          label="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-xs"
        />
      </Card>

      {!manufacturers ? (
        <LoadingSkeleton rows={5} />
      ) : manufacturers.length === 0 ? (
        <EmptyState icon={Factory} title="No manufacturers found" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-2">Company</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">GST</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {manufacturers.map((m) => (
                <tr key={m._id}>
                  <td className="py-2.5 font-medium">{m.companyName}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.email}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{m.gstNumber}</td>
                  <td className="py-2.5">
                    <Badge status={m.status} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {m.status !== "approved" && (
                        <Button variant="success" onClick={() => handleUpdate(m._id, "approved")}>
                          Approve
                        </Button>
                      )}
                      {m.status !== "rejected" && m.status !== "approved" && (
                        <Button variant="danger" onClick={() => handleUpdate(m._id, "rejected")}>
                          Reject
                        </Button>
                      )}
                      {m.status === "approved" && (
                        <Button variant="ghost" onClick={() => handleUpdate(m._id, "deactivated")}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
