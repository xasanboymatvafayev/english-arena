import type { ReactNode } from "react";
import { cn, formatNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "brand",
  suffix,
  className,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  hint?: ReactNode;
  tone?: "brand" | "emerald" | "amber" | "sky" | "rose";
  suffix?: string;
  className?: string;
}) {
  const tones = {
    brand: "bg-brand/[0.12] text-brand",
    emerald: "bg-emerald-500/[0.12] text-emerald-400",
    amber: "bg-amber-500/[0.12] text-amber-400",
    sky: "bg-sky-500/[0.12] text-sky-400",
    rose: "bg-rose-500/[0.12] text-rose-400",
  };
  return (
    <div className={cn("card card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="display mt-2 text-[26px] font-extrabold leading-none">
            {typeof value === "number" ? formatNumber(value) : value}
            {suffix && <span className="ml-1 text-sm font-semibold text-muted">{suffix}</span>}
          </p>
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[tone])}>
          {icon}
        </div>
      </div>
      {hint && <div className="mt-3 text-[11px] leading-relaxed text-muted">{hint}</div>}
    </div>
  );
}
