import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Award,
  Check,
  ClipboardList,
  Coins,
  Crown,
  Gift,
  Plus,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { TeacherDashboard as TeacherDashboardType } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { ActivityIcon } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { formatNumber, relativeTime } from "@/lib/utils";

const emptyDash: TeacherDashboardType = {
  stats: { students: 0, groups: 0, assignments: 0, coins_given: 0, pending_reward_requests: 0, weekly_active_students: 0 },
  weekly_champion: null,
  student_of_the_day: null,
  top_students: [],
  recent_activity: [],
  pending_reward_requests: [],
};

export default function TeacherDashboardPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery<TeacherDashboardType>({
    queryKey: ["teacher-dashboard"],
    queryFn: () => api.get("/teacher/dashboard"),
  });
  const dash = data || emptyDash;

  const resolve = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.post(`/teacher/reward-requests/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === "approve" ? "So'rov tasdiqlandi" : "So'rov rad etildi va coin qaytarildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-requests"] });
    },
    onError: (error: Error) => toast.error("Amal bajarilmadi", error.message),
  });

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Tashkent" }).format(new Date())
  );
  const greeting = hour < 12 ? "Xayrli tong" : hour < 18 ? "Xayrli kun" : "Xayrli kech";

  if (isLoading) return <LoadingBlock label="Boshqaruv paneli yuklanmoqda..." />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Ustoz paneli"
        title={`${greeting}, ${user?.first_name || "ustoz"}!`}
        subtitle="Bugungi holat, o'quvchilar faolligi va kutilayotgan so'rovlar bir joyda."
        actions={
          <>
            <Link to="/teacher/invitations?new=1">
              <Button variant="secondary">
                <UserPlus size={16} /> Taklif yuborish
              </Button>
            </Link>
            <Link to="/teacher/assignments?new=1">
              <Button>
                <Plus size={16} /> Yangi vazifa
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami o'quvchilar" value={dash.stats.students} icon={<Users size={18} />} tone="brand" hint={<span className="text-emerald-400">● {dash.stats.weekly_active_students} ta bu hafta faol</span>} />
        <StatCard label="Guruhlar" value={dash.stats.groups} icon={<UsersRound size={18} />} tone="emerald" hint="Daraja bo'yicha ajratilgan" />
        <StatCard label="Berilgan vazifalar" value={dash.stats.assignments} icon={<ClipboardList size={18} />} tone="sky" hint="Barcha guruhlar bo'yicha" />
        <StatCard label="Berilgan coin" value={dash.stats.coins_given} icon={<Coins size={18} />} tone="amber" hint={<span className="inline-flex items-center gap-1"><TrendingUp size={11} /> O'quvchilarni rag'batlantirish</span>} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="relative overflow-hidden p-6 xl:col-span-2">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="label-xs">Hafta chempioni</p>
              <h2 className="display mt-2 text-xl font-extrabold">
                {dash.weekly_champion ? dash.weekly_champion.full_name : "Hali aniqlanmagan"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {dash.weekly_champion ? `${dash.weekly_champion.group_name || "Guruhsiz"} · haftalik coinlar asosida` : "Bu hafta coin berishni boshlang"}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-soft text-gold">
              <Crown size={21} />
            </div>
          </div>

          {dash.weekly_champion ? (
            <div className="relative mt-6 flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/[0.10] to-transparent p-4">
              <Avatar first={dash.weekly_champion.first_name} last={dash.weekly_champion.last_name} size="lg" ring />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{dash.weekly_champion.full_name}</p>
                <p className="text-[11px] text-muted">{dash.weekly_champion.group_name}</p>
              </div>
              <div className="text-right">
                <p className="display text-2xl font-extrabold text-gold">+{dash.weekly_champion.coins}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted">coin</p>
              </div>
            </div>
          ) : (
            <div className="relative mt-5 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
              Haftalik reyting uchun hali coin berilmagan.
            </div>
          )}

          <div className="relative mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold">Haftalik top 5</p>
              <Link to="/teacher/motivation" className="text-[11px] font-semibold text-brand hover:underline">
                Barchasi <ArrowUpRight size={11} className="inline" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {dash.top_students.length === 0 && <p className="text-xs text-muted">Ma'lumot yo'q</p>}
              {dash.top_students.map((student) => (
                <div key={student.student_id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-app-soft">
                  <span className="w-5 text-center text-[11px] font-bold text-muted">{student.rank}</span>
                  <Avatar first={student.first_name} last={student.last_name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{student.full_name}</p>
                    <p className="text-[10px] text-muted">{student.group_name}</p>
                  </div>
                  <span className="text-xs font-bold text-gold">{formatNumber(student.coins)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="relative overflow-hidden p-6">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative flex items-center justify-between">
              <p className="label-xs">Kunning o'quvchisi</p>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Sparkles size={17} /></div>
            </div>
            {dash.student_of_the_day ? (
              <div className="relative mt-4 flex flex-col items-center text-center">
                <Avatar first={dash.student_of_the_day.student_name.split(" ")[0]} last={dash.student_of_the_day.student_name.split(" ")[1]} size="xl" ring />
                <p className="mt-3 text-sm font-bold">{dash.student_of_the_day.student_name}</p>
                <p className="text-[11px] text-muted">{dash.student_of_the_day.group_name}</p>
                {dash.student_of_the_day.note && (
                  <p className="mt-2 rounded-xl bg-app-soft px-3 py-2 text-[11px] leading-relaxed text-muted">“{dash.student_of_the_day.note}”</p>
                )}
                <Link to="/teacher/motivation" className="mt-3 text-[11px] font-semibold text-brand hover:underline">O'zgartirish</Link>
              </div>
            ) : (
              <div className="relative mt-4">
                <EmptyState icon={<Award size={20} />} title="Hali tanlanmagan" description="Bugungi eng faol o'quvchini tanlang." className="border-0 bg-transparent px-0 py-4" />
                <Link to="/teacher/motivation"><Button variant="secondary" size="sm" className="w-full">Tanlash</Button></Link>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">Kutilayotgan so'rovlar</p>
              <Badge variant={dash.stats.pending_reward_requests ? "warning" : "neutral"}>{dash.stats.pending_reward_requests}</Badge>
            </div>
            {dash.pending_reward_requests.length === 0 ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">Yangi sovg'a so'rovlari yo'q.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {dash.pending_reward_requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="rounded-xl border border-line bg-app-soft/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-bold">{request.student?.full_name}</p>
                      <span className="text-[10px] font-bold text-gold">{request.price} coin</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted">{request.reward?.title}</p>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="sm" variant="secondary" className="h-7 flex-1 px-2 text-[10px]" onClick={() => resolve.mutate({ id: request.id, action: "approve" })} loading={resolve.isPending}>
                        <Check size={11} /> Tasdiq
                      </Button>
                      <Button size="sm" variant="danger" className="h-7 flex-1 px-2 text-[10px]" onClick={() => resolve.mutate({ id: request.id, action: "reject" })} loading={resolve.isPending}>
                        <X size={11} /> Rad
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link to="/teacher/rewards" className="mt-3 block text-center text-[11px] font-semibold text-brand hover:underline">Barcha so'rovlar</Link>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">So'nggi harakatlar</p>
              <p className="text-[11px] text-muted">O'quvchilaringizning so'nggi faolligi</p>
            </div>
            <ActivityIcon type="login" />
          </div>
          {dash.recent_activity.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">Hozircha faollik yo'q.</p>
          ) : (
            <div className="space-y-1">
              {dash.recent_activity.slice(0, 7).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-app-soft">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-app-soft"><ActivityIcon type={item.type} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{item.title}</p>
                    <p className="text-[10px] text-muted">{item.student_name} · {relativeTime(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <p className="text-sm font-bold">Tezkor amallar</p>
          <p className="text-[11px] text-muted">Eng ko'p ishlatiladigan bo'limlar</p>
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            {[
              { to: "/teacher/groups", icon: UsersRound, label: "Guruh yaratish", hint: "Yangi guruh" },
              { to: "/teacher/invitations?new=1", icon: UserPlus, label: "O'quvchi taklif qilish", hint: "Email orqali" },
              { to: "/teacher/coins", icon: Coins, label: "Coin berish", hint: "Rag'batlantirish" },
              { to: "/teacher/rewards", icon: Gift, label: "Sovg'a qo'shish", hint: "Do'kon" },
            ].map((item) => (
              <Link key={item.to} to={item.to} className="group rounded-2xl border border-line bg-app-soft/50 p-4 transition hover:border-brand/30 hover:bg-app-surface">
                <item.icon size={18} className="text-brand" />
                <p className="mt-3 text-[11px] font-bold">{item.label}</p>
                <p className="text-[10px] text-muted">{item.hint}</p>
              </Link>
            ))}
          </div>
          <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.06] p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Crown size={18} /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold">Haftalik chempion avtomatik aniqlanadi</p>
              <p className="text-[10px] leading-relaxed text-muted">Eng ko'p coin olgan o'quvchi maxsus badge oladi.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
