import { cn, parseDateValue } from "@/lib/utils";

export function WeeklyBars({
  data,
  className,
  tone = "brand",
}: {
  data: { date: string; count: number }[];
  className?: string;
  tone?: "brand" | "emerald" | "amber";
}) {
  const max = Math.max(1, ...data.map((item) => item.count));
  const toneClass = {
    brand: "from-[#8B7CFF] to-[#5B4AE0]",
    emerald: "from-emerald-300 to-teal-500",
    amber: "from-amber-300 to-orange-500",
  }[tone];

  return (
    <div className={cn("flex h-28 items-end gap-2", className)}>
      {data.map((item) => {
        const date = parseDateValue(item.date);
        const label = new Intl.DateTimeFormat("uz-UZ", { weekday: "short", timeZone: "Asia/Tashkent" }).format(date);
        const isToday = item.date === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        return (
          <div key={item.date} className="group flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-20 w-full items-end overflow-hidden rounded-lg bg-app-soft">
              <div
                className={cn(
                  "w-full rounded-lg bg-gradient-to-t transition-all duration-700",
                  toneClass,
                  item.count === 0 && "opacity-25"
                )}
                style={{ height: `${Math.max(8, (item.count / max) * 100)}%` }}
                title={`${item.count} ta faollik`}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase",
                isToday ? "text-brand" : "text-muted"
              )}
            >
              {label.replace(".", "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
