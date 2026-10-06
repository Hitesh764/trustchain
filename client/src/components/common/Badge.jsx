const STATUS_MAP = {
  active: { label: "Active", variant: "success" },
  approved: { label: "Approved", variant: "success" },
  genuine: { label: "Genuine", variant: "success" },
  recalled: { label: "Recalled", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },
  counterfeit: { label: "Counterfeit", variant: "danger" },
  pending: { label: "Pending", variant: "neutral" },
  deactivated: { label: "Deactivated", variant: "neutral" },
  reviewed: { label: "Reviewed", variant: "brand" },
  dismissed: { label: "Dismissed", variant: "neutral" },
};

export default function Badge({ status, children }) {
  const config = STATUS_MAP[status] || { label: children || status, variant: "neutral" };
  return <span className={`badge-${config.variant}`}>{children || config.label}</span>;
}
