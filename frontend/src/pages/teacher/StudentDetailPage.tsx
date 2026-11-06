import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Coins,
  Flame,
  Gift,
  Minus,
  Plus,
  Trophy,
  UserRound,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { CoinTransaction, StudentDetail } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { ActivityIcon, CoinAmount, CoinBalance, RankBadge } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate, relativeTime } from "@/lib/utils";

export default function StudentDetailPage() {
  const { studentId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("coins");
  const [coinOpen, setCoinOpen] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("10");

  const { data, isLoading, isError, refetch } = useQuery<StudentDetail>({
    queryKey: ["student-detail", studentId],
    queryFn: () => api.get(`/teacher/students/${studentId}`),
    enabled: Boolean(studentId),
  });

  const adjust = useMutation({
    mutationFn: () =>
      api.post<{ balance: number }>("/teacher/coins", {
        student_id: studentId,
        amount: direction * Math.abs(Number(amount) || 0),
        reason: direction > 0 ? "Ustoz coin berdi" : "Ustoz coin ayirdi",
      }),
    onSuccess: (result: { balance: number }) => {
      toast.success("Coin amali bajarildi", `Yangi balans: ${result.balance} coin`);
      queryClient.invalidateQueries({ queryKey: ["student-detail", studentId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      setCoinOpen(false);
      setAmount("10");
      setDirection(1);
    },
    onError: (error) => toast.error("Amal bajarilmadi", error instanceof ApiError ? error.detail : error.message),
  });

  if (isLoading) return <LoadingBlock label="O'quvchi profili yuklanmoqda..." />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  const student = data.student;
  const coins = data.transactions;
  const tabs = [
    { value: "coins", label: "Coin tarixi", count: coins.length },
    { value: "activity", label: "Faoliyat", count: data.activity.length },
    { value: "reading", label: "O'qish", count: data.reading.length },
    { value: "rewards", label: "Sovg'alar", count: data.reward_requests.length },
  ];

  return (
    <div className="animate-fade-up">
      <button onClick={() => navigate("/teacher/students")} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} /> O'quvchilarga qaytish
      </button>

      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar first={student.first_name} last={student.last_name} size="xl" ring />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="display text-2xl font-extrabold">{student.full_name}</h1>
                {student.group ? <Badge variant="brand">{student.group.name}</Badge> : <Badge variant="neutral">Guruhsiz</Badge>}
                <Badge variant="warning"><Flame size={11} /> {data.streak.current} kun streak</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{student.email}{student.username ? ` · @${student.username}` : ""}</p>
              <p className="mt-1 text-[10px] text-muted/70">Ro'yxatdan o'tgan: {formatDate(student.created_at)}</p>
            </div>
          </div>
          <Button onClick={() => setCoinOpen(true)}><Coins size={16} /> Coin berish / ayirish</Button>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-app-soft/60 p-4">
            <p className="label-xs">Coin balansi</p>
            <div className="mt-2"><CoinBalance amount={student.coin_balance} className="text-2xl" /></div>
          </div>
          <div className="rounded-2xl border border-line bg-app-soft/60 p-4">
            <p className="label-xs">Umumiy reyting</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="display text-2xl font-extrabold">#{data.ranks.all?.rank || "—"}</p>
              <span className="text-[10px] text-muted">{data.ranks.all?.coins || 0} coin</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5 flex flex-col gap-4 xl:flex-row">
        <Card className="flex-1 overflow-hidden">
          <div className="border-b border-line p-4">
            <Tabs items={tabs} value={tab} onChange={setTab} />
          </div>

          <div className="p-4">
            {tab === "coins" && (
              coins.length === 0 ? <EmptyState icon={<Coins size={22} />} title="Coin tarixi bo'sh" description="Birinchi coin amalini bajaring." /> : (
                <div className="space-y-1">
                  {coins.map((tx) => <CoinRow key={tx.id} tx={tx} />)}
                </div>
              )
            )}

            {tab === "activity" && (
              data.activity.length === 0 ? <EmptyState icon={<Activity size={22} />} title="Faollik yo'q" /> : (
                <div className="space-y-1">
                  {data.activity.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-app-soft/60">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-app-soft"><ActivityIcon type={item.type} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{item.title}</p>
                        <p className="text-[10px] text-muted">{relativeTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "reading" && (
              data.reading.length === 0 ? <EmptyState icon={<BookOpen size={22} />} title="Hali kitob o'qimagan" description="Kutubxonadan kitob tanlashni tavsiya qiling." /> : (
                <div className="space-y-2">
                  {data.reading.map((book) => (
                    <div key={book.book_id} className="rounded-xl border border-line bg-app-soft/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold">{book.title}</p>
                        <Badge variant="neutral">{book.level}</Badge>
                      </div>
                      <p className="text-[10px] text-muted">{book.author}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-raised">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${book.progress_percent}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-muted">{Math.round(book.progress_percent)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "rewards" && (
              data.reward_requests.length === 0 ? <EmptyState icon={<Gift size={22} />} title="Sovg'a so'rovi yo'q" /> : (
                <div className="space-y-2">
                  {data.reward_requests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between rounded-xl border border-line bg-app-soft/50 p-3">
                      <div>
                        <p className="text-[12px] font-semibold">{request.reward?.title}</p>
                        <p className="text-[10px] text-muted">{formatDate(request.requested_at, true)} · {request.price} coin</p>
                      </div>
                      <Badge variant={request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}>
                        {request.status === "approved" ? "Tasdiqlangan" : request.status === "rejected" ? "Rad etilgan" : "Kutilmoqda"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </Card>

        <div className="w-full space-y-4 xl:w-[320px]">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-gold" />
              <h3 className="text-sm font-bold">Yutuqlar</h3>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-app-soft p-3">
                <span className="text-[11px] text-muted">Saqlangan so'zlar</span>
                <span className="text-sm font-bold">{data.saved_words_count}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-app-soft p-3">
                <span className="text-[11px] text-muted">Umumiy reyting</span>
                <RankBadge rank={data.ranks.all?.rank} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-app-soft p-3">
                <span className="text-[11px] text-muted">Faol kunlar</span>
                <span className="text-sm font-bold">{data.streak.days.length}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <UserRound size={16} className="text-brand" />
              <h3 className="text-sm font-bold">Profil ma'lumotlari</h3>
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex justify-between gap-2"><span className="text-muted">Login</span><span className="font-semibold">{student.username || "—"}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">Email</span><span className="truncate font-semibold">{student.email}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">Guruh</span><span className="font-semibold">{student.group?.name || "—"}</span></div>
              <div className="flex justify-between gap-2"><span className="text-muted">Oxirgi kirish</span><span className="font-semibold">{student.last_login_at ? formatDate(student.last_login_at, true) : "—"}</span></div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={coinOpen}
        onClose={() => setCoinOpen(false)}
        title="Coin amali"
        subtitle={`${student.full_name} · joriy balans: ${student.coin_balance} coin`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCoinOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => adjust.mutate()} loading={adjust.isPending} disabled={!Number(amount)}>
              {direction === 1 ? "Coin berish" : "Coin ayirish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection(1)}
              className={cn("flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition", direction === 1 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-line bg-app-soft text-muted")}
            >
              <Plus size={15} /> Berish
            </button>
            <button
              type="button"
              onClick={() => setDirection(-1)}
              className={cn("flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition", direction === -1 ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-line bg-app-soft text-muted")}
            >
              <Minus size={15} /> Ayirish
            </button>
          </div>
          <Field label="Miqdor" required>
            <Input type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 20, 50].map((value) => (
              <button key={value} type="button" onClick={() => setAmount(String(value))} className="rounded-lg border border-line bg-app-soft px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-ink">
                {value}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CoinRow({ tx }: { tx: CoinTransaction }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-app-soft/60">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", tx.amount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
        {tx.amount > 0 ? <Plus size={15} /> : <Minus size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium">{tx.reason}</p>
        <p className="text-[10px] text-muted">{formatDate(tx.created_at, true)} · balans: {tx.balance_after}</p>
      </div>
      <CoinAmount amount={tx.amount} className="text-sm" />
    </div>
  );
}
