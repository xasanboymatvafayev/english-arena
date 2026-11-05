import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, BookmarkPlus, Search, Volume2 } from "lucide-react";
import { api } from "@/lib/api";
import type { IrregularVerb } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function IrregularVerbsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "student";
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState("");

  const { data: verbs = [], isLoading, isError, refetch } = useQuery<IrregularVerb[]>({
    queryKey: ["irregular-verbs", search, letter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (letter) params.set("letter", letter);
      return api.get(`/dictionary/irregular-verbs${params.toString() ? `?${params}` : ""}`);
    },
  });

  const savedOnly = useMemo(() => verbs.filter((verb) => verb.is_saved), [verbs]);
  const list = tab === "saved" ? savedOnly : verbs;

  const toggleSave = useMutation({
    mutationFn: (verb: IrregularVerb) =>
      verb.is_saved
        ? api.delete(`/student/irregular-verbs/${verb.id}/save`)
        : api.post(`/student/irregular-verbs/${verb.id}/save`),
    onSuccess: (_data, verb) => {
      toast.success(verb.is_saved ? "Ro'yxatdan olib tashlandi" : "Shaxsiy ro'yxatga saqlandi");
      queryClient.invalidateQueries({ queryKey: ["irregular-verbs"] });
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'rganish"
        title="Irregular Verbs"
        subtitle="Noto'g'ri fe'llar: V1–V2–V3, o'zbekcha tarjima, talaffuz va misol gaplar."
        actions={isStudent ? <Badge variant="brand"><BookmarkCheck size={11} /> {savedOnly.length} ta saqlangan</Badge> : undefined}
      />

      <Card className="mb-4 space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fe'l yoki tarjima bo'yicha qidirish: go, ketmoq..." className="pl-10" />
          </div>
          {isStudent && (
            <Tabs value={tab} onChange={setTab} items={[{ value: "all", label: "Barchasi", count: verbs.length }, { value: "saved", label: "Saqlangan", count: savedOnly.length }]} />
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => setLetter("")} className={cn("rounded-md border px-2 py-1 text-[10px] font-bold", !letter ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted")}>Hammasi</button>
          {ALPHABET.map((item) => (
            <button key={item} onClick={() => setLetter(letter === item.toLowerCase() ? "" : item.toLowerCase())} className={cn("h-7 w-7 rounded-md border text-[10px] font-bold transition", letter === item.toLowerCase() ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted hover:text-ink")}>
              {item}
            </button>
          ))}
        </div>
      </Card>

      {isLoading && <LoadingBlock label="Fe'llar yuklanmoqda..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && list.length === 0 && (
        <EmptyState
          icon={<BookmarkPlus size={26} />}
          title={tab === "saved" ? "Saqlangan fe'llar yo'q" : "Fe'l topilmadi"}
          description={tab === "saved" ? "Kitob belgisini bosib fe'lni shaxsiy ro'yxatingizga qo'shing." : "Qidiruv yoki harf filtrini o'zgartirib ko'ring."}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((verb) => (
          <Card key={verb.id} className="card-hover p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="display text-xl font-extrabold">{verb.base}</h3>
                  <Badge variant="brand">{verb.translation_uz}</Badge>
                </div>
                <p className="mt-1 text-[10px] text-muted">Noto'g'ri fe'l · {verb.irregular_type || "irregular"}</p>
              </div>
              {isStudent && (
                <button
                  onClick={() => toggleSave.mutate(verb)}
                  className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition", verb.is_saved ? "border-brand/30 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted hover:text-brand")}
                  aria-label="Saqlash"
                >
                  {verb.is_saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "V1", value: verb.base, pron: verb.base_pron || verb.pronunciation },
                { label: "V2", value: verb.past_simple, pron: verb.past_pron },
                { label: "V3", value: verb.past_participle, pron: verb.participle_pron },
              ].map((form) => (
                <div key={form.label} className="rounded-xl border border-line bg-app-soft/50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-brand">{form.label}</p>
                  <p className="mt-0.5 truncate text-[12px] font-bold">{form.value}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <p className="min-w-0 flex-1 truncate text-[9px] text-muted">{form.pron || "—"}</p>
                    <button onClick={() => speak(form.value)} className="shrink-0 rounded p-0.5 text-muted hover:text-brand" aria-label="Talaffuz"><Volume2 size={11} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-app-soft/40 p-3">
              <p className="text-[11px] font-medium italic">“{verb.example}”</p>
              <p className="mt-1 text-[10px] text-muted">{verb.example_uz}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
        <span>Jami {list.length} ta fe'l</span>
        <span>Har bir shakl uchun talaffuzni eshitish mumkin</span>
      </div>
    </div>
  );
}
