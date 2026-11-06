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
import { cn } from "@/lib/utils";

const AMOUNTS = [5, 10, 20, 50, 100];

export default function StudentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState(params.get("group") || "");
  const [amount, setAmount] = useState(10);

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

  const adjust = useMutation({
    mutationFn: ({ student, delta }: { student: User; delta: 1 | -1 }) =>
      api.post<{ balance: number }>("/teacher/coins", {
        student_id: student.id,
        amount: delta * amount,
        reason: delta > 0 ? "Ustoz coin berdi" : "Ustoz coin ayirdi",
      }),
    onSuccess: (result, variables) => {
      toast.success(
        variables.delta > 0 ? "Coin qo'shildi" : "Coin ayirildi",
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
        subtitle="Guruhni tanlang. Har bir o'quvchi yonidagi + yoki − bilan coin bering. Sabab yozish shart emas."
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Miqdor</span>
            <div className="flex gap-1">
              {AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition",
                    amount === value
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-line bg-app-soft text-muted hover:text-ink"
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[10px] text-muted">
            {selectedGroup ? `${selectedGroup.name} guruhi` : "Barcha guruhlar"} · {students.length} ta o'quvchi
          </p>
          <p className="text-[10px] font-semibold text-brand">
            <Coins size={12} className="mr-1 inline" />
            +{amount} / −{amount} coin
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
          <div className="hidden grid-cols-[1.8fr_1fr_0.8fr_220px] gap-4 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted md:grid">
            <span>O'quvchi</span>
            <span>Guruh</span>
            <span>Balans</span>
            <span className="text-right">Coin</span>
          </div>

          <div className="divide-y divide-line">
            {students.map((student) => (
              <div
                key={student.id}
                className="grid gap-3 px-4 py-3.5 transition hover:bg-app-soft/40 md:grid-cols-[1.8fr_1fr_0.8fr_220px] md:items-center md:gap-4 md:px-5"
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

                <div className="flex items-center gap-2 md:justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-16 px-0 text-rose-400"
                    disabled={adjust.isPending || student.coin_balance < amount}
                    onClick={() => adjust.mutate({ student, delta: -1 })}
                    title={`${amount} coin ayirish`}
                  >
                    <Minus size={15} />
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 w-16 px-0"
                    disabled={adjust.isPending}
                    onClick={() => adjust.mutate({ student, delta: 1 })}
                    title={`${amount} coin berish`}
                  >
                    <Plus size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
