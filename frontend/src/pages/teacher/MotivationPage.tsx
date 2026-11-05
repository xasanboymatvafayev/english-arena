import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Crown, Flame, Plus, Sparkles, Target, Trash2, Trophy, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Goal, Group, Leaderboard, SOTD, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate, formatNumber, relativeTime } from "@/lib/utils";

export default function MotivationPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("week");
  const [sotdStudent, setSotdStudent] = useState("");
  const [sotdNote, setSotdNote] = useState("");
  const [goalOpen, setGoalOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ title: "", metric: "coins", target_value: "100", scope: "group", group_id: "", student_id: "" });

  const { data: students = [] } = useQuery<User[]>({ queryKey: ["teacher-students"], queryFn: () => api.get("/teacher/students") });
  const { data: groups = [] } = useQuery<Group[]>({ queryKey: ["teacher-groups"], queryFn: () => api.get("/teacher/groups") });
  const { data: history = [], isLoading: historyLoading } = useQuery<SOTD[]>({ queryKey: ["sotd-history"], queryFn: () => api.get("/teacher/student-of-the-day") });
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError, refetch: refetchGoals } = useQuery<Goal[]>({ queryKey: ["teacher-goals"], queryFn: () => api.get("/teacher/goals") });
  const { data: board, isLoading: boardLoading } = useQuery<Leaderboard>({
    queryKey: ["leaderboard", period],
    queryFn: () => api.get(`/leaderboard?period=${period}`),
  });

  const today = history.find((item) => item.awarded_on === new Date().toISOString().slice(0, 10));

  const setSotd = useMutation({
    mutationFn: () => api.post("/teacher/student-of-the-day", { student_id: sotdStudent, note: sotdNote || null }),
    onSuccess: () => {
      toast.success("Kunning o'quvchisi tanlandi");
      queryClient.invalidateQueries({ queryKey: ["sotd-history"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      setSotdNote("");
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const createGoal = useMutation({
    mutationFn: () => api.post("/teacher/goals", {
      title: goalForm.title,
      metric: goalForm.metric,
      target_value: Number(goalForm.target_value),
      group_id: goalForm.scope === "group" ? goalForm.group_id : null,
      student_id: goalForm.scope === "student" ? goalForm.student_id : null,
    }),
    onSuccess: () => {
      toast.success("Haftalik maqsad qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-goals"] });
      setGoalOpen(false);
      setGoalForm({ title: "", metric: "coins", target_value: "100", scope: "group", group_id: "", student_id: "" });
    },
    onError: (error: Error) => toast.error("Maqsad qo'shilmadi", error.message),
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/goals/${id}`),
    onSuccess: () => {
      toast.success("Maqsad o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-goals"] });
      setDeletingGoal(null);
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const metricLabel = (metric: string) => metric === "coins" ? "coin" : metric === "books" ? "kitob" : "so'z";

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Motivatsiya"
        title="Motivatsiya markazi"
        subtitle="Kunning o'quvchisi, haftalik maqsadlar va reyting — o'quvchilarni rag'batlantirish uchun."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="relative overflow-hidden p-5">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-soft text-gold"><Sparkles size={17} /></span>
            <div><h3 className="text-sm font-bold">Kunning o'quvchisi</h3><p className="text-[10px] text-muted">Har kuni bitta o'quvchi tanlanadi</p></div>
          </div>

          {today ? (
            <div className="relative mt-4 flex items-center gap-4 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/[0.08] to-transparent p-4">
              <Avatar first={today.student_name.split(" ")[0]} last={today.student_name.split(" ")[1]} size="lg" ring />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{today.student_name}</p>
                <p className="text-[10px] text-muted">{today.group_name} · bugun</p>
                {today.note && <p className="mt-1 line-clamp-1 text-[10px] text-muted">“{today.note}”</p>}
              </div>
              <Badge variant="gold"><Award size={11} /> Tanlangan</Badge>
            </div>
          ) : (
            <div className="relative mt-4 rounded-2xl border border-dashed border-line p-4 text-center text-[11px] text-muted">Bugun hali o'quvchi tanlanmagan.</div>
          )}

          <div className="relative mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={sotdStudent} onChange={(event) => setSotdStudent(event.target.value)}>
              <option value="">O'quvchi tanlang</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </Select>
            <Input value={sotdNote} onChange={(event) => setSotdNote(event.target.value)} placeholder="Qisqa izoh (ixtiyoriy)" maxLength={300} />
            <Button onClick={() => setSotd.mutate()} loading={setSotd.isPending} disabled={!sotdStudent}>Tanlash</Button>
          </div>

          <div className="relative mt-4">
            <p className="mb-2 text-[11px] font-bold">So'nggi tanlovlar</p>
            {historyLoading ? <p className="text-[11px] text-muted">Yuklanmoqda...</p> : history.length === 0 ? <p className="text-[11px] text-muted">Hali tanlov yo'q.</p> : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {history.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5">
                    <Avatar first={item.student_name.split(" ")[0]} last={item.student_name.split(" ")[1]} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{item.student_name}</span>
                    <span className="text-[10px] text-muted">{formatDate(item.awarded_on)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Trophy size={17} /></span>
              <div><h3 className="text-sm font-bold">Reyting</h3><p className="text-[10px] text-muted">Ustoz bergan coinlar asosida</p></div>
            </div>
            <Tabs size="sm" value={period} onChange={setPeriod} items={[{ value: "week", label: "Hafta" }, { value: "month", label: "Oy" }, { value: "all", label: "Umumiy" }]} />
          </div>

          {boardLoading ? <LoadingBlock /> : !board ? <ErrorState /> : board.top.length === 0 ? (
            <EmptyState className="mt-4 border-0" icon={<Trophy size={20} />} title="Reyting bo'sh" description="Coin bering va reyting shakllanadi." />
          ) : (
            <div className="mt-4 space-y-1.5">
              {board.top.slice(0, 8).map((row) => (
                <div key={row.student_id} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", row.rank === 1 && "border border-amber-400/20 bg-amber-400/[0.06]")}>
                  <span className={cn("w-6 text-center text-[11px] font-extrabold", row.rank === 1 ? "text-gold" : row.rank <= 3 ? "text-brand" : "text-muted")}>
                    {row.rank === 1 ? <Crown size={15} className="mx-auto" /> : row.rank}
                  </span>
                  <Avatar first={row.first_name} last={row.last_name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">{row.full_name}</p>
                    <p className="text-[9px] text-muted">{row.group_name}</p>
                  </div>
                  <span className="text-[11px] font-bold text-gold">{formatNumber(row.coins)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/[0.12] text-emerald-400"><Target size={17} /></span>
            <div><h3 className="text-sm font-bold">Haftalik maqsadlar</h3><p className="text-[10px] text-muted">Joriy hafta: {formatDate(new Date().toISOString())}</p></div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setGoalOpen(true)}><Plus size={14} /> Maqsad qo'shish</Button>
        </div>

        {goalsLoading && <LoadingBlock />}
        {goalsError && <div className="p-5"><ErrorState onRetry={() => refetchGoals()} /></div>}
        {!goalsLoading && !goalsError && goals.length === 0 && (
          <EmptyState className="m-5 border-0" icon={<Target size={22} />} title="Maqsad yo'q" description="Guruh yoki o'quvchi uchun haftalik maqsad belgilang." action={<Button size="sm" onClick={() => setGoalOpen(true)}>Maqsad qo'shish</Button>} />
        )}
        {goals.length > 0 && (
          <div className="divide-y divide-line">
            {goals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-app-soft text-muted"><Target size={16} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold">{goal.title}</p>
                    <p className="text-[10px] text-muted">{goal.scope === "group" ? goal.group_name : goal.student_name} · {goal.target_value} {metricLabel(goal.metric)}</p>
                  </div>
                </div>
                <Badge variant={goal.metric === "coins" ? "gold" : goal.metric === "books" ? "brand" : "success"}>{metricLabel(goal.metric)}</Badge>
                <button onClick={() => setDeletingGoal(goal)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-rose-500/10 hover:text-rose-400" aria-label="O'chirish"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Haftalik maqsad"
        subtitle="Maqsad joriy hafta uchun belgilanadi va o'quvchi panelida ko'rinadi."
        footer={
          <>
            <Button variant="ghost" onClick={() => setGoalOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => createGoal.mutate()} loading={createGoal.isPending} disabled={!goalForm.title.trim() || !goalForm.target_value || (goalForm.scope === "group" ? !goalForm.group_id : !goalForm.student_id)}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Maqsad nomi" required>
            <Input value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} placeholder="Masalan: Haftada 100 coin yig'ish" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kimga?" required>
              <Select value={goalForm.scope} onChange={(event) => setGoalForm({ ...goalForm, scope: event.target.value })}>
                <option value="group">Guruhga</option>
                <option value="student">O'quvchiga</option>
              </Select>
            </Field>
            <Field label="O'lchov" required>
              <Select value={goalForm.metric} onChange={(event) => setGoalForm({ ...goalForm, metric: event.target.value })}>
                <option value="coins">Coin</option>
                <option value="books">Kitob</option>
                <option value="words">Yangi so'z</option>
              </Select>
            </Field>
          </div>
          {goalForm.scope === "group" ? (
            <Field label="Guruh" required>
              <Select value={goalForm.group_id} onChange={(event) => setGoalForm({ ...goalForm, group_id: event.target.value })}>
                <option value="">Guruh tanlang</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="O'quvchi" required>
              <Select value={goalForm.student_id} onChange={(event) => setGoalForm({ ...goalForm, student_id: event.target.value })}>
                <option value="">O'quvchi tanlang</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Maqsad qiymati" required>
            <Input type="number" min={1} value={goalForm.target_value} onChange={(event) => setGoalForm({ ...goalForm, target_value: event.target.value })} />
          </Field>
          <div className="rounded-xl border border-line bg-app-soft p-3 text-[11px] text-muted">
            Bajarilish foizi ustoz bergan coinlar, boshlangan kitoblar yoki saqlangan so'zlar asosida avtomatik hisoblanadi.
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingGoal)}
        onClose={() => setDeletingGoal(null)}
        onConfirm={() => deletingGoal && deleteGoal.mutate(deletingGoal.id)}
        title="Maqsad o'chirilsinmi?"
        description="O'quvchilar ushbu maqsadni endi ko'rmaydi."
        confirmLabel="O'chirish"
        loading={deleteGoal.isPending}
      />
    </div>
  );
}
