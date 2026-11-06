import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import type { Leaderboard } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { cn, formatNumber } from "@/lib/utils";

export default function LeaderboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<Leaderboard>({
    queryKey: ["leaderboard", "all"],
    queryFn: () => api.get("/leaderboard?period=all"),
  });

  const rows = useMemo(() => data?.top || [], [data]);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const me = data?.me;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Musobaqa"
        title="Umumiy reyting"
        subtitle="Faqat ustoz bergan coinlar asosida yagona reyting."
      />

      {isLoading && <LoadingBlock label="Reyting hisoblanmoqda..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState icon={<Trophy size={26} />} title="Reyting hozircha bo'sh" description="Ustoz coin berganda reyting shakllanadi." />
      )}

      {rows.length > 0 && (
        <>
          <Card className="relative mb-5 overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-400/[0.10] to-transparent" />
            <div className="relative">
              <div className="mb-5 flex items-center justify-center gap-2 text-gold sm:justify-start">
                <Crown size={18} />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Umumiy reyting</span>
              </div>

              <div className="flex items-end justify-center gap-2 sm:gap-6">
                {top3[1] && <PodiumRow row={top3[1]} place={2} height="h-24" />}
                {top3[0] && <PodiumRow row={top3[0]} place={1} height="h-32" />}
                {top3[2] && <PodiumRow row={top3[2]} place={3} height="h-20" />}
              </div>
            </div>
          </Card>

          {me && (
            <Card className="mb-4 border-brand/25 bg-brand/[0.05] p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Sparkles size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Sizning o'rningiz</p>
                  <p className="text-sm font-bold">#{me.rank} · {me.full_name}</p>
                </div>
                <div className="text-right">
                  <p className="display text-lg font-extrabold text-gold">{formatNumber(me.coins)}</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted">coin</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="grid grid-cols-[48px_1fr_1fr_80px] gap-3 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted sm:grid-cols-[48px_1.6fr_1fr_100px]">
              <span>#</span><span>O'quvchi</span><span>Guruh</span><span className="text-right">Coin</span>
            </div>
            <div className="divide-y divide-line">
              {rest.map((row) => (
                <div
                  key={row.student_id}
                  className={cn(
                    "grid grid-cols-[48px_1fr_1fr_80px] items-center gap-3 px-5 py-3 sm:grid-cols-[48px_1.6fr_1fr_100px]",
                    row.student_id === me?.student_id && "bg-brand/[0.05]"
                  )}
                >
                  <span className="display text-sm font-extrabold text-muted">{row.rank}</span>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar first={row.first_name} last={row.last_name} size="xs" />
                    <span className="truncate text-[12px] font-semibold">{row.full_name}</span>
                  </div>
                  <span className="truncate text-[10px] text-muted">{row.group_name || "—"}</span>
                  <span className="text-right text-[12px] font-bold text-gold">{formatNumber(row.coins)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1"><Trophy size={12} /> Bitta umumiy reyting — barcha vaqt.</span>
        <span>Faqat ustoz bergan coinlar hisoblanadi.</span>
      </div>
    </div>
  );
}

function PodiumRow({
  row,
  place,
  height,
}: {
  row: { first_name: string; last_name: string; full_name: string; coins: number; group_name?: string | null };
  place: number;
  height: string;
}) {
  const config = {
    1: { ring: "ring-2 ring-amber-400/60", badge: "bg-gradient-to-br from-amber-300 to-amber-500 text-[#2A1B05]", icon: Crown, size: "h-16 w-16 text-xl" },
    2: { ring: "ring-2 ring-slate-300/40", badge: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900", icon: Medal, size: "h-14 w-14 text-lg" },
    3: { ring: "ring-2 ring-orange-400/40", badge: "bg-gradient-to-br from-orange-300 to-orange-500 text-[#2A1B05]", icon: Medal, size: "h-14 w-14 text-lg" },
  }[place]!;
  const Icon = config.icon;

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      <div className={cn("relative grid place-items-center rounded-full", config.size, config.ring)}>
        <Avatar first={row.first_name} last={row.last_name} size={place === 1 ? "lg" : "md"} />
        <span className={cn("absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full shadow", config.badge)}>
          <Icon size={13} />
        </span>
      </div>
      <p className="mt-2 max-w-full truncate text-[11px] font-bold">{row.full_name}</p>
      <p className="text-[9px] text-muted">{row.group_name || "—"}</p>
      <p className="mt-0.5 text-[11px] font-extrabold text-gold">{formatNumber(row.coins)}</p>
      <div className={cn("mt-2 w-full rounded-t-xl border border-b-0 border-line bg-gradient-to-b from-brand/20 to-transparent", height)}>
        <p className="pt-2 text-center text-[10px] font-bold text-muted">#{place}</p>
      </div>
    </div>
  );
}
