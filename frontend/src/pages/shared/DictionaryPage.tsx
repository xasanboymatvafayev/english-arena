import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookMarked,
  BookmarkPlus,
  Check,
  Clock,
  Headphones,
  Info,
  Loader2,
  Mic,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { DictionaryWord, SavedWord } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { cn, formatDate } from "@/lib/utils";

export default function DictionaryPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isStudent = user?.role === "student";
  const [tab, setTab] = useState("search");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [savedSearch, setSavedSearch] = useState("");
  const [editing, setEditing] = useState<SavedWord | null>(null);
  const [note, setNote] = useState("");

  const search = useQuery<DictionaryWord>({
    queryKey: ["dictionary", query],
    queryFn: () => api.get(`/dictionary/search?q=${encodeURIComponent(query)}`),
    enabled: Boolean(query),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const recent = useQuery<{ id: string; query: string; created_at: string }[]>({
    queryKey: ["dictionary-recent"],
    queryFn: () => api.get("/dictionary/recent"),
    enabled: isStudent,
  });

  const saved = useQuery<SavedWord[]>({
    queryKey: ["saved-words", savedSearch],
    queryFn: () => api.get(`/student/saved-words${savedSearch ? `?search=${encodeURIComponent(savedSearch)}` : ""}`),
    enabled: isStudent && tab === "saved",
  });

  const saveWord = useMutation({
    mutationFn: () => {
      if (!search.data) throw new Error("So'z topilmadi");
      return api.post("/student/saved-words", {
        word: search.data.word,
        translation: search.data.translation || "",
        phonetic: search.data.phonetic,
        audio_url: search.data.audio_url,
        part_of_speech: search.data.part_of_speech,
        definition: search.data.definition,
        example: search.data.example,
        example_translation: search.data.example_translation,
        synonyms: search.data.synonyms,
      });
    },
    onSuccess: () => {
      toast.success("So'z daftaringizga saqlandi");
      queryClient.invalidateQueries({ queryKey: ["saved-words"] });
      queryClient.invalidateQueries({ queryKey: ["dictionary", query] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: (error: Error) => toast.error("Saqlanmadi", error.message),
  });

  const updateWord = useMutation({
    mutationFn: () => api.patch(`/student/saved-words/${editing?.id}`, { note }),
    onSuccess: () => {
      toast.success("Izoh saqlandi");
      queryClient.invalidateQueries({ queryKey: ["saved-words"] });
      setEditing(null);
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const deleteWord = useMutation({
    mutationFn: (id: string) => api.delete(`/student/saved-words/${id}`),
    onSuccess: () => {
      toast.success("So'z o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["saved-words"] });
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = input.trim();
    if (value) setQuery(value.toLowerCase());
  };

  const searchRecent = (word: string) => {
    setInput(word);
    setQuery(word);
    setTab("search");
  };

  const speak = (text: string, audioUrl?: string | null) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakNative(text));
      return;
    }
    speakNative(text);
  };

  const speakNative = (text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.toast("info", "Audio mavjud emas", "Brauzeringiz talaffuzni qo'llab-quvvatlamaydi.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const result = search.data;
  const errorMessage = search.error instanceof ApiError ? search.error.detail : "So'z qidirishda xatolik";

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'rganish"
        title="Inglizcha–o'zbekcha lug'at"
        subtitle="Tarjima, IPA talaffuz, audio, izoh va misol gaplar — barchasi haqiqiy lug'at xizmatlaridan."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "search", label: "Qidiruv" },
            { value: "saved", label: "So'z daftarim", count: saved.data?.length },
          ]}
        />
        <Badge variant="outline"><Sparkles size={11} /> dictionaryapi + MyMemory</Badge>
      </div>

      {tab === "search" && (
        <>
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
            <form onSubmit={submit} className="relative flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  aria-label="Inglizcha so'z"
                  placeholder="Inglizcha so'z kiriting: beautiful, improve, challenge..."
                  className="h-12 pl-11 text-[15px]"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" disabled={!input.trim()} loading={search.isFetching}>
                Qidirish
              </Button>
            </form>
            {recent.data && recent.data.length > 0 && (
              <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted"><Clock size={11} /> Oxirgi:</span>
                {recent.data.slice(0, 8).map((item) => (
                  <button key={item.id} onClick={() => searchRecent(item.query)} className="rounded-lg border border-line bg-app-soft px-2 py-1 text-[10px] font-semibold text-muted transition hover:text-brand">
                    {item.query}
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="mt-4">
            {!query && (
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { word: "beautiful", translation: "chiroyli, go'zal", pos: "adjective" },
                  { word: "improve", translation: "yaxshilamoq", pos: "verb" },
                  { word: "challenge", translation: "qiyinchilik", pos: "noun" },
                ].map((item) => (
                  <button key={item.word} onClick={() => searchRecent(item.word)} className="card card-hover p-5 text-left">
                    <p className="display text-lg font-extrabold">{item.word}</p>
                    <p className="mt-1 text-xs text-muted">{item.translation}</p>
                    <Badge variant="neutral" className="mt-3">{item.pos}</Badge>
                  </button>
                ))}
              </div>
            )}

            {search.isFetching && <LoadingBlock label="Lug'atdan qidirilmoqda..." />}

            {search.isError && (
              <div className="card border-rose-500/20 bg-rose-500/[0.05] p-6 text-center">
                <p className="text-sm font-bold">So'z topilmadi</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">{errorMessage}</p>
                <p className="mt-2 text-[10px] text-muted">Imloni tekshirib qayta urinib ko'ring yoki boshqa so'z qidiring.</p>
              </div>
            )}

            {result && (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <Card className="overflow-hidden">
                  <div className="relative border-b border-line p-6">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-2xl" />
                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="display text-4xl font-extrabold">{result.word}</h2>
                          {result.part_of_speech && <Badge variant="brand">{result.part_of_speech}</Badge>}
                        </div>
                        {result.phonetic && <p className="mt-1.5 text-sm text-muted">{result.phonetic}</p>}
                        <button onClick={() => speak(result.word, result.audio_url)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line bg-app-soft px-3 py-2 text-[11px] font-semibold text-ink transition hover:border-brand/30">
                          <Volume2 size={15} className="text-brand" /> Talaffuzni eshitish
                          <span className="text-[9px] font-normal text-muted">({result.audio_url ? "audio" : "TTS"})</span>
                        </button>
                      </div>
                      {isStudent && (
                        <Button
                          variant={result.is_saved ? "secondary" : "primary"}
                          onClick={() => !result.is_saved && saveWord.mutate()}
                          loading={saveWord.isPending}
                          disabled={result.is_saved}
                        >
                          {result.is_saved ? <><Check size={15} /> Daftarda</> : <><BookmarkPlus size={15} /> Daftarga saqlash</>}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <div>
                      <p className="label-xs">O'zbekcha tarjimasi</p>
                      <p className="display mt-2 text-2xl font-extrabold text-brand">
                        {result.translation || "Tarjima vaqtincha mavjud emas"}
                      </p>
                    </div>

                    {result.definition && (
                      <div>
                        <p className="label-xs">Inglizcha izoh</p>
                        <p className="mt-1.5 text-sm leading-relaxed">{result.definition}</p>
                      </div>
                    )}

                    {result.example && (
                      <div className="rounded-2xl border border-line bg-app-soft/50 p-4">
                        <p className="label-xs">Misol gap</p>
                        <div className="mt-2 flex items-start gap-2">
                          <p className="flex-1 text-sm font-medium italic leading-relaxed">“{result.example}”</p>
                          <button onClick={() => speak(result.example!)} className="rounded-lg p-1.5 text-muted hover:text-brand" aria-label="Gapni eshitish"><Volume2 size={15} /></button>
                        </div>
                        {result.example_translation && <p className="mt-1.5 text-xs leading-relaxed text-muted">{result.example_translation}</p>}
                      </div>
                    )}

                    {result.synonyms?.length > 0 && (
                      <div>
                        <p className="label-xs">Sinonimlar</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {result.synonyms.map((synonym) => (
                            <button key={synonym} onClick={() => searchRecent(synonym)} className="rounded-lg border border-line bg-app-soft px-2.5 py-1 text-[11px] font-medium text-muted transition hover:text-brand">
                              {synonym}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.warnings?.length > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[11px] text-amber-400">
                        <Info size={14} className="mt-0.5 shrink-0" /> {result.warnings[0]}
                      </div>
                    )}

                    <p className="text-[9px] text-muted/70">Manba: {result.source}</p>
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="border-brand/20 bg-brand/[0.04] p-5">
                    <div className="flex items-center gap-2 text-brand"><Mic size={16} /><p className="text-xs font-bold">Talaffuz yordami</p></div>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      IPA belgilari xalqaro fonetik alifbo asosida. Audio mavjud bo'lmasa, brauzerning ingliz tili ovozi ishlatiladi.
                    </p>
                    <div className="mt-3 rounded-xl bg-app-surface p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted">IPA</p>
                      <p className="mt-1 text-lg font-semibold">{result.phonetic || "—"}</p>
                    </div>
                  </Card>

                  {isStudent && (
                    <Card className="p-5">
                      <p className="text-xs font-bold">So'z daftari</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">Saqlangan so'zlarga shaxsiy izoh yozib, qayta ko'rib chiqing.</p>
                      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setTab("saved")}>
                        <BookMarked size={14} /> Daftarimni ochish
                      </Button>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "saved" && (
        <>
          <Card className="mb-4 p-4">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={savedSearch} onChange={(event) => setSavedSearch(event.target.value)} placeholder="Saqlangan so'zlar orasidan qidirish..." className="pl-10" />
            </div>
          </Card>

          {saved.isLoading && <LoadingBlock label="So'z daftari yuklanmoqda..." />}
          {saved.isError && <ErrorState onRetry={() => saved.refetch()} />}
          {!saved.isLoading && !saved.isError && (saved.data?.length || 0) === 0 && (
            <EmptyState
              icon={<BookMarked size={26} />}
              title="Daftar hozircha bo'sh"
              description="Lug'atdan foydali so'zlarni saqlang — ular shu yerda to'planadi."
              action={<Button size="sm" onClick={() => setTab("search")}>Lug'atga o'tish</Button>}
            />
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {saved.data?.map((word) => (
              <Card key={word.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="display text-xl font-extrabold">{word.word}</p>
                      {word.part_of_speech && <Badge variant="neutral">{word.part_of_speech}</Badge>}
                    </div>
                    {word.phonetic && <p className="text-[11px] text-muted">{word.phonetic}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => speak(word.word, word.audio_url)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-app-soft hover:text-brand" aria-label="Talaffuz"><Headphones size={15} /></button>
                    <button onClick={() => { setEditing(word); setNote(word.note || ""); }} className="rounded-lg px-2 py-1 text-[10px] font-semibold text-muted hover:bg-app-soft hover:text-ink">Izoh</button>
                    <button onClick={() => deleteWord.mutate(word.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-rose-500/10 hover:text-rose-400" aria-label="O'chirish"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-brand">{word.translation || "—"}</p>
                {word.definition && <p className="mt-2 text-[11px] leading-relaxed text-muted">{word.definition}</p>}
                {word.example && (
                  <p className="mt-2 border-l-2 border-brand/30 pl-2 text-[11px] italic leading-relaxed">
                    {word.example} {word.example_translation && <span className="not-italic text-muted">— {word.example_translation}</span>}
                  </p>
                )}
                {word.note && <div className="mt-3 rounded-lg bg-amber-500/[0.07] p-2.5 text-[11px] text-amber-400">📝 {word.note}</div>}
                <p className="mt-3 text-[9px] text-muted/60">Saqlangan: {formatDate(word.created_at)}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`${editing?.word} — shaxsiy izoh`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Bekor qilish</Button>
            <Button onClick={() => updateWord.mutate()} loading={updateWord.isPending}>Saqlash</Button>
          </>
        }
      >
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Bu so'zni qanday eslab qolasiz? O'z misolingizni yozing..." className="min-h-[120px]" />
      </Modal>
    </div>
  );
}
