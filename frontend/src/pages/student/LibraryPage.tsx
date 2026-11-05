import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Bookmark, ChevronRight, Heart, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { BookCover } from "@/components/common";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { cn, fileSize } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function StudentLibraryPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<Book | null>(null);

  const queryString = new URLSearchParams({
    ...(level ? { level } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(tab === "favorites" ? { favorites: "true" } : {}),
  }).toString();

  const { data: books = [], isLoading, isError, refetch } = useQuery<Book[]>({
    queryKey: ["student-books", queryString],
    queryFn: () => api.get(`/student/books${queryString ? `?${queryString}` : ""}`),
  });
  const { data: recent = [] } = useQuery<Book[]>({
    queryKey: ["student-books-recent"],
    queryFn: () => api.get("/student/books/recent"),
  });

  const favorite = useMutation({
    mutationFn: ({ book, add }: { book: Book; add: boolean }) =>
      add ? api.post(`/student/books/${book.id}/favorite`) : api.delete(`/student/books/${book.id}/favorite`),
    onSuccess: (_data, variables) => {
      toast.success(variables.add ? "Sevimlilarga qo'shildi" : "Sevimlilardan olib tashlandi");
      queryClient.invalidateQueries({ queryKey: ["student-books"] });
      queryClient.invalidateQueries({ queryKey: ["student-books-recent"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const reading = useMemo(() => books.filter((book) => book.progress && book.progress.progress_percent < 100), [books]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Elektron kutubxona"
        title="Kutubxona"
        subtitle="Darajangizga mos kitobni tanlang. PDF va EPUB formatlarini platformaning o'zida o'qing."
      />

      {recent.length > 0 && (
        <Card className="mb-5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><BookOpen size={16} className="text-brand" /><h2 className="text-sm font-bold">O'qishni davom ettirish</h2></div>
            <span className="text-[10px] text-muted">Oxirgi {recent.length} kitob</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((book) => (
              <Link key={book.id} to={`/student/library/${book.id}/read`} className="group flex w-64 shrink-0 gap-3 rounded-xl border border-line bg-app-soft/40 p-3 transition hover:border-brand/30">
                <div className="w-14 shrink-0"><BookCover book={book} showLevel={false} /></div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[11px] font-bold">{book.title}</p>
                  <p className="mt-0.5 text-[9px] text-muted">{book.author}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-app-raised">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${book.progress?.progress_percent || 0}%` }} />
                  </div>
                  <p className="mt-1 text-[9px] text-muted">{Math.round(book.progress?.progress_percent || 0)}% o'qilgan</p>
                </div>
                <ChevronRight size={14} className="mt-1 shrink-0 text-muted transition group-hover:text-brand" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ value: "all", label: "Barcha kitoblar", count: books.length }, { value: "favorites", label: "Sevimlilar" }]} />
        <div className="relative w-full lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kitob yoki muallif..." className="pl-10" />
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setLevel("")} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-semibold", !level ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted")}>Barcha darajalar</button>
        {LEVELS.map((item) => (
          <button key={item} onClick={() => setLevel(item)} className={cn("rounded-lg border px-3 py-1.5 text-[11px] font-semibold", level === item ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted")}>{item}</button>
        ))}
      </div>

      {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-80" />)}</div>}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && books.length === 0 && (
        <EmptyState icon={<BookOpen size={26} />} title="Kitob topilmadi" description={tab === "favorites" ? "Sevimlilar ro'yxati bo'sh. Yoqqan kitoblaringizni belgilang." : "Ushbu daraja uchun kitoblar hali qo'shilmagan."} />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {books.map((book) => (
          <div key={book.id} className="group">
            <div className="relative">
              <button onClick={() => setSelected(book)} className="block w-full text-left">
                <BookCover book={book} />
              </button>
              <button
                onClick={() => favorite.mutate({ book, add: !book.is_favorite })}
                className={cn("absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl bg-black/45 backdrop-blur transition hover:bg-black/60", book.is_favorite ? "text-rose-400" : "text-white/80")}
                aria-label="Sevimlilar"
              >
                <Heart size={16} fill={book.is_favorite ? "currentColor" : "none"} />
              </button>
              {book.progress && (
                <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/55 px-2 py-1.5 backdrop-blur">
                  <div className="h-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${book.progress.progress_percent}%` }} />
                  </div>
                  <p className="mt-1 text-[9px] font-semibold text-white/80">{Math.round(book.progress.progress_percent)}% o'qilgan</p>
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="line-clamp-1 text-[13px] font-bold">{book.title}</p>
              <p className="text-[10px] text-muted">{book.author}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted">
                <span className="rounded bg-app-soft px-1.5 py-0.5 font-bold">{book.level}</span>
                <span>{book.file_type.toUpperCase()}</span>
                <span>{fileSize(book.file_size)}</span>
              </div>
              <Link to={`/student/library/${book.id}/read`} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline">
                {book.progress ? "Davom ettirish" : "O'qishni boshlash"} <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title}
        subtitle={selected ? `${selected.author} · ${selected.level} daraja` : undefined}
        footer={
          selected ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Yopish</Button>
              <Button onClick={() => favorite.mutate({ book: selected, add: !selected.is_favorite })} variant="secondary">
                <Heart size={15} fill={selected.is_favorite ? "currentColor" : "none"} /> {selected.is_favorite ? "Sevimlilarda" : "Sevimlilarga"}
              </Button>
              <Link to={`/student/library/${selected.id}/read`}><Button><BookOpen size={15} /> {selected.progress ? "Davom ettirish" : "O'qish"}</Button></Link>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
            <BookCover book={selected} />
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand">{selected.level}</Badge>
                <Badge variant="neutral">{selected.file_type.toUpperCase()}</Badge>
                <Badge variant="neutral">{fileSize(selected.file_size)}</Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{selected.description || "Tavsif kiritilmagan."}</p>
              {selected.progress ? (
                <div className="mt-4 rounded-xl border border-line bg-app-soft/60 p-3">
                  <div className="flex items-center justify-between text-[10px]"><span className="text-muted">O'qish jarayoni</span><span className="font-bold">{Math.round(selected.progress.progress_percent)}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-raised"><div className="h-full rounded-full bg-brand" style={{ width: `${selected.progress.progress_percent}%` }} /></div>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand/[0.06] p-3 text-[11px] text-muted"><Sparkles size={14} className="text-brand" /> Birinchi sahifadan boshlaysiz.</div>
              )}
              <div className="mt-4 flex items-center gap-2 text-[10px] text-muted"><Bookmark size={12} /> O'qish joyingiz avtomatik saqlanadi.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
