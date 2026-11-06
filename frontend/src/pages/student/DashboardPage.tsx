import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpen,
  BookMarked,
  ClipboardList,
  Coins,
  Crown,
  Flame,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import type { StudentDashboard } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { WeeklyBars } from "@/components/charts/WeeklyBars";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { AnnouncementCard, BookCover, CoinBalance, DueBadge, RankBadge } from "@/components/common";
import { formatDate, formatNumber, todayLabel } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery<StudentDashboard>({
    queryKey: ["student-dashboard"],
    queryFn: () => api.get("/student/dashboard"),
  });

  if (isLoading) return <LoadingBlock label="Sizning maydoningiz yuklanmoqda..." />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const student = data.student;
  const rank = data.ranks.week;
  const champion = data.badges.weekly_champion;

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
                {rank && <Badge variant="gold"><Trophy size={11} /> Haftada #{rank.rank}</Badge>}
              </div>
              <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-muted">
                Bugun ham ingliz tilingizni bir qadam oldinga olib chiqing. Kichik odat — katta natija.
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
              <Link to="/student/coins" className="mt-1 block text-[10px] font-semibold text-muted hover:text-ink">Tarixni ko'rish →</Link>
            </div>
            <div className="hidden rounded-2xl border border-line bg-app-soft/60 p-4 text-center sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Haftalik reyting</p>
              <p className="display mt-1.5 text-3xl font-extrabold text-brand">#{rank?.rank || "—"}</p>
              <Link to="/student/leaderboard" className="mt-1 block text-[10px] font-semibold text-muted hover:text-ink">Reyting →</Link>
            </div>
          </div>
        </div>
      </Card>

      {champion && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand/25 bg-gradient-to-r from-brand/[0.12] to-transparent p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Crown size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Hafta chempioni</p>
            <p className="truncate text-sm font-bold">Siz haftaning eng faol o'quvchisisiz!</p>
            <p className="text-[10px] text-muted">{champion.coins} coin to'plangan</p>
          </div>
          <Badge variant="brand">Champion</Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><Trophy size={14} className="text-gold" /> Haftalik o'rin</div>
          <div className="mt-2 flex items-end justify-between"><p className="display text-2xl font-extrabold">#{rank?.rank || "—"}</p><RankBadge rank={rank?.rank} /></div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><BookOpen size={14} className="text-brand" /> Kitoblar</div>
          <p className="display mt-2 text-2xl font-extrabold">{data.stats.books_started}<span className="ml-1 text-xs font-semibold text-muted">ta boshlandi</span></p>
          <p className="text-[10px] text-muted">{data.stats.books_finished} ta tugallangan</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><BookMarked size={14} className="text-emerald-400" /> So'z daftari</div>
          <p className="display mt-2 text-2xl font-extrabold">{data.stats.saved_words}<span className="ml-1 text-xs font-semibold text-muted">so'z</span></p>
          <Link to="/student/dictionary" className="text-[10px] font-semibold text-brand">Lug'atga o'tish →</Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted"><ClipboardList size={14} className="text-sky-400" /> Vazifalar</div>
          <p className="display mt-2 text-2xl font-extrabold">{data.new_assignments_count}<span className="ml-1 text-xs font-semibold text-muted">ta yangi</span></p>
          <Link to="/student/assignments" className="text-[10px] font-semibold text-brand">Barchasini ko'rish →</Link>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-5">
              <div>
                <h2 className="text-sm font-bold">Yangi vazifalar</h2>
                <p className="text-[10px] text-muted">Darsda ustozga ko'rsatish uchun tayyorlab boring</p>
              </div>
              <Link to="/student/assignments" className="text-[11px] font-semibold text-brand hover:underline">Barchasi</Link>
            </div>
            {data.assignments.length === 0 ? (
              <EmptyState className="m-5 border-0 bg-transparent" icon={<ClipboardList size={22} />} title="Hozircha vazifa yo'q" description="Ustoz yangi vazifa yuborganda shu yerda ko'rinadi." />
            ) : (
              <div className="divide-y divide-line">
                {data.assignments.slice(0, 4).map((assignment) => (
                  <Link key={assignment.id} to="/student/assignments" className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-app-soft/50">
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${assignment.viewed_at ? "bg-app-soft text-muted" : "bg-brand/[0.12] text-brand"}`}>
                      <ClipboardList size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-semibold">{assignment.title}</p>
                        {!assignment.viewed_at && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                      </div>
                      <p className="truncate text-[10px] text-muted">{assignment.description || "Tavsif yo'q"}</p>
                      <div className="mt-1.5"><DueBadge assignment={assignment} /></div>
                    </div>
                    <ArrowRight size={14} className="mt-2 shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Bell size={15} className="text-brand" /><h2 className="text-sm font-bold">So'nggi e'lonlar</h2></div>
              <Link to="/student/announcements" className="text-[11px] font-semibold text-brand">Barchasi</Link>
            </div>
            {data.announcements.length === 0 ? (
              <p className="mt-4 text-[11px] text-muted">Hozircha e'lon yo'q.</p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.announcements.map((item) => <AnnouncementCard key={item.id} item={item} />)}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-bold">Haftalik faollik</h2><p className="text-[10px] text-muted">Platformadagi harakatlaringiz</p></div>
              <Badge variant="warning"><Flame size={10} /> {data.stats.streak} kun</Badge>
            </div>
            <WeeklyBars data={data.weekly_activity} className="mt-3" />
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-4">
              <div><h2 className="text-sm font-bold">O'qishni davom ettirish</h2><p className="text-[10px] text-muted">Oxirgi kitobingiz</p></div>
              <Link to="/student/library" className="text-[10px] font-semibold text-brand">Kutubxona</Link>
            </div>
            {data.reading.length === 0 ? (
              <div className="p-4">
                <EmptyState className="border-0 bg-transparent px-0 py-4" icon={<BookOpen size={20} />} title="Kitob tanlang" description="Kutubxonada siz uchun kitoblar bor." />
                <Link to="/student/library"><Button size="sm" variant="secondary" className="w-full">Kutubxonaga o'tish</Button></Link>
              </div>
            ) : (
              <Link to={`/student/library/${data.reading[0].id}/read`} className="flex gap-3 p-4 transition hover:bg-app-soft/50">
                <div className="w-16 shrink-0"><BookCover book={data.reading[0]} showLevel={false} /></div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12px] font-bold">{data.reading[0].title}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{data.reading[0].author}</p>
                  <Progress value={data.reading[0].progress?.progress_percent || 0} className="mt-2" showLabel />
                  <p className="mt-1 text-[9px] text-muted">Davom etish uchun bosing</p>
                </div>
              </Link>
            )}
          </Card>

          <Card className="border-brand/20 bg-gradient-to-br from-brand/[0.08] to-transparent p-5">
            <div className="flex items-center gap-2 text-brand"><Crown size={15} /><p className="text-[11px] font-bold">Hafta chempioni</p></div>
            {data.champion ? (
              <div className="mt-2 flex items-center gap-3">
                <Avatar first={data.champion.first_name} last={data.champion.last_name} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{data.champion.full_name}</p><p className="text-[10px] text-muted">{data.champion.coins} coin</p></div>
                <Crown size={16} className="text-gold" />
              </div>
            ) : <p className="mt-2 text-[11px] text-muted">Hali aniqlanmagan.</p>}
            <Link to="/student/leaderboard" className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand">To'liq reyting <ArrowRight size={11} /></Link>
          </Card>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted/70">Bugungi sana: {formatDate(new Date().toISOString())} · Bilim sari qadam tashlang!</p>
    </div>
  );
}
