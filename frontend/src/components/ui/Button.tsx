import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#7C6CFF] to-[#5B4AE0] text-white shadow-[0_12px_30px_-14px_rgba(109,94,245,0.9)] hover:brightness-110 active:brightness-95",
  secondary:
    "border border-line bg-app-soft text-ink hover:bg-app-raised hover:border-brand/30",
  ghost: "text-muted hover:bg-app-soft hover:text-ink",
  danger:
    "border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/15",
  gold:
    "bg-gradient-to-r from-[#FFD27A] to-[#F5A623] text-[#2A1B05] shadow-[0_12px_30px_-14px_rgba(245,166,35,0.8)] hover:brightness-105",
  outline: "border border-line bg-transparent text-ink hover:bg-app-soft",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-10 w-10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "focus-ring inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
