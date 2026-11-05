import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { api } from "@/lib/api";
import type { Group } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { groupColor } from "@/lib/groupColors";
import { cn, formatDate } from "@/lib/utils";
import { GroupModal } from "./GroupModal";

export default function GroupsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  const { data: groups = [], isLoading, isError, refetch } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/groups/${id}`),
    onSuccess: () => {
      toast.success("Guruh o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("O'chirib bo'lmadi", error.message),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Boshqaruv"
        title="Guruhlar"
        subtitle="Har bir guruh o'z o'quvchilari, vazifalari va reytingiga ega."
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={16} /> Yangi guruh
          </Button>
        }
      />

      {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} className="h-48" />)}</div>}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && groups.length === 0 && (
        <EmptyState
          icon={<UsersRound size={26} />}
          title="Hali guruh yo'q"
          description="Birinchi guruhni yarating, so'ng o'quvchilarni taklif qiling."
          action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> Guruh yaratish</Button>}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const color = groupColor(group.color);
          return (
            <Card key={group.id} className="group relative overflow-hidden p-5 card-hover">
              <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", color.gradient)} />
              <div className="flex items-start justify-between gap-3">
                <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", color.soft, color.text)}>
                  <UsersRound size={20} />
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => { setEditing(group); setModalOpen(true); }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-app-soft hover:text-ink"
                    aria-label="Tahrirlash"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleting(group)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label="O'chirish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <Link to={`/teacher/groups/${group.id}`} className="mt-4 block">
                <h3 className="display text-lg font-bold group-hover:text-brand">{group.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted">
                  {group.description || "Tavsif kiritilmagan"}
                </p>
              </Link>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-lg px-2 py-1 text-[10px] font-bold", color.soft, color.text)}>
                    {group.member_count} o'quvchi
                  </span>
                  <span className="text-[10px] text-muted">{formatDate(group.created_at)}</span>
                </div>
                <Link to={`/teacher/groups/${group.id}`} className="grid h-8 w-8 place-items-center rounded-lg bg-app-soft text-muted transition hover:bg-brand hover:text-white">
                  <ArrowRight size={15} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <GroupModal open={modalOpen} onClose={() => setModalOpen(false)} group={editing} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title={`${deleting?.name} o'chirilsinmi?`}
        description="Guruh o'chiriladi, o'quvchilar ustoz ro'yxatida qoladi. Bu amalni qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        loading={remove.isPending}
      />
    </div>
  );
}
