import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookMarked, BookOpen, Coins, Flame, Gift, Trophy, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { StudentDashboard } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { BookCover, RankBadge } from "@/components/common";
import { formatNumber, todayLabel } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<StudentDashboard>({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get("/student/dashboard"),
  });

  if (isLoading) return <LoadingBlock label="Sizning maydoningiz yuklanmoqda..." />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const student = data.student;
  const rank = data.ranks.all;
  const reading = data.reading[0];

  return (
    <div className="space-y-5 animate-fade-up">
      <Card className="relative overflow-hidden p-6 sm:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar first={student.first_name} last={student.last_name} size="xl" ring />
            <div>
              <p className="label-xs">{todayLabel()}</p>
              <h1 className="display mt-1.5 text-3xl font-extrabold">
                Salom, {student.first_name}! <span className="inline-block animate-float">👋</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="brand"><Users size={11} /> {student.group?.name || "Guruhsiz"}</Badge>
                <Badge variant="warning"><Flame size={11} /> {data.stats.streak} kun streak</Badge>
                {rank && <Badge variant="gold"><Trophy size={11} /> Umumiy #{rank.rank}</Badge>}
              </div>
              <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-muted">
                Coinlaringizni do'konda ishlating, kutubxonadan o'qing va reytingda yuqoriga ko'tariling.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.14] to-transparent p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">Coin balansingiz</p>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <Coins size={20} className="text-gold" />
                <span className="display text-3xl font-extrabold">{formatNumber(data.stats.coins)}</span>
              </div>
              <Link to="/student/coins" className="mt-1 block text-[10px] font-semibold text-muted hover:text-ink">
                Tarixni ko'rish →
              </Link>
            </div>
            <div className="hidden rounded-2xl border border-line bg-app-soft/60 p-4 text-center sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Umumiy reyting</p>
              <p className="display mt-1.5 text-3xl font-extrabold text-brand">#{rank?.rank || "—"}</p>
              <Link to="/student/leaderboard" className="mt-1 block text-[10px] font-semibold text-muted hover:text-ink">
                Reyting →
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><Trophy size={14} className="text-gold" /> Umumiy o'rin</div>
          <div className="mt-2 flex items-end justify-between">
            <p className="display text-2xl font-extrabold">#{rank?.rank || "—"}</p>
            <RankBadge rank={rank?.rank} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><BookOpen size={14} className="text-brand" /> Kitoblar</div>
          <p className="display mt-2 text-2xl font-extrabold">
            {data.stats.books_started}
            <span className="ml-1 text-xs font-semibold text-muted">ta boshlandi</span>
          </p>
          <p className="text-[10px] text-muted">{data.stats.books_finished} ta tugallangan</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><BookMarked size={14} className="text-emerald-400" /> So'z daftari</div>
          <p className="display mt-2 text-2xl font-extrabold">
            {data.stats.saved_words}
            <span className="ml-1 text-xs font-semibold text-muted">so'z</span>
          </p>
          <Link to="/student/dictionary" className="text-[10px] font-semibold text-brand">Lug'atga o'tish →</Link>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h2 className="text-sm font-bold">O'qishni davom ettirish</h2>
              <p className="text-[10px] text-muted">Oxirgi kitobingiz</p>
            </div>
            <Link to="/student/library" className="text-[11px] font-semibold text-brand hover:underline">Kutubxona</Link>
          </div>
          {reading ? (
            <Link to={`/student/library/${reading.id}/read`} className="flex gap-4 p-5 transition hover:bg-app-soft/40">
              <div className="w-20 shrink-0"><BookCover book={reading} showLevel={false} /></div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-bold">{reading.title}</p>
                <p className="mt-0.5 text-[10px] text-muted">{reading.author}</p>
                <Progress value={reading.progress?.progress_percent || 0} className="mt-3" showLabel />
                <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand">
                  Davom etish <ArrowRight size={11} />
                </p>
              </div>
            </Link>
          ) : (
            <div className="p-5">
              <EmptyState
                className="border-0 bg-transparent px-0 py-4"
                icon={<BookOpen size={22} />}
                title="Hali kitob tanlanmagan"
                description="Kutubxonadan o'zingizga mos kitob tanlang."
              />
              <Link to="/student/library"><Button size="sm" variant="secondary" className="w-full">Kutubxonaga o'tish</Button></Link>
            </div>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="border-brand/20 bg-gradient-to-br from-brand/[0.08] to-transparent p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Gift size={19} /></span>
              <ArrowRight size={15} className="text-muted" />
            </div>
            <p className="mt-3 text-sm font-bold">Coin do'koni</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">To'plagan coinlaringizni sovg'alarga almashtiring.</p>
            <Link to="/student/rewards"><Button size="sm" variant="secondary" className="mt-3 w-full">Do'konga o'tish</Button></Link>
          </Card>

          <Card className="border-amber-400/20 bg-gradient-to-br from-amber-400/[0.08] to-transparent p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-soft text-gold"><Trophy size={19} /></span>
              <ArrowRight size={15} className="text-muted" />
            </div>
            <p className="mt-3 text-sm font-bold">Umumiy reyting</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              {rank ? `Siz ${rank.coins} coin bilan #${rank.rank}-o'rindasiz.` : "Ustoz coin berganda reyting shakllanadi."}
            </p>
            <Link to="/student/leaderboard"><Button size="sm" variant="secondary" className="mt-3 w-full">Reytingni ko'rish</Button></Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
