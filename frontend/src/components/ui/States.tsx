import type { ReactNode } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin text-brand", className)} size={20} />;
}

export function LoadingBlock({ label = "Yuklanmoqda..." }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-muted">
      <Spinner className="h-6 w-6" />
      <p className="text-xs font-medium">{label}</p>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand/[0.12]">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
        <p className="text-xs font-medium text-muted">Sahifa yuklanmoqda...</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-app-soft/40 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand/[0.12] text-brand">
          {icon}
        </div>
      )}
      <p className="display text-base font-bold">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-6 py-10 text-center",
        className
      )}
    >
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/15 text-rose-400">
        <AlertCircle size={22} />
      </div>
      <p className="display text-sm font-bold">Ma'lumotni yuklab bo'lmadi</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
        {message || "Server bilan aloqa uzildi. Qayta urinib ko'ring."}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw size={14} /> Qayta urinish
        </Button>
      )}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("skeleton h-32 w-full", className)} />;
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-14 w-full" />
      ))}
    </div>
  );
}
