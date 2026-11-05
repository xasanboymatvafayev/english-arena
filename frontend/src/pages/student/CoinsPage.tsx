import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, Minus, Plus, TrendingUp, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { CoinTransaction } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { CoinAmount, CoinBalance } from "@/components/common";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { cn, formatDate } from "@/lib/utils";

type CoinsResponse = { balance: number; total_earned: number; transactions: CoinTransaction[] };

export default function StudentCoinsPage() {
  const [tab, setTab] = useState("all");

  const { data, isLoading, isError, refetch } = useQuery<CoinsResponse>({
    queryKey: ["student-coins"],
    queryFn: () => api.get("/student/coins"),
  });

  const transactions = data?.transactions || [];
  const filtered = useMemo(() => {
    if (tab === "earned") return transactions.filter((tx) => tx.amount > 0);
    if (tab === "spent") return transactions.filter((tx) => tx.amount < 0);
    return transactions;
  }, [transactions, tab]);

  const spent = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  if (isLoading) return <LoadingBlock label="Coinlaringiz yuklanmoqda..." />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Motivatsiya" title="Coinlarim" subtitle="Ustoz bergan har bir coin va uning sababi shu yerda saqlanadi." />

      <Card className="relative mb-5 overflow-hidden p-6">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label-xs text-amber-400/80">Joriy balans</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-soft text-gold"><Wallet size={24} /></span>
              <span className="display text-5xl font-extrabold">{data.balance}</span>
              <span className="mt-3 text-xs font-semibold text-muted">coin</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">Sovg'alar do'konida coinlaringizni ishlatishingiz mumkin.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-app-soft/60 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Jami olingan</p>
              <p className="display mt-1 text-xl font-extrabold text-emerald-400">+{data.total_earned}</p>
            </div>
            <div className="rounded-2xl border border-line bg-app-soft/60 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted">Sarflangan</p>
              <p className="display mt-1 text-xl font-extrabold text-rose-400">−{spent}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ value: "all", label: "Barchasi", count: transactions.length }, { value: "earned", label: "Olingan" }, { value: "spent", label: "Sarflangan" }]} />
        <Badge variant="neutral"><TrendingUp size={11} /> Haftalik reytingda hisoblanadi</Badge>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState className="m-5 border-0" icon={<Coins size={24} />} title="Amallar yo'q" description="Ustoz coin berganda shu yerda ko'rinadi." />
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-4">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tx.amount > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                  {tx.amount > 0 ? <Plus size={16} /> : <Minus size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold">{tx.reason}</p>
                  <p className="text-[10px] text-muted">
                    {formatDate(tx.created_at, true)}
                    {tx.actor_name ? ` · ${tx.actor_name}` : ""}
                    {" · "}
                    {tx.type === "reward_spend" ? "Sovg'a so'rovi" : tx.type === "reward_refund" ? "Coin qaytarildi" : tx.amount > 0 ? "Ustoz berdi" : "Ustoz ayirdi"}
                  </p>
                </div>
                <div className="text-right">
                  <CoinAmount amount={tx.amount} className="text-sm" />
                  <p className="text-[9px] text-muted">balans: {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
