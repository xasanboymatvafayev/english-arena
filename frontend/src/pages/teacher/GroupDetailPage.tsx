import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Copy,
  Mail,
  Plus,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Assignment, GroupDetail, Invitation, User } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Field";
import { LoadingBlock, ErrorState, EmptyState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CoinBalance, DueBadge } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate } from "@/lib/utils";
import { groupColor } from "@/lib/groupColors";

export default function GroupDetailPage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [removing, setRemoving] = useState<User | null>(null);
  const [invite, setInvite] = useState({ first_name: "", last_name: "", email: "" });
  const [inviteResult, setInviteResult] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: group, isLoading, isError, refetch } = useQuery<GroupDetail>({
    queryKey: ["group", groupId],
    queryFn: () => api.get(`/teacher/groups/${groupId}`),
    enabled: Boolean(groupId),
  });

  const { data: allStudents = [] } = useQuery<User[]>({
    queryKey: ["teacher-students"],
    queryFn: () => api.get("/teacher/students"),
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ["teacher-assignments"],
    queryFn: () => api.get("/teacher/assignments"),
  });

  const candidates = useMemo(() => {
    const memberIds = new Set(group?.members.map((member) => member.id));
    return allStudents.filter((student) => !memberIds.has(student.id));
  }, [allStudents, group]);

  const addMember = useMutation({
    mutationFn: () => api.post(`/teacher/groups/${groupId}/members`, { student_id: selectedStudent }),
    onSuccess: () => {
      toast.success("O'quvchi guruhga qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
      setAddOpen(false);
      setSelectedStudent("");
    },
    onError: (error: Error) => toast.error("Qo'shib bo'lmadi", error.message),
  });

  const removeMember = useMutation({
    mutationFn: (studentId: string) => api.delete(`/teacher/groups/${groupId}/members/${studentId}`),
    onSuccess: () => {
      toast.success("O'quvchi guruhdan chiqarildi");
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      setRemoving(null);
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const sendInvite = useMutation({
    mutationFn: () => api.post<Invitation>("/teacher/invitations", { ...invite, group_id: groupId }),
    onSuccess: (data) => {
      setInviteResult(data);
      queryClient.invalidateQueries({ queryKey: ["teacher-invitations"] });
      if (data.email_sent) toast.success("Taklif emailga yuborildi");
      else toast.toast("info", "Taklif yaratildi", "Email yuborilmadi — havolani qo'lda ulashing.");
    },
    onError: (error: Error) => toast.error("Taklif yuborilmadi", error.message),
  });

  const groupAssignments = assignments.filter((item) => item.group_id === groupId);

  const copyLink = async () => {
    if (!inviteResult?.invite_link) return;
    await navigator.clipboard.writeText(inviteResult.invite_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <LoadingBlock label="Guruh yuklanmoqda..." />;
  if (isError || !group) return <ErrorState onRetry={() => refetch()} />;

  const color = groupColor(group.color);

  return (
    <div className="animate-fade-up">
      <button onClick={() => navigate("/teacher/groups")} className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} /> Guruhlarga qaytish
      </button>

      <Card className="relative overflow-hidden p-6">
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", color.gradient)} />
        <div className={cn("absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl", color.soft)} />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", color.soft, color.text)}>
              <UsersRound size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="display text-2xl font-extrabold">{group.name}</h1>
                <Badge variant="neutral">{group.member_count} o'quvchi</Badge>
              </div>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">{group.description || "Tavsif kiritilmagan"}</p>
              <p className="mt-2 text-[10px] text-muted/70">Yaratilgan: {formatDate(group.created_at)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setInviteResult(null); setInviteOpen(true); }}>
              <Mail size={15} /> Taklif yuborish
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus size={15} /> O'quvchi qo'shish
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h3 className="text-sm font-bold">O'quvchilar</h3>
              <p className="text-[11px] text-muted">Guruh a'zolari va coin balanslari</p>
            </div>
            <Badge variant="brand">{group.members.length}</Badge>
          </div>
          {group.members.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<UserPlus size={22} />}
              title="Guruh bo'sh"
              description="O'quvchi taklif qiling yoki mavjud o'quvchini qo'shing."
              action={<Button size="sm" onClick={() => setAddOpen(true)}>O'quvchi qo'shish</Button>}
            />
          ) : (
            <div className="divide-y divide-line">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-app-soft/50">
                  <Avatar first={member.first_name} last={member.last_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/teacher/students/${member.id}`} className="text-[13px] font-semibold hover:text-brand">
                      {member.full_name}
                    </Link>
                    <p className="truncate text-[10px] text-muted">{member.email}</p>
                  </div>
                  <CoinBalance amount={member.coin_balance} className="text-xs" />
                  <Link to={`/teacher/students/${member.id}`} className="hidden text-[10px] font-semibold text-brand hover:underline sm:block">
                    Profil
                  </Link>
                  <button
                    onClick={() => setRemoving(member)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label="Guruhdan chiqarish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold">Guruh statistikasi</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-app-soft p-3">
                <p className="label-xs">A'zolar</p>
                <p className="display mt-1 text-xl font-extrabold">{group.member_count}</p>
              </div>
              <div className="rounded-xl bg-app-soft p-3">
                <p className="label-xs">Vazifalar</p>
                <p className="display mt-1 text-xl font-extrabold">{group.assignment_count}</p>
              </div>
            </div>
            <Link to={`/teacher/assignments?new=1&group=${group.id}`} className="mt-4 block">
              <Button variant="secondary" className="w-full"><ClipboardList size={15} /> Guruhga vazifa</Button>
            </Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">So'nggi vazifalar</h3>
              <Link to="/teacher/assignments" className="text-[10px] font-semibold text-brand">Barchasi</Link>
            </div>
            {groupAssignments.length === 0 ? (
              <p className="mt-3 text-[11px] text-muted">Bu guruhga hali vazifa berilmagan.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {groupAssignments.slice(0, 4).map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-line bg-app-soft/50 p-3">
                    <p className="line-clamp-1 text-[11px] font-semibold">{assignment.title}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <DueBadge assignment={assignment} />
                      <span className="text-[10px] text-muted">{assignment.recipient_count} o'quvchi</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-brand/20 bg-brand/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-brand"><ArrowRight size={13} /> Keyingi qadam</div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              O'quvchilarga coin bering — haftalik reyting avtomatik shakllanadi.
            </p>
            <Link to="/teacher/coins"><Button size="sm" variant="secondary" className="mt-3 w-full">Coin berish</Button></Link>
          </Card>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="O'quvchi qo'shish"
        subtitle="Ustoz ro'yxatidagi mavjud o'quvchini guruhga o'tkazish."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => addMember.mutate()} loading={addMember.isPending} disabled={!selectedStudent}>Qo'shish</Button>
          </>
        }
      >
        {candidates.length === 0 ? (
          <EmptyState icon={<UserPlus size={20} />} title="Bo'sh o'quvchi yo'q" description="Barcha o'quvchilar guruhlarga biriktirilgan. Yangi o'quvchini taklif qiling." />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted">O'quvchi boshqa guruhda bo'lsa, shu guruhga o'tkaziladi.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {candidates.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    selectedStudent === student.id ? "border-brand/50 bg-brand/[0.08]" : "border-line bg-app-soft/50 hover:border-brand/30"
                  )}
                >
                  <Avatar first={student.first_name} last={student.last_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{student.full_name}</p>
                    <p className="truncate text-[10px] text-muted">{student.group?.name || "Guruhsiz"} · {student.email}</p>
                  </div>
                  {selectedStudent === student.id && <Check size={16} className="text-brand" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteResult(null); }}
        title={inviteResult ? "Taklif tayyor" : "Yangi o'quvchini taklif qilish"}
        subtitle={inviteResult ? "Havolani o'quvchiga yuboring." : `Taklif ${group.name} guruhiga yuboriladi.`}
        footer={
          inviteResult ? (
            <Button onClick={() => { setInviteOpen(false); setInviteResult(null); }}>Tushunarli</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setInviteOpen(false)}>Bekor qilish</Button>
              <Button onClick={() => sendInvite.mutate()} loading={sendInvite.isPending} disabled={!invite.first_name || !invite.last_name || !invite.email}>
                <Mail size={15} /> Taklif yuborish
              </Button>
            </>
          )
        }
      >
        {inviteResult ? (
          <div className="space-y-4">
            <div className={cn("flex items-start gap-3 rounded-xl border p-4", inviteResult.email_sent ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-amber-500/25 bg-amber-500/[0.07]")}>
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", inviteResult.email_sent ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>
                {inviteResult.email_sent ? <Check size={17} /> : <Mail size={17} />}
              </div>
              <div>
                <p className="text-xs font-bold">{inviteResult.email_sent ? "Email yuborildi" : "Email yuborilmadi"}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  {inviteResult.email_sent ? `${inviteResult.email} manziliga taklif xati yuborildi.` : inviteResult.email_error || "EmailJS sozlanmagan. Quyidagi havolani qo'lda yuboring."}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold">Taklif havolasi</p>
              <div className="flex gap-2">
                <Input readOnly value={inviteResult.invite_link || ""} className="text-[11px]" />
                <Button variant="secondary" size="icon" onClick={copyLink} aria-label="Nusxalash">
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted">Havola {formatDate(inviteResult.expires_at, true)} gacha amal qiladi va faqat bir marta ishlatiladi.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ism" required>
              <Input value={invite.first_name} onChange={(e) => setInvite({ ...invite, first_name: e.target.value })} placeholder="Madina" />
            </Field>
            <Field label="Familiya" required>
              <Input value={invite.last_name} onChange={(e) => setInvite({ ...invite, last_name: e.target.value })} placeholder="Ismoilova" />
            </Field>
            <Field label="Email" required className="sm:col-span-2" hint="Taklif havolasi shu emailga yuboriladi.">
              <Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="madina@example.com" />
            </Field>
            <div className="sm:col-span-2 rounded-xl border border-line bg-app-soft p-3 text-[11px] text-muted">
              O'quvchi havola orqali o'z logini va parolini yaratadi. Ism, familiya va email taklifdan avtomatik olinadi.
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && removeMember.mutate(removing.id)}
        title={`${removing?.full_name} chiqarilsinmi?`}
        description="O'quvchi guruhsiz qoladi, lekin ustoz ro'yxatida va coin tarixida saqlanadi."
        confirmLabel="Chiqarish"
        loading={removeMember.isPending}
      />
    </div>
  );
}
