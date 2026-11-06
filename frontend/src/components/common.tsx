import { Link } from "react-router-dom";
import { CalendarClock, Coins, Flame, Trophy } from "lucide-react";
import type { Assignment, Book, Invitation, RewardRequest } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { absoluteApiUrl } from "@/lib/api";
import { cn, formatDate, formatNumber, relativeTime } from "@/lib/utils";

export function CoinAmount({
  amount,
  className,
  showSign = true,
}: {
  amount: number;
  className?: string;
  showSign?: boolean;
}) {
  const positive = amount > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-display font-bold",
        positive ? "text-emerald-400" : "text-rose-400",
        className
      )}
    >
      {showSign && (positive ? "+" : "")}
      {formatNumber(amount)}
      <Coins size={12} className="opacity-70" />
    </span>
  );
}

export function CoinBalance({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display font-extrabold", className)}>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-gold-soft text-gold">
        <Coins size={13} />
      </span>
      {formatNumber(amount)}
    </span>
  );
}

export function StreakBadge({ days }: { days: number }) {
  if (!days) return <Badge variant="neutral">0 kun</Badge>;
  return (
    <Badge variant={days >= 7 ? "gold" : "warning"}>
      <Flame size={11} /> {days} kun
    </Badge>
  );
}

export function RankBadge({ rank }: { rank?: number | null }) {
  if (!rank) return <Badge variant="neutral">—</Badge>;
  if (rank === 1) return <Badge variant="gold"><Trophy size={11} /> #{rank}</Badge>;
  if (rank <= 3) return <Badge variant="brand"><Trophy size={11} /> #{rank}</Badge>;
  return <Badge variant="neutral">#{rank}</Badge>;
}

export function DueBadge({ assignment }: { assignment: Assignment }) {
  const status = assignment.due_status;
  if (!assignment.due_at) return <Badge variant="neutral">Muddat yo'q</Badge>;
  if (status === "overdue") return <Badge variant="danger">Muddati o'tgan</Badge>;
  if (status === "today") return <Badge variant="warning">Bugun</Badge>;
  return (
    <Badge variant="success">
      <CalendarClock size={11} /> {formatDate(assignment.due_at)}
    </Badge>
  );
}

export function InvitationStatus({ status }: { status: Invitation["status"] }) {
  const map = {
    pending: { label: "Kutilmoqda", variant: "warning" as const },
    accepted: { label: "Qabul qilindi", variant: "success" as const },
    expired: { label: "Muddati tugagan", variant: "neutral" as const },
    revoked: { label: "Bekor qilindi", variant: "danger" as const },
  };
  const item = map[status];
  return <Badge variant={item.variant} dot>{item.label}</Badge>;
}

export function RequestStatus({ status }: { status: RewardRequest["status"] }) {
  const map = {
    pending: { label: "Kutilmoqda", variant: "warning" as const },
    approved: { label: "Tasdiqlandi", variant: "success" as const },
    rejected: { label: "Rad etildi", variant: "danger" as const },
  };
  const item = map[status];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

const levelColors: Record<string, string> = {
  A1: "from-emerald-400 to-teal-500",
  A2: "from-teal-400 to-cyan-500",
  B1: "from-sky-400 to-blue-500",
  B2: "from-indigo-400 to-violet-500",
  C1: "from-violet-400 to-purple-500",
  C2: "from-fuchsia-400 to-pink-500",
};

export function BookCover({
  book,
  className,
  showLevel = true,
}: {
  book: Book;
  className?: string;
  showLevel?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-br shadow-lg",
        levelColors[book.level] || "from-slate-500 to-slate-700",
        className
      )}
    >
      {book.cover_url ? (
        <img
          src={absoluteApiUrl(book.cover_url)}
          alt={book.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full flex-col justify-between p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            English Arena
          </span>
          <div>
            <p className="font-display text-base font-extrabold leading-tight text-white">
              {book.title}
            </p>
            <p className="mt-1 text-[11px] text-white/70">{book.author}</p>
          </div>
        </div>
      )}
      {showLevel && (
        <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          {book.level}
        </span>
      )}
    </div>
  );
}

export function ActivityIcon({ type }: { type: string }) {
  const emoji: Record<string, string> = {
    coins_awarded: "🪙",
    coins_deducted: "➖",
    reward_requested: "🎁",
    reward_approved: "✅",
    reward_rejected: "↩️",
    assignment_received: "📚",
    assignment_viewed: "👀",
    book_started: "📖",
    book_read: "📖",
    word_saved: "✍️",
    verb_saved: "🔤",
    dictionary_search: "🔎",
    login: "🚀",
    announcement: "📢",
    student_of_the_day: "⭐",
    invitation_sent: "✉️",
    account_created: "🎉",
    study: "📘",
    bookmark_added: "🔖",
  };
  return <span className="text-base">{emoji[type] || "•"}</span>;
}

export function AnnouncementCard({ item }: { item: { title: string; body: string; is_pinned: boolean; created_at: string } }) {
  return (
    <div className="rounded-xl border border-line bg-app-soft/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold">{item.title}</p>
        {item.is_pinned && <Badge variant="brand">Muhim</Badge>}
      </div>
      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{item.body}</p>
      <p className="mt-2 text-[10px] text-muted/70">{relativeTime(item.created_at)}</p>
    </div>
  );
}

export function StudentLink({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    <Link to={`/teacher/students/${id}`} className={cn("font-semibold hover:text-brand", className)}>
      {name}
    </Link>
  );
}
