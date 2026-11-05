import { cn } from "@/lib/utils";

export type TabItem = { value: string; label: string; count?: number };

export function Tabs({
  items,
  value,
  onChange,
  className,
  size = "md",
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-app-soft p-1",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "focus-ring flex shrink-0 items-center gap-1.5 rounded-lg font-semibold transition",
            size === "sm" ? "px-3 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
            value === item.value
              ? "bg-app-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                value === item.value ? "bg-brand/15 text-brand" : "bg-app-raised text-muted"
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
