import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "brand",
  showLabel = false,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "gold" | "emerald" | "sky";
  showLabel?: boolean;
}) {
  const tones = {
    brand: "from-[#8B7CFF] to-[#5B4AE0]",
    gold: "from-amber-300 to-amber-500",
    emerald: "from-emerald-300 to-teal-500",
    sky: "from-sky-300 to-blue-500",
  };
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-app-soft">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", tones[tone])}
          style={{ width: `${safe}%` }}
        />
      </div>
      {showLabel && <span className="w-9 text-right text-[11px] font-bold text-muted">{Math.round(safe)}%</span>}
    </div>
  );
}
