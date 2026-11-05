import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { tokenStore } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/layout/Logo";
import { PageLoading } from "@/components/ui/States";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { formatDate } from "@/lib/utils";

type InviteInfo = {
  first_name: string;
  last_name: string;
  email: string;
  group_name: string;
  teacher_name: string;
  status: string;
  expires_at: string;
};

type AuthResponse = { access_token: string; refresh_token: string; user: User };

export default function RegisterPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { setUser, user } = useAuth();
  const [form, setForm] = useState({ login: "", password: "", confirm_password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = useQuery<InviteInfo>({
    queryKey: ["invite", token],
    queryFn: () => api.get<InviteInfo>(`/auth/invitations/${token}`),
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (user) navigate(user.role === "teacher" ? "/teacher" : "/student", { replace: true });
  }, [user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.confirm_password) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>(`/auth/invitations/${token}/register`, form);
      tokenStore.set(data.access_token, data.refresh_token);
      setUser(data.user);
      navigate("/student", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <InviteError title="Taklif havolasi topilmadi" description="Havola to'liq emas yoki noto'g'ri. Ustozingizdan yangi taklif so'rang." />;
  }
  if (invite.isLoading) return <PageLoading />;
  if (invite.isError) {
    const message = invite.error instanceof ApiError ? invite.error.detail : "Taklifni tekshirib bo'lmadi";
    return <InviteError title="Taklif yaroqsiz" description={message} />;
  }

  const info = invite.data!;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-app-surface/80 shadow-card backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#171C36] via-[#12142A] to-[#0B0E1D] p-10 text-white lg:flex">
          <div className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-brand/30 blur-[90px]" />
          <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-teal-400/20 blur-[80px]" />
          <Logo to="/" />
          <div className="relative">
            <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
              <UsersRound size={26} />
            </div>
            <h1 className="display text-4xl font-extrabold leading-tight">
              Guruhga
              <br />
              xush kelibsiz!
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              Sizni <span className="font-semibold text-white">{info.teacher_name}</span> ustoz{" "}
              <span className="font-semibold text-white">{info.group_name}</span> guruhiga taklif qildi.
            </p>
            <div className="mt-8 space-y-3">
              {["Ism va email taklifdan olinadi", "Login va parolni o'zingiz tanlaysiz", "Darhol guruhga qo'shilasiz"].map((text) => (
                <div key={text} className="flex items-center gap-2.5 text-xs text-white/75">
                  <CheckCircle2 size={15} className="text-emerald-400" /> {text}
                </div>
              ))}
            </div>
          </div>
          <p className="relative flex items-center gap-2 text-[10px] text-white/40">
            <ShieldCheck size={13} /> Bir martalik, muddati cheklangan taklif
          </p>
        </div>

        <div className="p-7 sm:p-10">
          <div className="mb-7 lg:hidden"><Logo to="/" /></div>
          <p className="label-xs">Taklifni qabul qilish</p>
          <h2 className="display mt-2 text-2xl font-extrabold">Akkaunt yarating</h2>
          <p className="mt-1.5 text-xs text-muted">
            Taklif muddati: <span className="font-semibold text-ink">{formatDate(info.expires_at, true)}</span>
          </p>

          <div className="mt-6 grid gap-3 rounded-2xl border border-line bg-app-soft/60 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Ism</p>
              <p className="mt-0.5 text-sm font-semibold">{info.first_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Familiya</p>
              <p className="mt-0.5 text-sm font-semibold">{info.last_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Email</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{info.email}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted">Guruh</p>
              <p className="mt-0.5 text-sm font-semibold text-brand">{info.group_name}</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Login" hint="Faqat harflar, raqamlar, nuqta va pastki chiziq. Keyinchalik shu login bilan kirasiz.">
              <div className="relative">
                <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-10"
                  placeholder="masalan: madina"
                  autoComplete="username"
                  value={form.login}
                  onChange={(event) => setForm({ ...form, login: event.target.value.toLowerCase() })}
                  pattern="[a-zA-Z0-9_.]+"
                  minLength={3}
                  maxLength={50}
                  required
                />
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Parol" hint="Kamida 8 belgi">
                <div className="relative">
                  <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    minLength={8}
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                    aria-label="Parolni ko'rsatish"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Parolni tasdiqlang">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={8}
                  value={form.confirm_password}
                  onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
                  required
                />
              </Field>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-3 text-xs font-medium text-rose-400">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Ro'yxatdan o'tish <ArrowRight size={17} />
            </Button>
          </form>

          <p className="mt-4 text-center text-[10px] leading-relaxed text-muted">
            Ro'yxatdan o'tish orqali siz platformadan o'quv maqsadida foydalanishga rozilik bildirasiz.
          </p>
          <p className="mt-3 text-center text-[11px] text-muted">
            Akkauntingiz bormi? <Link to="/login" className="font-semibold text-brand">Kirish</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function InviteError({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-line bg-app-surface p-8 text-center shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-400">
          <ShieldCheck size={28} />
        </div>
        <h1 className="display mt-5 text-xl font-extrabold">{title}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
        <Link to="/login">
          <Button className="mt-6 w-full">Kirish sahifasiga qaytish</Button>
        </Link>
        <p className="mt-4 text-[11px] text-muted">Yangi taklif uchun ustozingizga murojaat qiling.</p>
      </div>
    </div>
  );
}
