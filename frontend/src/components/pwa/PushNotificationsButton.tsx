import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Loader2, Send, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { disablePush, enablePush, getPushStatus, pushSupported, sendTestPush } from "@/lib/push";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PushNotificationsButton({ className }: { className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ enabled: boolean; subscriptions: number } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();
  const iosNeedsInstall = isIOS() && !isStandalone();

  useEffect(() => {
    if (!open) return;
    setPermission("Notification" in window ? Notification.permission : "denied");
    getPushStatus().then(setStatus).catch(() => setStatus({ enabled: false, subscriptions: 0 }));
  }, [open]);

  const active = (status?.subscriptions || 0) > 0 && permission === "granted";

  const turnOn = async () => {
    setBusy(true);
    try {
      const result = await enablePush();
      if (!result.ok) toast.error("Bildirishnomalar yoqilmadi", result.message);
      else {
        toast.success("Bildirishnomalar yoqildi");
        setPermission(Notification.permission);
        setStatus(await getPushStatus());
      }
    } catch (error) {
      toast.error("Bildirishnomalar yoqilmadi", error instanceof Error ? error.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disablePush();
      toast.success("Bildirishnomalar o‘chirildi");
      setStatus(await getPushStatus());
    } catch (error) {
      toast.error("Xatolik", error instanceof Error ? error.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const sent = await sendTestPush();
      if (sent > 0) toast.success("Test bildirishnoma yuborildi");
      else toast.toast("info", "Yuborilmadi", "Qurilma obunasi topilmadi. Avval bildirishnomalarni yoqing.");
    } catch (error) {
      toast.error("Test yuborilmadi", error instanceof Error ? error.message : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "focus-ring relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-app-soft text-muted transition hover:text-ink",
          className
        )}
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        {active ? <BellRing size={16} className="text-brand" /> : <Bell size={16} />}
        {active && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Bildirishnomalar"
        subtitle="Yangi vazifa, e’lon, coin va sovg‘a xabarlari telefoningizga keladi."
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            <X size={15} /> Yopish
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-line bg-app-soft/60 p-3">
            <div className="flex items-center gap-2">
              <span className={cn("grid h-9 w-9 place-items-center rounded-xl", active ? "bg-emerald-500/10 text-emerald-400" : "bg-brand/[0.12] text-brand")}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : active ? <Check size={16} /> : <Bell size={16} />}
              </span>
              <div>
                <p className="text-xs font-bold">{active ? "Yoqilgan" : "O‘chirilgan"}</p>
                <p className="text-[10px] text-muted">{status?.subscriptions || 0} ta qurilma obunasi</p>
              </div>
            </div>
            <Badge variant={active ? "success" : "neutral"}>{active ? "Faol" : "Nofaol"}</Badge>
          </div>

          {!supported && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 text-[11px] leading-relaxed text-amber-400">
              Bu brauzer push bildirishnomalarni qo‘llab-quvvatlamaydi. Android Chrome yoki iPhone’da Safari’dan foydalaning.
            </div>
          )}

          {supported && iosNeedsInstall && (
            <div className="rounded-xl border border-brand/25 bg-brand/[0.06] p-3 text-[11px] leading-relaxed text-muted">
              <p className="font-semibold text-ink">iPhone uchun avval ilovani o‘rnating:</p>
              <p className="mt-1">Safari → <b>Share</b> → <b>Add to Home Screen</b>. Keyin shu oynani qayta oching.</p>
            </div>
          )}

          {status && !status.enabled && (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3 text-[11px] leading-relaxed text-rose-400">
              Serverda VAPID kalitlari yo‘q. Railway/Render environment’ga `VAPID_PUBLIC_KEY` va `VAPID_PRIVATE_KEY` qo‘shing.
            </div>
          )}

          {permission === "denied" && (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3 text-[11px] leading-relaxed text-rose-400">
              Brauzer ruxsati bloklangan. Sayt sozlamalaridan bildirishnomalarga ruxsat bering.
            </div>
          )}

          <div className="grid gap-2">
            {supported && !active && !iosNeedsInstall && (
              <Button onClick={turnOn} loading={busy} disabled={!status?.enabled}>
                <Bell size={15} /> Bildirishnomalarni yoqish
              </Button>
            )}
            {active && (
              <>
                <Button variant="secondary" onClick={test} loading={busy}>
                  <Send size={15} /> Test bildirishnoma yuborish
                </Button>
                <Button variant="ghost" onClick={turnOff} loading={busy}>
                  O‘chirish
                </Button>
              </>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-muted">
            Push faqat HTTPS’da ishlaydi. iOS’da 16.4+ va “Add to Home Screen” talab qilinadi.
          </p>
        </div>
      </Modal>
    </>
  );
}
