import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="glass-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon className="h-9 w-9 text-slate-300 dark:text-slate-600" strokeWidth={1.5} aria-hidden />
      <p className="font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
