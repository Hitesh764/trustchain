import { createContext, useCallback, useState } from "react";
import { CircleCheck, TriangleAlert, Info } from "lucide-react";

export const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info") => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`glass-card animate-fade-in flex items-center gap-2 px-4 py-3 text-sm font-medium min-w-[240px] ${
              toast.type === "success"
                ? "text-success-700 dark:text-success-300"
                : toast.type === "error"
                ? "text-danger-600 dark:text-danger-300"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {toast.type === "success" ? (
              <CircleCheck className="h-4 w-4 shrink-0" />
            ) : toast.type === "error" ? (
              <TriangleAlert className="h-4 w-4 shrink-0" />
            ) : (
              <Info className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
