import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Group, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { CoinBalance, StreakBadge } from "@/components/common";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });

  const params = new URLSearchParams();
  if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
  if (groupId) params.set("group_id", groupId);
  const queryString = params.toString();

  const { data: students = [], isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ["teacher-students", queryString],
    queryFn: () => api.get(`/teacher/students${queryString ? `?${queryString}` : ""}`),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Boshqaruv"
        title="O'quvchilar"
        subtitle="Barcha o'quvchilar, ularning guruhi, coin balansi va faolligi."
        actions={
          <Link to="/teacher/invitations?new=1">
            <Button><UserPlus size={16} /> O'quvchi taklif qilish</Button>
          </Link>
        }
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ism, familiya, email yoki login bo'yicha qidirish..."
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <option value="">Barcha guruhlar</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </Select>
        </div>
        <Badge variant="neutral" className="self-start sm:self-auto">{students.length} ta</Badge>
      </Card>

      {isLoading && <Card className="p-5"><SkeletonRows rows={6} /></Card>}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && students.length === 0 && (
        <EmptyState
          icon={<Users size={26} />}
          title="O'quvchi topilmadi"
          description={search || groupId ? "Qidiruv yoki filtrni o'zgartirib ko'ring." : "Birinchi o'quvchini taklif qiling."}
          action={<Link to="/teacher/invitations?new=1"><Button size="sm">Taklif yuborish</Button></Link>}
        />
      )}

      {students.length > 0 && (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[2.2fr_1.2fr_1fr_0.8fr_0.9fr_auto] gap-4 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted md:grid">
            <span>O'quvchi</span>
            <span>Guruh</span>
            <span>Coin</span>
            <span>Streak</span>
            <span>Oxirgi kirish</span>
            <span />
          </div>
          <div className="divide-y divide-line">
            {students.map((student) => (
              <div key={student.id} className="grid gap-3 px-5 py-4 transition hover:bg-app-soft/40 md:grid-cols-[2.2fr_1.2fr_1fr_0.8fr_0.9fr_auto] md:items-center md:gap-4">
                <div className="flex items-center gap-3">
                  <Avatar first={student.first_name} last={student.last_name} size="sm" />
                  <div className="min-w-0">
                    <Link to={`/teacher/students/${student.id}`} className="block truncate text-[13px] font-semibold hover:text-brand">
                      {student.full_name}
                    </Link>
                    <p className="truncate text-[10px] text-muted">{student.email}</p>
                  </div>
                </div>
                <div>
                  {student.group ? <Badge variant="brand">{student.group.name}</Badge> : <Badge variant="neutral">Guruhsiz</Badge>}
                </div>
                <div><CoinBalance amount={student.coin_balance} className="text-xs" /></div>
                <div><StreakBadge days={student.streak || 0} /></div>
                <p className="text-[11px] text-muted">{student.last_login_at ? formatDate(student.last_login_at, true) : "Kirmagan"}</p>
                <Link to={`/teacher/students/${student.id}`} className="justify-self-start rounded-lg p-2 text-muted transition hover:bg-app-soft hover:text-brand md:justify-self-end">
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
