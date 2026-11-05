import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; title: string; description?: string };

type ToastContextValue = {
  toast: (kind: ToastKind, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, description?: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, kind, title, description }]);
      window.setTimeout(() => remove(id), 4600);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast,
    success: (title, description) => toast("success", title, description),
    error: (title, description) => toast("error", title, description),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2">
        {toasts.map((item) => {
          const Icon = icons[item.kind];
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex animate-scale-in items-start gap-3 rounded-2xl border bg-app-surface/95 p-4 shadow-card backdrop-blur",
                item.kind === "success" && "border-emerald-400/30",
                item.kind === "error" && "border-rose-400/30",
                item.kind === "info" && "border-brand/30"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                  item.kind === "success" && "bg-emerald-500/15 text-emerald-400",
                  item.kind === "error" && "bg-rose-500/15 text-rose-400",
                  item.kind === "info" && "bg-brand/15 text-brand"
                )}
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(item.id)}
                className="rounded-lg p-1 text-muted transition hover:bg-app-soft hover:text-ink"
                aria-label="Yopish"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
