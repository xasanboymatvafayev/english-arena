import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { api, ApiError, tokenStore } from "@/lib/api";
import type { User } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";

type AuthResponse = { access_token: string; refresh_token: string; user: User };

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const toast = useToast();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<AuthResponse>("/auth/password-reset/confirm", { token, password });
      tokenStore.set(data.access_token, data.refresh_token);
      setUser(data.user);
      toast.success("Parol yangilandi", "Yangi parol bilan tizimga kirdingiz.");
      navigate(data.user.role === "teacher" ? "/teacher" : "/student", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Parolni yangilab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-8 flex justify-center"><Logo to="/" /></div>

        <Card className="p-7 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/[0.12] text-brand">
            <LockKeyhole size={22} />
          </div>
          <h1 className="display mt-5 text-2xl font-extrabold">Yangi parol</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Kamida 8 belgili yangi parol kiriting. Parolni yodda saqlang.
          </p>

          {!token ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-xs leading-relaxed text-rose-400">
                Tiklash havolasi topilmadi. Emailingizdagi havolani qayta oching yoki yangi havola so'rang.
              </div>
              <Link to="/forgot-password"><Button variant="secondary" className="w-full">Yangi havola so'rash</Button></Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Yangi parol" hint="Kamida 8 belgi">
                <div className="relative">
                  <ShieldCheck size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-10 pr-11"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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
                Parolni yangilash
              </Button>
            </form>
          )}

          <p className="mt-5 text-center text-[11px] text-muted">
            <Link to="/login" className="font-semibold text-brand hover:underline">Kirish sahifasiga qaytish</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
