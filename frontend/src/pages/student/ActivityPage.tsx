import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BookOpen, Coins, Flame, Sparkles, Target, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import type { ActivityItem } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { WeeklyBars } from "@/components/charts/WeeklyBars";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ActivityIcon } from "@/components/common";
import { formatDate, parseDateValue, relativeTime } from "@/lib/utils";

type ActivityResponse = {
  streak: { current: number; active_today: boolean; days: string[] };
  weekly: { date: string; count: number }[];
  items: ActivityItem[];
};

export default function StudentActivityPage() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, isError, refetch } = useQuery<ActivityResponse>({
    queryKey: ["student-activity"],
    queryFn: () => api.get("/student/activity"),
  });

  const filtered = useMemo(() => {
    const items = data?.items || [];
    if (filter === "coins") return items.filter((item) => item.type.startsWith("coins") || item.type.startsWith("reward"));
    if (filter === "reading") return items.filter((item) => item.type.startsWith("book"));
    if (filter === "learning") return items.filter((item) => ["dictionary_search", "word_saved", "verb_saved", "assignment_viewed"].includes(item.type));
    return items;
  }, [data, filter]);

  if (isLoading) return <LoadingBlock label="Faoliyatingiz yuklanmoqda..." />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const weekTotal = data.weekly.reduce((sum, item) => sum + item.count, 0);
  const activeDays = data.weekly.filter((item) => item.count > 0).length;

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Faoliyat" title="Faoliyatim" subtitle="Platformadagi harakatlaringiz, streak va o'qish odatlaringiz." />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="relative overflow-hidden p-6">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_12px_30px_-12px_rgba(245,158,11,0.9)]">
              <Flame size={30} />
            </div>
            <div>
              <p className="label-xs text-amber-400/80">Joriy streak</p>
              <p className="display mt-1 text-4xl font-extrabold">{data.streak.current} <span className="text-base font-semibold text-muted">kun</span></p>
              <p className="mt-1 text-[11px] text-muted">{data.streak.active_today ? "Bugun faol bo'ldingiz ✓" : "Bugun hali faollik yo'q — bitta qadam tashlang!"}</p>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-1.5">
            {data.weekly.map((day) => {
              const active = data.streak.days.includes(day.date);
              const date = parseDateValue(day.date);
              return (
                <div key={day.date} className={`flex h-12 flex-1 flex-col items-center justify-center rounded-xl border text-[9px] font-semibold ${active ? "border-amber-400/30 bg-amber-400/10 text-amber-400" : "border-line bg-app-soft/50 text-muted"}`}>
                  <span>{new Intl.DateTimeFormat("uz-UZ", { weekday: "short", timeZone: "Asia/Tashkent" }).format(date).replace(".", "")}</span>
                  <span className="mt-0.5 text-[11px] font-bold">{date.getDate()}</span>
                  {active && <span className="mt-0.5 h-1 w-1 rounded-full bg-amber-400" />}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-bold">Haftalik faollik</p><p className="text-[10px] text-muted">Kunlik harakatlar soni</p></div>
            <Badge variant="brand"><TrendingUp size={11} /> {weekTotal} ta</Badge>
          </div>
          <WeeklyBars data={data.weekly} className="mt-4" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-app-soft p-3"><p className="text-[9px] uppercase tracking-wider text-muted">Faol kunlar</p><p className="display mt-1 text-lg font-extrabold">{activeDays}/7</p></div>
            <div className="rounded-xl bg-app-soft p-3"><p className="text-[9px] uppercase tracking-wider text-muted">Streak</p><p className="display mt-1 text-lg font-extrabold">{data.streak.current} kun</p></div>
          </div>
        </Card>
      </div>

      <div className="mt-5 mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "Barchasi", count: data.items.length },
            { value: "coins", label: "Coin & sovg'a" },
            { value: "reading", label: "O'qish" },
            { value: "learning", label: "O'rganish" },
          ]}
        />
        <span className="text-[10px] text-muted"><Activity size={11} className="inline" /> Har qanday harakat streak uchun hisoblanadi</span>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={<Activity size={24} />} title="Faollik yo'q" description="Lug'atdan so'z qidiring, kitob o'qing yoki vazifani ko'ring." />
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-app-soft/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-app-soft"><ActivityIcon type={item.type} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{item.title}</p>
                  <p className="text-[10px] text-muted">{formatDate(item.created_at, true)} · {relativeTime(item.created_at)}</p>
                </div>
                <span className="hidden text-[9px] uppercase tracking-wider text-muted sm:block">{item.type.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { icon: BookOpen, title: "Har kuni 10 daqiqa o'qish", text: "Kutubxonadan kichik bo'lim o'qib, streakni davom ettiring.", tone: "text-brand bg-brand/[0.10]" },
          { icon: Target, title: "Haftalik maqsad", text: "Ustoz qo'ygan maqsadni dashboardda kuzatib boring.", tone: "text-emerald-400 bg-emerald-500/[0.10]" },
          { icon: Coins, title: "Coin to'plang", text: "Faol qatnashib, sovg'alar do'konidan o'zingizga sovg'a oling.", tone: "text-amber-400 bg-amber-500/[0.10]" },
        ].map((item) => (
          <Card key={item.title} className="flex items-start gap-3 p-4">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.tone}`}><item.icon size={16} /></span>
            <div><p className="text-[11px] font-bold">{item.title}</p><p className="mt-1 text-[10px] leading-relaxed text-muted">{item.text}</p></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
