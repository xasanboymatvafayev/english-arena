import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("arena_pwa_dismissed") === "1") return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS()) {
      const timer = window.setTimeout(() => setVisible(true), 2500);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("arena_pwa_dismissed", "1");
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setDeferred(null);
    } else {
      setIosHelp(true);
    }
  };

  if (!visible) {
    return (
      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title="Ilovani telefonga o‘rnatish" size="sm">
        <div className="space-y-3 text-xs leading-relaxed text-muted">
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Share size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">1.</b> Safari’da pastdagi <b>Share</b> tugmasini bosing.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">2.</b> <b>Add to Home Screen</b> ni tanlang.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Download size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">3.</b> Ekrandagi <b>English Arena</b> belgisini oching.</p>
          </div>
          <p className="text-[10px]">Shundan keyin ilova telefonda mustaqil oynada ochiladi va push bildirishnomalar ham ishlaydi.</p>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <div className="fixed inset-x-4 bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-brand/25 bg-app-surface/95 p-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold">English Arena’ni telefonga o‘rnating</p>
          <p className="text-[9px] text-muted">Tezroq ochiladi, push xabarlar ishlaydi.</p>
        </div>
        <Button size="sm" className="h-8 px-3 text-[10px]" onClick={install}>O‘rnatish</Button>
        <button onClick={dismiss} className="grid h-8 w-8 place-items-center rounded-lg text-muted" aria-label="Yopish"><X size={14} /></button>
      </div>

      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title="Ilovani telefonga o‘rnatish" size="sm">
        <div className="space-y-3 text-xs leading-relaxed text-muted">
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Share size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">1.</b> Safari’da pastdagi <b>Share</b> tugmasini bosing.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">2.</b> <b>Add to Home Screen</b> ni tanlang.</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-app-soft p-3">
            <Download size={18} className="mt-0.5 shrink-0 text-brand" />
            <p><b className="text-ink">3.</b> Ekrandagi <b>English Arena</b> belgisini oching.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
