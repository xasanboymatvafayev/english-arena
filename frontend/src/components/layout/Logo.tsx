import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({
  to = "/",
  compact = false,
  className,
}: {
  to?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link to={to} className={cn("group flex items-center gap-3", className)}>
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8B7CFF] via-[#6D5EF5] to-[#4B3FD6] shadow-[0_10px_25px_-10px_rgba(109,94,245,0.9)]">
        <div className="absolute -right-3 -top-3 h-7 w-7 rounded-full bg-white/20 blur-md" />
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 18.5 11.2 5.5h1.6L19 18.5h-2.7l-1.2-2.8H8.9l-1.2 2.8H5Zm4.7-5h4.6L12 8.4l-2.3 5.1Z"
            fill="white"
          />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="display text-[15px] font-extrabold tracking-[-0.02em]">
            English <span className="text-brand">Arena</span>
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">
            Learn · Compete · Grow
          </p>
        </div>
      )}
    </Link>
  );
}
