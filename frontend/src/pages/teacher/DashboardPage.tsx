import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Check,
  Coins,
  Gift,
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
import { Badge } from "@/components/ui/Badge";
import { LoadingBlock, ErrorState } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";

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
        subtitle="Guruhni tanlang, o'quvchilarga coin bering va umumiy reytingni kuzating."
        actions={
          <>
            <Link to="/teacher/invitations?new=1">
              <Button variant="secondary">
                <UserPlus size={16} /> O'quvchi taklif qilish
              </Button>
            </Link>
            <Link to="/teacher/students">
              <Button>
                <Coins size={16} /> Coin berish
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="O'quvchilar" value={dash.stats.students} icon={<Users size={18} />} tone="brand" hint="Barcha guruhlar bo'yicha" />
        <StatCard label="Guruhlar" value={dash.stats.groups} icon={<UsersRound size={18} />} tone="emerald" hint="Guruhlarni boshqarish" />
        <StatCard label="Berilgan coin" value={dash.stats.coins_given} icon={<Coins size={18} />} tone="amber" hint="Reyting shu coinlardan hisoblanadi" />
        <StatCard label="Kutilayotgan so'rovlar" value={dash.stats.pending_reward_requests} icon={<Gift size={18} />} tone="sky" hint="Coin do'konidan so'rovlar" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card className="p-5">
          <div>
            <h2 className="text-sm font-bold">Tezkor amallar</h2>
            <p className="text-[11px] text-muted">Ustoz uchun eng kerakli ishlar</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { to: "/teacher/students", icon: Coins, title: "Coin berish", text: "Guruhni tanlab, o'quvchi yonida + yoki − bosing." },
              { to: "/teacher/groups", icon: UsersRound, title: "Guruhlar", text: "Guruh yarating va o'quvchilarni biriktiring." },
              { to: "/teacher/rewards", icon: Gift, title: "Coin do'koni", text: "Sovg'alarni qo'shing va so'rovlarni tasdiqlang." },
              { to: "/teacher/library", icon: BookOpen, title: "Kutubxona", text: "PDF yoki EPUB kitob yuklang." },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-2xl border border-line bg-app-soft/50 p-4 transition hover:border-brand/30 hover:bg-app-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/[0.12] text-brand">
                    <item.icon size={18} />
                  </span>
                  <ArrowRight size={15} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-3 text-[12px] font-bold">{item.title}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.text}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Sovg'a so'rovlari</h2>
              <p className="text-[10px] text-muted">Tasdiqlang yoki rad eting</p>
            </div>
            <Badge variant={dash.stats.pending_reward_requests ? "warning" : "neutral"}>
              {dash.stats.pending_reward_requests}
            </Badge>
          </div>

          {dash.pending_reward_requests.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
              <Gift size={22} className="mx-auto text-muted" />
              <p className="mt-2 text-xs font-semibold">Yangi so'rov yo'q</p>
              <p className="mt-1 text-[10px] text-muted">O'quvchi do'kondan sovg'a so'raganda shu yerda ko'rinadi.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {dash.pending_reward_requests.slice(0, 4).map((request) => (
                <div key={request.id} className="rounded-xl border border-line bg-app-soft/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold">{request.student?.full_name}</p>
                    <span className="text-[10px] font-bold text-gold">{request.price} coin</span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted">{request.reward?.title}</p>
                  <div className="mt-2 flex gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 flex-1 px-2 text-[10px]"
                      onClick={() => resolve.mutate({ id: request.id, action: "approve" })}
                      loading={resolve.isPending}
                    >
                      <Check size={11} /> Tasdiq
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="h-7 flex-1 px-2 text-[10px]"
                      onClick={() => resolve.mutate({ id: request.id, action: "reject" })}
                      loading={resolve.isPending}
                    >
                      <X size={11} /> Rad
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link to="/teacher/rewards" className="mt-3 block text-center text-[11px] font-semibold text-brand hover:underline">
            Barcha so'rovlar
          </Link>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold">Qanday ishlaydi?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { step: "1", title: "Guruh tanlang", text: "O'quvchilar sahifasida guruhni tanlang." },
            { step: "2", title: "Coin bering", text: "O'quvchi yonidagi + yoki − tugmasini bosing. Sabab yozish shart emas." },
            { step: "3", title: "Reytingni ko'ring", text: "Umumiy reyting avtomatik yangilanadi." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl bg-app-soft/60 p-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/[0.12] text-xs font-bold text-brand">
                {item.step}
              </span>
              <p className="mt-2 text-[12px] font-bold">{item.title}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
