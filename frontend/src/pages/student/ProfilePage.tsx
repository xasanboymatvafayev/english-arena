import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookMarked, CalendarDays, Flame, KeyRound, LogOut, Mail, Moon, Sun, UserRound, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils";

type ProfileResponse = { student: any; saved_words_count: number; streak: { current: number; days: string[] } };

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });

  const { data } = useQuery<ProfileResponse>({
    queryKey: ["student-profile"],
    queryFn: () => api.get("/student/profile"),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post("/auth/change-password", { current_password: form.current_password, new_password: form.new_password }),
    onSuccess: () => {
      toast.success("Parol yangilandi");
      setForm({ current_password: "", new_password: "", confirm: "" });
    },
    onError: (error: Error) => toast.error("Parol o'zgartirilmadi", error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("Parollar mos kelmadi");
      return;
    }
    changePassword.mutate();
  };

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Akkaunt" title="Profil" subtitle="Shaxsiy ma'lumotlar, xavfsizlik va ko'rinish sozlamalari." />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card className="relative overflow-hidden p-6 text-center">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/15 blur-3xl" />
            <div className="relative flex flex-col items-center">
              <Avatar first={user?.first_name} last={user?.last_name} size="xl" ring />
              <h2 className="display mt-3 text-xl font-extrabold">{user?.full_name}</h2>
              <Badge variant="brand" className="mt-1.5">{user?.group?.name || "O'quvchi"}</Badge>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Mail size={12} /> {user?.email}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted"><UserRound size={12} /> @{user?.username}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted/70"><CalendarDays size={11} /> {formatDate(user?.created_at)} dan beri</p>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold">Statistika</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-app-soft p-3 text-center"><Flame size={15} className="mx-auto text-amber-400" /><p className="display mt-1 text-lg font-extrabold">{data?.streak.current || 0}</p><p className="text-[9px] text-muted">Streak</p></div>
              <div className="rounded-xl bg-app-soft p-3 text-center"><BookMarked size={15} className="mx-auto text-brand" /><p className="display mt-1 text-lg font-extrabold">{data?.saved_words_count || 0}</p><p className="text-[9px] text-muted">So'zlar</p></div>
              <div className="rounded-xl bg-app-soft p-3 text-center"><Users size={15} className="mx-auto text-emerald-400" /><p className="display mt-1 text-lg font-extrabold">{user?.group ? "1" : "0"}</p><p className="text-[9px] text-muted">Guruh</p></div>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold">Ko'rinish</p>
            <p className="mt-1 text-[11px] text-muted">Qulay mavzuni tanlang.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setTheme("light")} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold ${theme === "light" ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted"}`}><Sun size={14} /> Yorug'</button>
              <button onClick={() => setTheme("dark")} className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-[11px] font-semibold ${theme === "dark" ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted"}`}><Moon size={14} /> Tungi</button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2"><KeyRound size={16} className="text-brand" /><h3 className="text-sm font-bold">Parolni o'zgartirish</h3></div>
            <p className="mt-1 text-[11px] text-muted">Xavfsizlik uchun joriy parolni kiriting.</p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <Field label="Joriy parol" required>
                <Input type="password" autoComplete="current-password" value={form.current_password} onChange={(event) => setForm({ ...form, current_password: event.target.value })} required />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Yangi parol" required hint="Kamida 8 belgi">
                  <Input type="password" autoComplete="new-password" minLength={8} value={form.new_password} onChange={(event) => setForm({ ...form, new_password: event.target.value })} required />
                </Field>
                <Field label="Tasdiqlang" required>
                  <Input type="password" autoComplete="new-password" minLength={8} value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} required />
                </Field>
              </div>
              <Button type="submit" loading={changePassword.isPending} disabled={!form.current_password || form.new_password.length < 8}>Parolni yangilash</Button>
            </form>
          </Card>

          <Card className="border-rose-500/20 p-5">
            <h3 className="text-sm font-bold">Sessiyadan chiqish</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">Akkauntingizdan chiqsangiz, qayta kirish uchun login va parol kerak bo'ladi.</p>
            <Button variant="danger" className="mt-3" onClick={logout}><LogOut size={15} /> Chiqish</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
