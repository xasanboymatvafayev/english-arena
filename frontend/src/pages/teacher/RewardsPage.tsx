import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Coins, Gift, ImagePlus, Pencil, Plus, Trash2, X, XCircle } from "lucide-react";
import { absoluteApiUrl, api } from "@/lib/api";
import type { Reward, RewardRequest } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { RequestStatus } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, fileSize, formatDate } from "@/lib/utils";

export default function TeacherRewardsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("rewards");
  const [requestFilter, setRequestFilter] = useState("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState<Reward | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: "100", is_available: true });
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: rewards = [], isLoading, isError, refetch } = useQuery<Reward[]>({
    queryKey: ["teacher-rewards"],
    queryFn: () => api.get("/teacher/rewards"),
  });
  const { data: requests = [], isLoading: requestsLoading } = useQuery<RewardRequest[]>({
    queryKey: ["teacher-requests"],
    queryFn: () => api.get("/teacher/reward-requests"),
  });

  useEffect(() => {
    if (!image) { setPreview(null); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const pending = requests.filter((request) => request.status === "pending");
  const filteredRequests = requestFilter === "all" ? requests : requests.filter((request) => request.status === requestFilter);

  const create = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.patch(`/teacher/rewards/${editing.id}`, {
          title: form.title,
          description: form.description,
          price: Number(form.price),
          is_available: form.is_available,
        });
        if (image) {
          const data = new FormData();
          data.append("image", image);
          await api.upload(`/teacher/rewards/${editing.id}/image`, data);
        }
        return;
      }
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("price", form.price);
      data.append("is_available", String(form.is_available));
      if (image) data.append("image", image);
      return api.upload<Reward>("/teacher/rewards", data);
    },
    onSuccess: () => {
      toast.success(editing ? "Sovg'a yangilandi" : "Sovg'a yaratildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-rewards"] });
      closeModal();
    },
    onError: (error: Error) => toast.error("Saqlanmadi", error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/teacher/rewards/${id}`),
    onSuccess: (data: { message: string }) => {
      toast.success("Bajarildi", data.message);
      queryClient.invalidateQueries({ queryKey: ["teacher-rewards"] });
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("O'chirib bo'lmadi", error.message),
  });

  const resolveRequest = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.post(`/teacher/reward-requests/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === "approve" ? "So'rov tasdiqlandi" : "So'rov rad etildi, coin qaytarildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-requests"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
    },
    onError: (error: Error) => toast.error("Amal bajarilmadi", error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", price: "100", is_available: true });
    setImage(null);
    setModalOpen(true);
  };

  const openEdit = (reward: Reward) => {
    setEditing(reward);
    setForm({ title: reward.title, description: reward.description, price: String(reward.price), is_available: reward.is_available });
    setImage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ title: "", description: "", price: "100", is_available: true });
    setImage(null);
  };

  const toggleAvailability = useMutation({
    mutationFn: (reward: Reward) => api.patch(`/teacher/rewards/${reward.id}`, { is_available: !reward.is_available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-rewards"] });
      toast.success("Holat yangilandi");
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="Sovg'alar do'koni"
        subtitle="O'quvchilar coinlarini sovg'alarga almashtiradi. So'rov yuborilganda coin vaqtincha ushlab turiladi."
        actions={<Button onClick={openCreate}><Plus size={16} /> Sovg'a qo'shish</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/[0.12] text-brand"><Gift size={19} /></span>
          <div><p className="display text-xl font-extrabold">{rewards.length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Faol sovg'alar</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/[0.12] text-amber-400"><Coins size={19} /></span>
          <div><p className="display text-xl font-extrabold">{pending.length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Kutilayotgan so'rov</p></div>
        </Card>
        <Card className="flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/[0.12] text-emerald-400"><CheckCircle2 size={19} /></span>
          <div><p className="display text-xl font-extrabold">{requests.filter((r) => r.status === "approved").length}</p><p className="text-[10px] uppercase tracking-wider text-muted">Tasdiqlangan</p></div>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "rewards", label: "Sovg'alar", count: rewards.length },
            { value: "requests", label: "So'rovlar", count: pending.length },
          ]}
        />
        {tab === "requests" && (
          <div className="w-full sm:w-52">
            <Select value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)}>
              <option value="pending">Kutilayotgan</option>
              <option value="approved">Tasdiqlangan</option>
              <option value="rejected">Rad etilgan</option>
              <option value="all">Barchasi</option>
            </Select>
          </div>
        )}
      </div>

      {tab === "rewards" && (
        <>
          {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-72" />)}</div>}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {!isLoading && !isError && rewards.length === 0 && (
            <EmptyState icon={<Gift size={26} />} title="Sovg'alar yo'q" description="O'quvchilar uchun birinchi sovg'ani qo'shing." action={<Button size="sm" onClick={openCreate}><Plus size={14} /> Sovg'a qo'shish</Button>} />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id} className="group overflow-hidden card-hover">
                <div className="relative h-40 overflow-hidden bg-app-soft">
                  {reward.image_url ? (
                    <img src={absoluteApiUrl(reward.image_url)} alt={reward.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand/20 to-teal-500/10 text-brand"><Gift size={34} /></div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <Badge variant={reward.is_available ? "success" : "neutral"} dot>{reward.is_available ? "Mavjud" : "Mavjud emas"}</Badge>
                    {(reward.pending_count || 0) > 0 && <Badge variant="warning">{reward.pending_count} so'rov</Badge>}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold">{reward.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] leading-relaxed text-muted">{reward.description || "Tavsif yo'q"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gold-soft px-2.5 py-1 text-xs font-extrabold text-gold"><Coins size={13} /> {reward.price}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleAvailability.mutate(reward)} className="rounded-lg px-2 py-1 text-[10px] font-semibold text-muted hover:bg-app-soft hover:text-ink" title="Mavjudlikni almashtirish">
                        {reward.is_available ? "O'chirish" : "Yoqish"}
                      </button>
                      <button onClick={() => openEdit(reward)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-app-soft hover:text-ink" aria-label="Tahrirlash"><Pencil size={14} /></button>
                      <button onClick={() => setDeleting(reward)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-rose-500/10 hover:text-rose-400" aria-label="O'chirish"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "requests" && (
        <Card className="overflow-hidden">
          {requestsLoading && <div className="p-5"><SkeletonRows rows={5} /></div>}
          {!requestsLoading && filteredRequests.length === 0 && (
            <EmptyState className="m-5 border-0" icon={<Gift size={22} />} title="So'rovlar yo'q" description="Ushbu holatda sovg'a so'rovi mavjud emas." />
          )}
          <div className="divide-y divide-line">
            {filteredRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {request.reward?.image_url ? (
                    <img src={absoluteApiUrl(request.reward.image_url)} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-app-soft text-muted"><Gift size={18} /></span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">{request.reward?.title}</p>
                    <p className="truncate text-[10px] text-muted">{request.student?.full_name} · {request.student?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gold">{request.price} coin</p>
                    <p className="text-[9px] text-muted">{formatDate(request.requested_at, true)}</p>
                  </div>
                  <RequestStatus status={request.status} />
                  {request.status === "pending" ? (
                    <div className="flex gap-1">
                      <button onClick={() => resolveRequest.mutate({ id: request.id, action: "approve" })} className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Tasdiqlash"><Check size={15} /></button>
                      <button onClick={() => resolveRequest.mutate({ id: request.id, action: "reject" })} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Rad etish"><X size={15} /></button>
                    </div>
                  ) : (
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg", request.status === "approved" ? "text-emerald-400" : "text-rose-400")}>
                      {request.status === "approved" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Sovg'ani tahrirlash" : "Yangi sovg'a"}
        subtitle="Rasm, nom, tavsif va coin narxini kiriting."
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Bekor qilish</Button>
            <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.title.trim() || !Number(form.price)}>
              {editing ? "Saqlash" : "Sovg'a qo'shish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Sovg'a rasmi" hint="JPG, PNG yoki WEBP · maksimal 4 MB">
            <label className="relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-app-soft/50 transition hover:border-brand/40">
              {(preview || editing?.image_url) ? (
                <img src={preview || (editing?.image_url ? absoluteApiUrl(editing.image_url) : "")} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted"><ImagePlus size={26} className="mx-auto" /><p className="mt-2 text-[11px]">Rasm yuklash</p></div>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setImage(event.target.files?.[0] || null)} />
            </label>
            {image && <p className="mt-1.5 text-[10px] text-muted">{image.name} · {fileSize(image.size)}</p>}
          </Field>
          <Field label="Nomi" required>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan: Inglizcha kitob sovg'asi" maxLength={150} />
          </Field>
          <Field label="Tavsif">
            <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Sovg'a haqida qisqacha ma'lumot" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Narxi (coin)" required>
              <Input type="number" min={1} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </Field>
            <Field label="Mavjudligi">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_available: !form.is_available })}
                className={cn("flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-xs font-semibold transition", form.is_available ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-line bg-app-soft text-muted")}
              >
                {form.is_available ? "Mavjud" : "Mavjud emas"}
                <span className={cn("relative h-5 w-9 rounded-full transition", form.is_available ? "bg-emerald-500" : "bg-app-raised")}>
                  <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", form.is_available ? "left-4" : "left-0.5")} />
                </span>
              </button>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title={`${deleting?.title} o'chirilsinmi?`}
        description="Agar sovg'aga so'rovlar bo'lsa, u arxivlanadi va tarix saqlanadi."
        confirmLabel="O'chirish"
        loading={remove.isPending}
      />
    </div>
  );
}
