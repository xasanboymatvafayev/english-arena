import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, Clock, Copy, Mail, MailPlus, RefreshCw, Send, ShieldX, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { Group, Invitation } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { InvitationStatus } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate, relativeTime } from "@/lib/utils";

export default function InvitationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState({ group_id: "", first_name: "", last_name: "", email: "" });
  const [result, setResult] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<Invitation | null>(null);

  const { data: invitations = [], isLoading, isError, refetch } = useQuery<Invitation[]>({
    queryKey: ["teacher-invitations"],
    queryFn: () => api.get("/teacher/invitations"),
  });
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["teacher-groups"],
    queryFn: () => api.get("/teacher/groups"),
  });

  useEffect(() => {
    if (params.get("new") === "1") {
      setModalOpen(true);
      setForm((current) => ({ ...current, group_id: current.group_id || groups[0]?.id || "" }));
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams, groups]);

  useEffect(() => {
    if (modalOpen && !form.group_id && groups.length) {
      setForm((current) => ({ ...current, group_id: groups[0].id }));
    }
  }, [modalOpen, groups, form.group_id]);

  const counts = useMemo(() => ({
    all: invitations.length,
    pending: invitations.filter((item) => item.status === "pending").length,
    accepted: invitations.filter((item) => item.status === "accepted").length,
    expired: invitations.filter((item) => item.status === "expired").length,
    revoked: invitations.filter((item) => item.status === "revoked").length,
  }), [invitations]);

  const filtered = useMemo(() => {
    if (tab === "all") return invitations;
    return invitations.filter((item) => item.status === tab);
  }, [invitations, tab]);

  const create = useMutation({
    mutationFn: () => api.post<Invitation>("/teacher/invitations", form),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      if (data.email_sent) toast.success("Taklif yuborildi", data.email);
      else toast.toast("info", "Taklif yaratildi", "Email yuborilmadi — havolani qo'lda ulashing.");
    },
    onError: (error: Error) => toast.error("Taklif yaratilmadi", error.message),
  });

  const resend = useMutation({
    mutationFn: (id: string) => api.post<Invitation>(`/teacher/invitations/${id}/resend`),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      if (data.email_sent) toast.success("Taklif qayta yuborildi");
      else toast.toast("info", "Yangi havola yaratildi", "Email yuborilmadi.");
    },
    onError: (error: Error) => toast.error("Qayta yuborilmadi", error.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/invitations/${id}`),
    onSuccess: () => {
      toast.success("Taklif bekor qilindi");
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      setRevoking(null);
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const copyLink = async () => {
    if (!result?.invite_link) return;
    await navigator.clipboard.writeText(result.invite_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setResult(null);
    setForm({ group_id: "", first_name: "", last_name: "", email: "" });
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Boshqaruv"
        title="Takliflar"
        subtitle="O'quvchilar faqat siz yuborgan bir martalik taklif havolasi orqali ro'yxatdan o'tadi."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <MailPlus size={16} /> Yangi taklif
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Jami takliflar", value: counts.all, icon: Send, tone: "text-brand bg-brand/[0.12]" },
          { label: "Kutilmoqda", value: counts.pending, icon: Clock, tone: "text-amber-400 bg-amber-500/[0.12]" },
          { label: "Qabul qilingan", value: counts.accepted, icon: CheckCircle2, tone: "text-emerald-400 bg-emerald-500/[0.12]" },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-4 p-4">
            <span className={cn("grid h-11 w-11 place-items-center rounded-xl", item.tone)}><item.icon size={19} /></span>
            <div>
              <p className="display text-xl font-extrabold">{item.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "Barchasi", count: counts.all },
              { value: "pending", label: "Kutilmoqda", count: counts.pending },
              { value: "accepted", label: "Qabul qilingan", count: counts.accepted },
              { value: "expired", label: "Muddati tugagan", count: counts.expired },
              { value: "revoked", label: "Bekor", count: counts.revoked },
            ]}
          />
          <p className="text-[11px] text-muted">Havola amal qilish muddati: 7 kun</p>
        </div>

        {isLoading && <div className="p-5"><SkeletonRows rows={5} /></div>}
        {isError && <div className="p-5"><ErrorState onRetry={() => refetch()} /></div>}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState
            className="m-5 border-0"
            icon={<MailPlus size={24} />}
            title="Taklif topilmadi"
            description="Yangi o'quvchini email orqali taklif qiling."
            action={<Button size="sm" onClick={() => setModalOpen(true)}>Taklif yuborish</Button>}
          />
        )}

        {filtered.length > 0 && (
          <>
            <div className="hidden grid-cols-[1.7fr_1.5fr_1.1fr_0.9fr_1.4fr_auto] gap-3 border-b border-line px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-muted lg:grid">
              <span>O'quvchi</span><span>Email</span><span>Guruh</span><span>Holat</span><span>Muddat</span><span />
            </div>
            <div className="divide-y divide-line">
              {filtered.map((invitation) => (
                <div key={invitation.id} className="grid gap-3 px-5 py-4 transition hover:bg-app-soft/40 lg:grid-cols-[1.7fr_1.5fr_1.1fr_0.9fr_1.4fr_auto] lg:items-center">
                  <div className="flex items-center gap-3">
                    <Avatar first={invitation.first_name} last={invitation.last_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{invitation.first_name} {invitation.last_name}</p>
                      <p className="text-[10px] text-muted">{relativeTime(invitation.created_at)} yuborilgan</p>
                    </div>
                  </div>
                  <p className="truncate text-[11px] text-muted">{invitation.email}</p>
                  <div><Badge variant="brand">{invitation.group_name}</Badge></div>
                  <div><InvitationStatus status={invitation.status} /></div>
                  <div>
                    <p className="text-[11px] text-muted">{formatDate(invitation.expires_at)}</p>
                    {invitation.email_error && <p className="mt-0.5 line-clamp-1 text-[9px] text-amber-400">{invitation.email_error}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {invitation.status !== "accepted" && (
                      <button
                        onClick={() => resend.mutate(invitation.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-app-soft hover:text-brand"
                        title="Qayta yuborish va yangi havola"
                        aria-label="Qayta yuborish"
                      >
                        <RefreshCw size={14} className={resend.isPending ? "animate-spin" : ""} />
                      </button>
                    )}
                    {invitation.status === "pending" && (
                      <button
                        onClick={() => setRevoking(invitation)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-400"
                        title="Bekor qilish"
                        aria-label="Bekor qilish"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card className="mt-4 border-brand/20 bg-brand/[0.04] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/[0.12] text-brand"><ShieldX size={18} /></span>
            <div>
              <p className="text-xs font-bold">Xavfsiz taklif tizimi</p>
              <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-muted">
                Har bir havola bir martalik, 7 kun amal qiladi. Ishlatilgan yoki muddati tugagan havola qayta ishlamaydi.
              </p>
            </div>
          </div>
          <Badge variant="outline"><Users size={11} /> Faqat taklif bilan</Badge>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={result ? "Taklif tayyor" : "Yangi o'quvchi taklif qilish"}
        subtitle={result ? "Email holati va taklif havolasi." : "O'quvchi ism, familiya va emailini kiriting."}
        footer={
          result ? (
            <>
              <Button variant="secondary" onClick={() => { setResult(null); setForm({ group_id: groups[0]?.id || "", first_name: "", last_name: "", email: "" }); }}>
                Yana taklif
              </Button>
              <Button onClick={closeModal}>Yopish</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={closeModal}>Bekor qilish</Button>
              <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!form.group_id || !form.first_name || !form.last_name || !form.email}>
                <Mail size={15} /> Taklif yuborish
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-4">
            <div className={cn("flex items-start gap-3 rounded-xl border p-4", result.email_sent ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-amber-500/25 bg-amber-500/[0.07]")}>
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", result.email_sent ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>
                {result.email_sent ? <CheckCircle2 size={17} /> : <Mail size={17} />}
              </div>
              <div>
                <p className="text-xs font-bold">{result.email_sent ? "Email muvaffaqiyatli yuborildi" : "Email yuborilmadi"}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  {result.email_sent ? `${result.email} manziliga taklif xati ketdi.` : result.email_error || "EmailJS sozlanmagan. Havolani o'zingiz yuboring."}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold">Bir martalik taklif havolasi</p>
              <div className="flex gap-2">
                <Input readOnly value={result.invite_link || ""} className="text-[11px]" onFocus={(e) => e.target.select()} />
                <Button variant="secondary" size="icon" onClick={copyLink} aria-label="Nusxalash">
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted">
                {formatDate(result.expires_at, true)} gacha amal qiladi · bir marta ishlatiladi
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Guruh" required>
              <Select value={form.group_id} onChange={(event) => setForm({ ...form, group_id: event.target.value })}>
                <option value="">Guruh tanlang</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ism" required>
                <Input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} placeholder="Madina" />
              </Field>
              <Field label="Familiya" required>
                <Input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} placeholder="Ismoilova" />
              </Field>
            </div>
            <Field label="Email" required hint="Taklif havolasi shu manzilga yuboriladi.">
              <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="madina@example.com" />
            </Field>
            <div className="rounded-xl border border-line bg-app-soft p-3 text-[11px] leading-relaxed text-muted">
              O'quvchi havolani ochgach, ism va email avtomatik to'ldiriladi. U faqat login va parol yaratadi.
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking.id)}
        title="Taklif bekor qilinsinmi?"
        description="Havola darhol kuchini yo'qotadi. O'quvchi ro'yxatdan o'ta olmaydi."
        confirmLabel="Bekor qilish"
        loading={revoke.isPending}
      />
    </div>
  );
}
