import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, ClipboardList, FileText, Paperclip, Plus, Search, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Assignment, Group, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingBlock, SkeletonRows } from "@/components/ui/States";
import { DueBadge } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, fileSize, formatDate } from "@/lib/utils";

const emptyForm = { title: "", description: "", group_id: "", due_at: "" };

export default function TeacherAssignmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Assignment | null>(null);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");

  const { data: assignments = [], isLoading, isError, refetch } = useQuery<Assignment[]>({
    queryKey: ["teacher-assignments"],
    queryFn: () => api.get("/teacher/assignments"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });
  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["teacher-students"],
    queryFn: () => api.get("/teacher/students"),
  });

  useEffect(() => {
    if (params.get("new") === "1") {
      setModalOpen(true);
      setForm({ ...emptyForm, group_id: params.get("group") || "" });
      params.delete("new");
      params.delete("group");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const detailQuery = useQuery<Assignment>({
    queryKey: ["teacher-assignment", detailId],
    queryFn: () => api.get(`/teacher/assignments/${detailId}`),
    enabled: Boolean(detailId),
  });

  const create = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      if (form.group_id) data.append("group_id", form.group_id);
      if (selectedStudents.length) data.append("student_ids", selectedStudents.join(","));
      if (form.due_at) data.append("due_at", new Date(form.due_at).toISOString());
      if (file) data.append("file", file);
      return api.upload<Assignment>("/teacher/assignments", data);
    },
    onSuccess: () => {
      toast.success("Vazifa yuborildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      closeModal();
    },
    onError: (error: Error) => toast.error("Vazifa yaratilmadi", error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/assignments/${id}`),
    onSuccess: () => {
      toast.success("Vazifa o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("O'chirib bo'lmadi", error.message),
  });

  const filtered = useMemo(() => assignments.filter((assignment) => {
    const matchesSearch = !search.trim() || assignment.title.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = !groupFilter || assignment.group_id === groupFilter;
    return matchesSearch && matchesGroup;
  }), [assignments, search, groupFilter]);

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setSelectedStudents([]);
    setFile(null);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const groupMembers = form.group_id
    ? students.filter((student) => student.group?.id === form.group_id)
    : [];

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="Vazifalar"
        subtitle="Vazifani guruhga yoki tanlangan o'quvchilarga yuboring. O'quvchi uni platformada ko'radi va darsda ustozga ko'rsatadi."
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Yangi vazifa</Button>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Vazifa nomi bo'yicha qidirish..." className="pl-10" />
        </div>
        <div className="sm:w-60">
          <Select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="">Barcha guruhlar</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </Select>
        </div>
      </Card>

      {isLoading && <Card className="p-5"><SkeletonRows rows={5} /></Card>}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={26} />}
          title="Vazifa topilmadi"
          description="Yangi vazifa yarating yoki filtrlarni o'zgartiring."
          action={<Button size="sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Vazifa yaratish</Button>}
        />
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((assignment) => (
          <Card key={assignment.id} className="card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/[0.12] text-brand"><ClipboardList size={18} /></span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold leading-tight">{assignment.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                    <span>{assignment.group_name || "Tanlangan o'quvchilar"}</span>
                    <span>·</span>
                    <span>{assignment.recipient_count} o'quvchi</span>
                  </p>
                </div>
              </div>
              <DueBadge assignment={assignment} />
            </div>

            <p className="mt-3 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted">
              {assignment.description || "Tavsif kiritilmagan"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {assignment.attachment && (
                <a href={assignment.attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-app-soft px-2.5 py-1.5 text-[10px] font-semibold text-muted hover:text-ink">
                  <Paperclip size={11} /> {assignment.attachment.name} · {fileSize(assignment.attachment.size)}
                </a>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setDetailId(assignment.id)}>Batafsil</Button>
                <button onClick={() => setDeleting(assignment)} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-400" aria-label="O'chirish">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Yangi vazifa"
        subtitle="Vazifa matni, PDF fayl va muddatni belgilang."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Bekor qilish</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.title.trim() || (!form.group_id && selectedStudents.length === 0)}>
              Vazifani yuborish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Vazifa nomi" required>
            <Input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan: Unit 3 — Present Perfect" maxLength={200} />
          </Field>
          <Field label="Tushuntirish" hint="O'quvchi nima qilishi kerakligini aniq yozing.">
            <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Workbook 3-bob, 4-5 mashqlar. Darsda tekshiramiz." className="min-h-[130px]" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guruh" hint="Guruhdagi barcha o'quvchilarga yuboriladi.">
              <Select value={form.group_id} onChange={(event) => setForm({ ...form, group_id: event.target.value })}>
                <option value="">Guruhsiz — faqat tanlanganlar</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <Field label="Oxirgi muddat" hint="Ixtiyoriy">
              <Input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
            </Field>
          </div>

          {form.group_id && (
            <div className="rounded-xl border border-line bg-app-soft/60 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold"><Users size={12} /> Guruh a'zolari: {groupMembers.length} ta</p>
              <p className="mt-1 text-[10px] text-muted">Qo'shimcha o'quvchilarni pastdan tanlashingiz mumkin.</p>
            </div>
          )}

          <Field label="Qo'shimcha o'quvchilar" hint="Guruhdan tashqari alohida o'quvchilarga ham yuborish uchun tanlang.">
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line bg-app-soft/40 p-2">
              {students.map((student) => {
                const checked = selectedStudents.includes(student.id);
                const inGroup = form.group_id && student.group?.id === form.group_id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition", checked ? "bg-brand/[0.10]" : "hover:bg-app-soft")}
                  >
                    <span className={cn("grid h-4 w-4 place-items-center rounded border text-white", checked ? "border-brand bg-brand" : "border-line bg-app-surface")}>
                      {checked && <Check size={10} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{student.full_name}</span>
                    <span className="text-[10px] text-muted">{inGroup ? "guruhda" : student.group?.name || "guruhsiz"}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="PDF biriktirish" hint="Ixtiyoriy. Faqat PDF, maksimal 15 MB.">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-app-soft/40 p-4 transition hover:border-brand/40">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-app-surface text-brand"><FileText size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{file ? file.name : "PDF fayl tanlash"}</span>
                <span className="block text-[10px] text-muted">{file ? fileSize(file.size) : "Faylni bu yerga bosing"}</span>
              </span>
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detailQuery.data?.title || "Vazifa"}
        subtitle="O'quvchilar tomonidan ko'rilganligi"
        size="lg"
        footer={<Button variant="secondary" onClick={() => setDetailId(null)}>Yopish</Button>}
      >
        {detailQuery.isLoading ? <LoadingBlock /> : detailQuery.data ? (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{detailQuery.data.description || "Tavsif yo'q"}</p>
            <div className="flex flex-wrap gap-2">
              <DueBadge assignment={detailQuery.data} />
              <Badge variant="brand">{detailQuery.data.group_name || "Tanlangan o'quvchilar"}</Badge>
              {detailQuery.data.attachment && (
                <a href={detailQuery.data.attachment.url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline"><Paperclip size={11} /> {detailQuery.data.attachment.name}</Badge>
                </a>
              )}
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold">Qabul qiluvchilar ({detailQuery.data.recipients?.length || 0})</p>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(detailQuery.data.recipients || []).map((recipient) => (
                  <div key={recipient.id} className="flex items-center justify-between rounded-xl border border-line bg-app-soft/50 px-3 py-2">
                    <span className="text-[11px] font-medium">{recipient.full_name}</span>
                    {recipient.viewed_at ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400"><Check size={11} /> {formatDate(recipient.viewed_at, true)}</span>
                    ) : (
                      <span className="text-[10px] text-muted">Ko'rilmagan</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <ErrorState />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title="Vazifa o'chirilsinmi?"
        description="Vazifa barcha o'quvchilar panelidan olib tashlanadi."
        confirmLabel="O'chirish"
        loading={remove.isPending}
      />
    </div>
  );
}
