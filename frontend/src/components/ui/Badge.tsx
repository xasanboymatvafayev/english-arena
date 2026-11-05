import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "brand" | "success" | "warning" | "danger" | "neutral" | "gold" | "outline";

const styles: Record<Variant, string> = {
  brand: "bg-brand/[0.12] text-brand border-brand/20",
  success: "bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/[0.12] text-amber-400 border-amber-500/20",
  danger: "bg-rose-500/[0.12] text-rose-400 border-rose-500/20",
  neutral: "bg-app-soft text-muted border-line",
  gold: "bg-gold-soft text-gold border-amber-400/25",
  outline: "bg-transparent text-muted border-line",
};

export function Badge({
  children,
  variant = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        styles[variant],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
