import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Info, Minus, Plus, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { CoinTransaction, TeacherDashboard, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CoinAmount, CoinBalance } from "@/components/common";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate } from "@/lib/utils";

export default function TeacherCoinsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");
  const [filterStudent, setFilterStudent] = useState("");

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["teacher-students"],
    queryFn: () => api.get("/teacher/students"),
  });
  const { data: dashboard } = useQuery<TeacherDashboard>({
    queryKey: ["teacher-dashboard"],
    queryFn: () => api.get("/teacher/dashboard"),
  });
  const { data: transactions = [], isLoading, isError, refetch } = useQuery<CoinTransaction[]>({
    queryKey: ["teacher-coins", filterStudent],
    queryFn: () => api.get(`/teacher/coins?limit=100${filterStudent ? `&student_id=${filterStudent}` : ""}`),
  });

  const selected = students.find((student) => student.id === studentId);

  const adjust = useMutation({
    mutationFn: () =>
      api.post<{ balance: number }>("/teacher/coins", {
        student_id: studentId,
        amount: direction * Math.abs(Number(amount) || 0),
        reason: reason.trim(),
      }),
    onSuccess: (result: { balance: number }) => {
      toast.success("Coin amali saqlandi", `${selected?.full_name}: yangi balans ${result.balance} coin`);
      setReason("");
      setAmount("10");
      setDirection(1);
      queryClient.invalidateQueries({ queryKey: ["teacher-coins"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (error: Error) => toast.error("Amal bajarilmadi", error.message),
  });

  const totalAwarded = dashboard?.stats.coins_given || 0;
  const recentPositive = useMemo(() => transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0), [transactions]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="Coin boshqaruvi"
        subtitle="Coinlarni faqat ustoz qo'lda beradi yoki kamaytiradi. Har bir amal tarixda saqlanadi."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/[0.12] text-amber-400"><Coins size={19} /></span>
          <div><p className="display text-xl font-extrabold">{totalAwarded}</p><p className="text-[10px] uppercase tracking-wider text-muted">Jami berilgan coin</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/[0.12] text-emerald-400"><Sparkles size={19} /></span>
          <div><p className="display text-xl font-extrabold">{recentPositive}</p><p className="text-[10px] uppercase tracking-wider text-muted">So'nggi amallarda berilgan</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Info size={19} /></span>
          <div><p className="display text-xl font-extrabold">{students.length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Coin olishi mumkin</p></div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Coins size={17} /></span>
            <div>
              <h3 className="text-sm font-bold">Yangi coin amali</h3>
              <p className="text-[10px] text-muted">Balans va tarix bir transaksiyada yangilanadi</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="O'quvchi" required>
              <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                <option value="">O'quvchini tanlang</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} — {student.group?.name || "guruhsiz"} ({student.coin_balance} coin)
                  </option>
                ))}
              </Select>
            </Field>

            {selected && (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-app-soft/60 p-3">
                <Avatar first={selected.first_name} last={selected.last_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{selected.full_name}</p>
                  <p className="text-[10px] text-muted">{selected.group?.name || "Guruhsiz"}</p>
                </div>
                <CoinBalance amount={selected.coin_balance} className="text-xs" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection(1)} className={cn("flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition", direction === 1 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-line bg-app-soft text-muted")}>
                <Plus size={14} /> Berish
              </button>
              <button type="button" onClick={() => setDirection(-1)} className={cn("flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition", direction === -1 ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-line bg-app-soft text-muted")}>
                <Minus size={14} /> Ayirish
              </button>
            </div>

            <Field label="Miqdor" required>
              <div className="relative">
                <Input type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} className="pr-14" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">COIN</span>
              </div>
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 20, 30, 50, 100].map((value) => (
                <button key={value} type="button" onClick={() => setAmount(String(value))} className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition", amount === String(value) ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted hover:text-ink")}>
                  {value}
                </button>
              ))}
            </div>

            <Field label="Sabab" required hint="Sabab o'quvchi coin tarixida ko'rinadi.">
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Masalan: Darsda faol qatnashdi" maxLength={300} />
            </Field>

            <Button
              className="w-full"
              variant={direction === 1 ? "primary" : "danger"}
              onClick={() => adjust.mutate()}
              loading={adjust.isPending}
              disabled={!studentId || !reason.trim() || !Number(amount)}
            >
              {direction === 1 ? <Plus size={16} /> : <Minus size={16} />}
              {direction === 1 ? "Coin berish" : "Coin ayirish"}
            </Button>
            <p className="text-center text-[10px] text-muted">Balans manfiy bo'lishi mumkin emas.</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold">Coin tarixi</h3>
              <p className="text-[11px] text-muted">So'nggi 100 ta amal</p>
            </div>
            <div className="w-full sm:w-64">
              <Select value={filterStudent} onChange={(event) => setFilterStudent(event.target.value)}>
                <option value="">Barcha o'quvchilar</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
              </Select>
            </div>
          </div>

          {isLoading && <div className="p-5"><SkeletonRows rows={8} /></div>}
          {isError && <div className="p-5"><ErrorState onRetry={() => refetch()} /></div>}
          {!isLoading && !isError && transactions.length === 0 && (
            <EmptyState className="m-5 border-0" icon={<Coins size={22} />} title="Amallar yo'q" description="Birinchi coin amalini yuqoridagi forma orqali bajaring." />
          )}

          <div className="divide-y divide-line">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-app-soft/40">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold", tx.amount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                  {tx.amount > 0 ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12px] font-semibold">{tx.student_name || "O'quvchi"}</p>
                    <Badge variant={tx.type === "reward_spend" ? "warning" : tx.type === "reward_refund" ? "brand" : tx.amount > 0 ? "success" : "danger"}>
                      {tx.type === "award" ? "Berildi" : tx.type === "deduction" ? "Ayirildi" : tx.type === "reward_spend" ? "Sovg'a" : "Qaytarildi"}
                    </Badge>
                  </div>
                  <p className="truncate text-[10px] text-muted">{tx.reason}</p>
                </div>
                <div className="text-right">
                  <CoinAmount amount={tx.amount} className="text-xs" />
                  <p className="text-[9px] text-muted">{formatDate(tx.created_at, true)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
