import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Megaphone, Pin, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Announcement, Group } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, relativeTime } from "@/lib/utils";

export default function TeacherAnnouncementsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [form, setForm] = useState({ title: "", body: "", group_id: "", is_pinned: false });

  const { data: announcements = [], isLoading, isError, refetch } = useQuery<Announcement[]>({
    queryKey: ["teacher-announcements"],
    queryFn: () => api.get("/teacher/announcements"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });

  const create = useMutation({
    mutationFn: () => api.post("/teacher/announcements", {
      title: form.title,
      body: form.body,
      group_id: form.group_id || null,
      is_pinned: form.is_pinned,
    }),
    onSuccess: () => {
      toast.success("E'lon joylashtirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      setModalOpen(false);
      setForm({ title: "", body: "", group_id: "", is_pinned: false });
    },
    onError: (error: Error) => toast.error("E'lon joylashtirilmadi", error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/announcements/${id}`),
    onSuccess: () => {
      toast.success("E'lon o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-announcements"] });
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("O'chirib bo'lmadi", error.message),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="E'lonlar"
        subtitle="Barcha guruhlarga yoki tanlangan guruhga e'lon yuboring."
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Yangi e'lon</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {isLoading && <Card className="p-5"><SkeletonRows rows={4} /></Card>}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {!isLoading && !isError && announcements.length === 0 && (
            <EmptyState icon={<Megaphone size={26} />} title="E'lonlar yo'q" description="O'quvchilarga birinchi e'lonni joylashtiring." action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> E'lon yozish</Button>} />
          )}
          {announcements.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Megaphone size={18} /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-bold">{item.title}</h3>
                      {item.is_pinned && <Badge variant="brand"><Pin size={10} /> Muhim</Badge>}
                      <Badge variant="neutral"><Users size={10} /> {item.group_name || "Barcha guruhlar"}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">{item.body}</p>
                    <p className="mt-2 text-[10px] text-muted/70">{formatDate(item.created_at, true)} · {relativeTime(item.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => setDeleting(item)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-400" aria-label="O'chirish"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>

        <Card className="h-fit border-brand/20 bg-brand/[0.04] p-5">
          <div className="flex items-center gap-2 text-brand"><Bell size={16} /><p className="text-xs font-bold">E'lon qanday ishlaydi?</p></div>
          <ul className="mt-3 space-y-2.5 text-[11px] leading-relaxed text-muted">
            <li className="flex gap-2"><span className="text-brand">•</span> E'lon tanlangan guruh o'quvchilariga darhol ko'rinadi.</li>
            <li className="flex gap-2"><span className="text-brand">•</span> Guruh tanlanmasa, barcha o'quvchilarga yuboriladi.</li>
            <li className="flex gap-2"><span className="text-brand">•</span> "Muhim" belgisi e'lonni ro'yxat boshiga chiqaradi.</li>
            <li className="flex gap-2"><span className="text-brand">•</span> O'quvchi dashboardida ham ko'rsatiladi.</li>
          </ul>
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Yangi e'lon"
        subtitle="E'lon barcha yoki tanlangan guruh o'quvchilariga yuboriladi."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.title.trim() || !form.body.trim()}>Joylashtirish</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Sarlavha" required>
            <Input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan: Haftalik mock test" maxLength={200} />
          </Field>
          <Field label="Matn" required>
            <Textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="E'lon mazmunini batafsil yozing..." className="min-h-[140px]" />
          </Field>
          <Field label="Kimga yuborilsin?">
            <Select value={form.group_id} onChange={(event) => setForm({ ...form, group_id: event.target.value })}>
              <option value="">Barcha guruhlar</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </Select>
          </Field>
          <button type="button" onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })} className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-xs font-semibold transition ${form.is_pinned ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted"}`}>
            {form.is_pinned ? "Muhim e'lon" : "Oddiy e'lon"}
            <span className={`relative h-5 w-9 rounded-full transition ${form.is_pinned ? "bg-brand" : "bg-app-raised"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${form.is_pinned ? "left-4" : "left-0.5"}`} />
            </span>
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title="E'lon o'chirilsinmi?"
        description="E'lon o'quvchilar panelidan olib tashlanadi."
        confirmLabel="O'chirish"
        loading={remove.isPending}
      />
    </div>
  );
}
