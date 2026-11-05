import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo to="/" />
      <div className="mt-10 grid h-20 w-20 place-items-center rounded-3xl bg-brand/[0.12] text-brand"><Compass size={34} /></div>
      <p className="display mt-6 text-5xl font-extrabold">404</p>
      <h1 className="display mt-2 text-xl font-bold">Sahifa topilmadi</h1>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">Siz izlagan sahifa o'chirilgan yoki manzil noto'g'ri kiritilgan.</p>
      <Link to="/"><Button className="mt-6">Bosh sahifaga qaytish</Button></Link>
    </div>
  );
}
