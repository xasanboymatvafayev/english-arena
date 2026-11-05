import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, GraduationCap, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ApiError } from "@/lib/api";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ login: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate(user.role === "teacher" ? "/teacher" : "/student", { replace: true });
  }, [user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const logged = await login(form.login.trim(), form.password);
      toast.success("Xush kelibsiz!", logged.full_name);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || (logged.role === "teacher" ? "/teacher" : "/student"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <section className="relative hidden w-[52%] flex-col justify-between overflow-hidden border-r border-line bg-app-surface/40 p-12 lg:flex">
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />
        <div className="relative">
          <Logo to="/" />
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1.5 text-[11px] font-semibold text-brand">
            <Sparkles size={13} /> Premium ta'lim platformasi
          </span>
          <h1 className="display mt-6 text-5xl font-extrabold leading-[1.05]">
            Ingliz tilini
            <br />
            <span className="text-gradient">arena darajasida</span>
            <br />
            o'rganing.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            Ustoz boshqaradi, o'quvchi o'sadi. Guruhlar, coinlar, reyting, elektron
            kutubxona va shaxsiy lug'at — barchasi bitta joyda.
          </p>

          <div className="mt-9 grid grid-cols-3 gap-3">
            {[
              { value: "6", label: "Daraja" },
              { value: "24/7", label: "Kutubxona" },
              { value: "100%", label: "Progress" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-app-surface/70 p-4">
                <p className="display text-xl font-extrabold">{item.value}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid max-w-lg grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-app-surface/80 p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <GraduationCap size={16} className="text-brand" /> Ustoz paneli
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Guruhlar, takliflar, vazifalar va coin boshqaruvi.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-app-surface/80 p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Sparkles size={16} className="text-gold" /> O'quvchi maydoni
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Reyting, sovg'alar, kitoblar va shaxsiy lug'at.
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo to="/" />
          </div>
          <p className="label-xs">Xush kelibsiz</p>
          <h2 className="display mt-2 text-3xl font-extrabold">Akkauntingizga kiring</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Ustoz yoki o'quvchi akkaunti bilan davom eting.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email yoki login">
              <div className="relative">
                <UserRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  autoFocus
                  autoComplete="username"
                  placeholder="madina yoki email@example.com"
                  className="pl-10"
                  value={form.login}
                  onChange={(event) => setForm({ ...form, login: event.target.value })}
                  required
                />
              </div>
            </Field>

            <Field label="Parol">
              <div className="relative">
                <LockKeyhole size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-ink"
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-3 text-xs font-medium text-rose-400">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Kirish <ArrowRight size={17} />
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-line bg-app-soft/60 p-4 text-center">
            <p className="text-[11px] leading-relaxed text-muted">
              O'quvchi akkaunti faqat ustoz taklifi orqali yaratiladi.
              <br />
              Taklif havolasini olgan bo'lsangiz, uni oching.
            </p>
          </div>

          <p className="mt-8 text-center text-[11px] text-muted">
            Muammo bormi? Ustozingizga murojaat qiling.
          </p>
          <p className="mt-2 text-center text-[10px] text-muted/60">
            <Link to="/" className="hover:text-muted">English Arena</Link> · xavfsiz JWT autentifikatsiya
          </p>
        </div>
      </section>
    </div>
  );
}
