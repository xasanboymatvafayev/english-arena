import { cn, initials } from "@/lib/utils";

const palettes = [
  "from-violet-500 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-600",
  "from-sky-400 to-blue-600",
  "from-rose-400 to-pink-600",
  "from-fuchsia-400 to-purple-600",
];

export function Avatar({
  first,
  last,
  size = "md",
  className,
  ring,
}: {
  first?: string | null;
  last?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const sizes = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-[11px]",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  };
  const seed = `${first || ""}${last || ""}`.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const palette = palettes[seed % palettes.length];
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-display font-bold text-white",
        palette,
        sizes[size],
        ring && "ring-2 ring-white/20 ring-offset-2 ring-offset-app",
        className
      )}
    >
      {initials(first, last)}
    </div>
  );
}
