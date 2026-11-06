import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Minus, Plus, Search, UserPlus, Users, UsersRound } from "lucide-react";
import { api } from "@/lib/api";
import type { Group, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CoinBalance } from "@/components/common";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";

export default function StudentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState(params.get("group") || "");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });

  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (groupId) query.set("group_id", groupId);
  const queryString = query.toString();

  const { data: students = [], isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ["teacher-students", queryString],
    queryFn: () => api.get(`/teacher/students${queryString ? `?${queryString}` : ""}`),
  });

  const amountFor = (studentId: string) => amounts[studentId] ?? "5";
  const setAmountFor = (studentId: string, value: string) => {
    setAmounts((current) => ({ ...current, [studentId]: value }));
  };

  const adjust = useMutation({
    mutationFn: ({ student, delta, value }: { student: User; delta: 1 | -1; value: number }) =>
      api.post<{ balance: number }>("/teacher/coins", {
        student_id: student.id,
        amount: delta * value,
        reason: delta > 0 ? "Ustoz coin berdi" : "Ustoz coin ayirdi",
      }),
    onSuccess: (result, variables) => {
      toast.success(
        `${variables.delta > 0 ? "+" : "−"}${variables.value} coin`,
        `${variables.student.full_name}: yangi balans ${result.balance} coin`
      );
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["student-detail"] });
    },
    onError: (error: Error) => toast.error("Amal bajarilmadi", error.message),
  });

  const selectedGroup = groups.find((group) => group.id === groupId);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Asosiy ish"
        title="O'quvchilar"
        subtitle="Har bir o'quvchi yonidagi maydonga miqdorni yozing, keyin + yoki − bosing. Sabab yozish shart emas."
        actions={
          <>
            <Link to="/teacher/groups">
              <Button variant="secondary">
                <UsersRound size={16} /> Guruhlar
              </Button>
            </Link>
            <Link to="/teacher/invitations?new=1">
              <Button>
                <UserPlus size={16} /> O'quvchi qo'shish
              </Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="w-full lg:w-64">
            <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Barcha guruhlar</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.member_count})
                </option>
              ))}
            </Select>
          </div>

          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="O'quvchini qidirish..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] text-muted">
            {selectedGroup ? `${selectedGroup.name} guruhi` : "Barcha guruhlar"} · {students.length} ta o'quvchi
          </p>
          <p className="text-[10px] font-semibold text-brand">
            <Coins size={12} className="mr-1 inline" />
            Har bir qatorga miqdorni yozing
          </p>
        </div>
      </Card>

      {isLoading && <Card className="p-5"><SkeletonRows rows={6} /></Card>}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && students.length === 0 && (
        <EmptyState
          icon={<Users size={26} />}
          title="O'quvchi topilmadi"
          description={search || groupId ? "Qidiruv yoki guruhni o'zgartirib ko'ring." : "Birinchi o'quvchini taklif qiling."}
          action={<Link to="/teacher/invitations?new=1"><Button size="sm">O'quvchi qo'shish</Button></Link>}
        />
      )}

      {students.length > 0 && (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[1.7fr_1fr_0.7fr_90px_120px] gap-4 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted md:grid">
            <span>O'quvchi</span>
            <span>Guruh</span>
            <span>Balans</span>
            <span>Miqdor</span>
            <span className="text-right">Amal</span>
          </div>

          <div className="divide-y divide-line">
            {students.map((student) => {
              const rawAmount = amountFor(student.id);
              const value = Number.parseInt(rawAmount, 10);
              const valid = Number.isInteger(value) && value > 0;

              return (
                <div
                  key={student.id}
                  className="grid gap-3 px-4 py-3.5 transition hover:bg-app-soft/40 md:grid-cols-[1.7fr_1fr_0.7fr_90px_120px] md:items-center md:gap-4 md:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar first={student.first_name} last={student.last_name} size="sm" />
                    <div className="min-w-0">
                      <Link to={`/teacher/students/${student.id}`} className="block truncate text-[13px] font-semibold hover:text-brand">
                        {student.full_name}
                      </Link>
                      <p className="truncate text-[10px] text-muted">{student.email}</p>
                    </div>
                  </div>

                  <div>
                    {student.group ? (
                      <Badge variant="brand">{student.group.name}</Badge>
                    ) : (
                      <Badge variant="neutral">Guruhsiz</Badge>
                    )}
                  </div>

                  <div>
                    <CoinBalance amount={student.coin_balance} className="text-sm" />
                  </div>

                  <div>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={rawAmount}
                      onChange={(event) => setAmountFor(student.id, event.target.value)}
                      className="h-9 w-20 px-2 text-center text-sm font-bold"
                      aria-label={`${student.full_name} uchun coin miqdori`}
                    />
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-9 w-10 px-0 text-rose-400"
                      disabled={adjust.isPending || !valid || student.coin_balance < value}
                      onClick={() => adjust.mutate({ student, delta: -1, value })}
                      title={valid ? `${value} coin ayirish` : "Miqdorni kiriting"}
                    >
                      <Minus size={15} />
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 w-10 px-0"
                      disabled={adjust.isPending || !valid}
                      onClick={() => adjust.mutate({ student, delta: 1, value })}
                      title={valid ? `${value} coin berish` : "Miqdorni kiriting"}
                    >
                      <Plus size={15} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
