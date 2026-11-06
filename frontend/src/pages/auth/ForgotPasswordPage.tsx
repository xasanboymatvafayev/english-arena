import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/password-reset/request", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "So'rov yuborilmadi. Qayta urinib ko'ring.");
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
            <Mail size={22} />
          </div>
          <h1 className="display mt-5 text-2xl font-extrabold">Parolni tiklash</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Akkauntingizga bog'langan email manzilini kiriting. Tiklash havolasini emailingizga yuboramiz.
          </p>

          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">Emailingizni tekshiring</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Agar <span className="font-semibold text-ink">{email}</span> ro'yxatdan o'tgan bo'lsa,
                      tiklash havolasi yuborildi. Havola 30 daqiqa amal qiladi.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-muted">
                Xat kelmasa, spam papkasini tekshiring yoki ustozingizdan email to'g'riligini so'rang.
              </p>
              <Link to="/login"><Button variant="secondary" className="w-full">Kirish sahifasiga qaytish</Button></Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field label="Email" required>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </Field>

              {error && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-3 text-xs font-medium text-rose-400">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Havolani yuborish
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-[11px] text-muted">
          <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            <ArrowLeft size={13} /> Kirish sahifasiga qaytish
          </Link>
        </p>
      </div>
    </div>
  );
}
