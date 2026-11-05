import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Coins, Gift, History, ShoppingBag, Sparkles, Wallet, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Reward, RewardRequest } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { CoinBalance, RequestStatus } from "@/components/common";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate } from "@/lib/utils";

type CoinsResponse = { balance: number };

export default function StudentRewardsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("shop");
  const [selected, setSelected] = useState<Reward | null>(null);

  const { data: rewards = [], isLoading, isError, refetch } = useQuery<Reward[]>({
    queryKey: ["student-rewards"],
    queryFn: () => api.get("/student/rewards"),
  });
  const { data: requests = [], isLoading: requestsLoading } = useQuery<RewardRequest[]>({
    queryKey: ["student-reward-requests"],
    queryFn: () => api.get("/student/rewards/requests/mine"),
  });
  const { data: coins } = useQuery<CoinsResponse>({
    queryKey: ["student-coins"],
    queryFn: () => api.get("/student/coins"),
  });

  const request = useMutation({
    mutationFn: (rewardId: string) => api.post(`/student/rewards/${rewardId}/request`),
    onSuccess: () => {
      toast.success("So'rov yuborildi", "Coin vaqtincha ushlab turildi. Ustoz tasdiqlashini kuting.");
      queryClient.invalidateQueries({ queryKey: ["student-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["student-reward-requests"] });
      queryClient.invalidateQueries({ queryKey: ["student-coins"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      setSelected(null);
    },
    onError: (error: Error) => toast.error("So'rov yuborilmadi", error.message),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Motivatsiya"
        title="Sovg'alar do'koni"
        subtitle="To'plangan coinlaringizni sovg'alarga almashtiring. So'rov ustoz tomonidan tasdiqlanadi."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-gold-soft px-4 py-2">
            <Wallet size={16} className="text-gold" />
            <span className="text-xs font-semibold text-muted">Balans:</span>
            <span className="display text-base font-extrabold text-gold">{coins?.balance ?? 0}</span>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ value: "shop", label: "Do'kon", count: rewards.length }, { value: "requests", label: "So'rovlarim", count: requests.length }]} />
        <Badge variant="outline"><Sparkles size={11} /> Coinlar ustoz beradi</Badge>
      </div>

      {tab === "shop" && (
        <>
          {isLoading && <LoadingBlock label="Do'kon yuklanmoqda..." />}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {!isLoading && !isError && rewards.length === 0 && (
            <EmptyState icon={<ShoppingBag size={26} />} title="Do'kon hozircha bo'sh" description="Ustoz sovg'a qo'shganda shu yerda paydo bo'ladi." />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id} className={cn("group overflow-hidden card-hover", !reward.is_available && "opacity-70")}>
                <div className="relative h-44 overflow-hidden bg-app-soft">
                  {reward.image_url ? (
                    <img src={reward.image_url} alt={reward.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand/20 to-teal-500/10 text-brand"><Gift size={36} /></div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    <Badge variant={reward.is_available ? "success" : "neutral"}>{reward.is_available ? "Mavjud" : "Mavjud emas"}</Badge>
                    {reward.has_pending_request && <Badge variant="warning">So'ralgan</Badge>}
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-xl bg-black/60 px-2.5 py-1.5 backdrop-blur">
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FFD27A]"><Coins size={13} /> {reward.price}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold">{reward.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[32px] text-[11px] leading-relaxed text-muted">{reward.description || "Tavsif yo'q"}</p>
                  <Button
                    className="mt-4 w-full"
                    variant={reward.has_pending_request ? "secondary" : "primary"}
                    disabled={!reward.can_request}
                    onClick={() => setSelected(reward)}
                  >
                    {reward.has_pending_request
                      ? "So'rov ko'rib chiqilmoqda"
                      : !reward.is_available
                        ? "Mavjud emas"
                        : (coins?.balance ?? 0) < reward.price
                          ? "Coin yetarli emas"
                          : "Sovg'ani so'rash"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="mt-4 border-brand/20 bg-brand/[0.04] p-4">
            <p className="text-[11px] leading-relaxed text-muted">
              <span className="font-semibold text-brand">Qanday ishlaydi?</span> Sovg'ani so'raganingizda coin balansingizdan vaqtincha yechiladi.
              Ustoz tasdiqlasa coin qaytarilmaydi, rad etsa avtomatik qaytariladi.
            </p>
          </Card>
        </>
      )}

      {tab === "requests" && (
        <Card className="overflow-hidden">
          {requestsLoading ? <LoadingBlock /> : requests.length === 0 ? (
            <EmptyState className="m-5 border-0" icon={<History size={24} />} title="So'rovlar yo'q" description="Sovg'a so'raganingizda bu yerda holati ko'rinadi." />
          ) : (
            <div className="divide-y divide-line">
              {requests.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {item.reward?.image_url ? (
                      <img src={item.reward.image_url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : <span className="grid h-11 w-11 place-items-center rounded-xl bg-app-soft text-muted"><Gift size={18} /></span>}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">{item.reward?.title}</p>
                      <p className="text-[10px] text-muted">{formatDate(item.requested_at, true)} · {item.price} coin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === "rejected" && item.refunded_at && <span className="text-[10px] font-medium text-emerald-400">Coin qaytarildi</span>}
                    <RequestStatus status={item.status} />
                    {item.status === "approved" ? <CheckCircle2 size={16} className="text-emerald-400" /> : item.status === "rejected" ? <XCircle size={16} className="text-rose-400" /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Sovg'ani so'rash"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Bekor qilish</Button>
            <Button onClick={() => selected && request.mutate(selected.id)} loading={request.isPending}>So'rov yuborish</Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line">
              {selected.image_url ? <img src={selected.image_url} alt="" className="h-40 w-full object-cover" /> : <div className="flex h-40 items-center justify-center bg-app-soft text-brand"><Gift size={34} /></div>}
              <div className="p-4">
                <p className="text-sm font-bold">{selected.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{selected.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gold-soft px-4 py-3">
              <span className="text-[11px] font-semibold text-muted">Narxi</span>
              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-gold"><Coins size={14} /> {selected.price} coin</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-app-soft px-4 py-3">
              <span className="text-[11px] font-semibold text-muted">So'nggi balans</span>
              <CoinBalance amount={(coins?.balance ?? 0) - selected.price} className="text-xs" />
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 text-[10px] leading-relaxed text-muted">
              So'rov yuborilganda <span className="font-semibold text-ink">{selected.price} coin</span> vaqtincha ushlab turiladi. Rad etilsa avtomatik qaytariladi.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
