"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { clsx } from "clsx";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-status-ready" />,
    error: <AlertCircle className="h-5 w-5 text-status-failed" />,
    info: <Info className="h-5 w-5 text-status-processing" />,
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-card shadow-card border animate-in slide-in-from-right-full fade-in duration-300",
        toast.type === "success" && "bg-status-ready/10 border-status-ready/20",
        toast.type === "error" && "bg-status-failed/10 border-status-failed/20",
        toast.type === "info" && "bg-status-processing/10 border-status-processing/20"
      )}
    >
      {icons[toast.type]}
      <p className="text-sm text-text-primary">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="ml-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

