import { useEffect, useState } from "react";
import Card from "../../components/common/Card";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listReports, updateReportStatus } from "../../services/admin.api";
import { useToast } from "../../hooks/useToast";
import { formatDate } from "../../utils/format";
import { Shield, MapPin, Calendar, Mail } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
];

export default function CounterfeitReports() {
  const [reports, setReports] = useState(null);
  const [status, setStatus] = useState("");
  const { showToast } = useToast();

  const fetchList = () => {
    listReports({ status: status || undefined }).then((res) => setReports(res.data.reports));
  };

  useEffect(fetchList, [status]);

  const handleUpdate = async (id, newStatus) => {
    try {
      await updateReportStatus(id, newStatus);
      showToast(`Report marked ${newStatus}`, "success");
      fetchList();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update report", "error");
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

      {!reports ? (
        <LoadingSkeleton rows={5} />
      ) : reports.length === 0 ? (
        <EmptyState icon={Shield} title="No reports found" />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <Card key={r._id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.productId}</span>
                <Badge status={r.status} />
              </div>
              <p className="text-sm">{r.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {r.userLocation || "Not provided"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {formatDate(r.createdAt)}
                </span>
                {r.contactEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {r.contactEmail}
                  </span>
                )}
              </div>
              {r.status === "pending" && (
                <div className="mt-1 flex gap-2">
                  <Button variant="secondary" onClick={() => handleUpdate(r._id, "reviewed")}>
                    Mark Reviewed
                  </Button>
                  <Button variant="ghost" onClick={() => handleUpdate(r._id, "dismissed")}>
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
