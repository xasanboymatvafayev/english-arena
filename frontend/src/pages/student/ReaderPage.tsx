import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ePub from "epubjs";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Highlighter,
  List,
  Loader2,
  Minus,
  Moon,
  Plus,
  Settings,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { absoluteApiUrl, api, fetchBlob } from "@/lib/api";
import type { Book, Bookmark as BookmarkType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { PageLoading } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type ReaderTheme = "light" | "sepia" | "dark";

const THEMES: Record<ReaderTheme, { bg: string; text: string; page: string; label: string }> = {
  light: { bg: "#eef1f8", text: "#111827", page: "#ffffff", label: "Yorug'" },
  sepia: { bg: "#e9dfcc", text: "#2b2419", page: "#f8f1e3", label: "Sepiya" },
  dark: { bg: "#0a0e18", text: "#e8ecf7", page: "#ffffff", label: "Tungi" },
};

export default function ReaderPage() {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panel, setPanel] = useState<"none" | "bookmarks" | "toc" | "settings">("none");
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [epubPercent, setEpubPercent] = useState(0);
  const [epubLocation, setEpubLocation] = useState<string | null>(null);
  const [toc, setToc] = useState<{ label: string; href: string; level: number }[]>([]);
  const [fontSize, setFontSize] = useState(100);
  const [containerWidth, setContainerWidth] = useState(760);

  const viewerRef = useRef<HTMLDivElement>(null);
  const epubViewRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const saveTimer = useRef<number | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    setData(null);
    setFileError(null);
    setNumPages(0);
    setPageNumber(1);
    setEpubPercent(0);
    setEpubLocation(null);
    setToc([]);
    initialized.current = false;
  }, [bookId]);

  const { data: book, isLoading } = useQuery<Book>({
    queryKey: ["student-book", bookId],
    queryFn: () => api.get(`/student/books/${bookId}`),
    enabled: Boolean(bookId),
  });

  const { data: bookmarks = [] } = useQuery<BookmarkType[]>({
    queryKey: ["book-bookmarks", bookId],
    queryFn: () => api.get(`/student/books/${bookId}/bookmarks`),
    enabled: Boolean(bookId),
  });

  useEffect(() => {
    if (!book || book.file_type !== "epub") return;
    let cancelled = false;
    setFileError(null);
    fetchBlob(book.file_url)
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => { if (!cancelled) setData(buffer); })
      .catch(() => { if (!cancelled) setFileError("Kitob faylini yuklab bo'lmadi. Qayta urinib ko'ring."); });
    return () => { cancelled = true; };
  }, [book?.id, book?.file_url]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(viewerRef.current);
    return () => observer.disconnect();
  }, [data, panel]);

  const pdfPercent = numPages ? Math.round((pageNumber / numPages) * 100) : 0;
  const percent = book?.file_type === "epub" ? Math.round(epubPercent) : pdfPercent;

  const persist = useCallback((payload: { current_page: number; total_pages?: number; progress_percent?: number; location?: string }) => {
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await api.put(`/student/books/${bookId}/progress`, payload);
        setSaveState("saved");
        queryClient.invalidateQueries({ queryKey: ["student-books"] });
        queryClient.invalidateQueries({ queryKey: ["student-books-recent"] });
      } catch {
        setSaveState("error");
      }
    }, 900);
  }, [bookId, queryClient]);

  // PDF progress saving
  useEffect(() => {
    if (!book || book.file_type !== "pdf" || !numPages || !initialized.current) return;
    persist({ current_page: pageNumber, total_pages: numPages, progress_percent: (pageNumber / numPages) * 100 });
  }, [pageNumber, numPages, book?.file_type, persist]);

  // EPUB initialisation
  useEffect(() => {
    if (!book || book.file_type !== "epub" || !data || !epubViewRef.current) return;
    const epubBook = ePub(data);
    const rendition = epubBook.renderTo(epubViewRef.current, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: "none",
    });
    renditionRef.current = rendition;

    const styles = THEMES[theme];
    rendition.themes.default({
      body: { background: `${styles.page} !important`, color: `${styles.text} !important`, "font-family": "Georgia, serif" },
      p: { "line-height": "1.8" },
    });
    rendition.themes.fontSize(`${fontSize}%`);

    const initial = book.progress?.location;
    rendition.display(initial || undefined);

    epubBook.loaded.navigation.then((navigation: any) => {
      const flatten = (items: any[], level = 0): { label: string; href: string; level: number }[] =>
        items.flatMap((item) => [
          { label: item.label.trim(), href: item.href, level },
          ...(item.subitems ? flatten(item.subitems, level + 1) : []),
        ]);
      setToc(flatten(navigation.toc || []));
    });

    rendition.on("relocated", (location: any) => {
      const start = location?.start;
      if (!start) return;
      const spineItems = epubBook.spine?.spineItems || [];
      const chapterIndex = spineItems.findIndex((item: any) => item.href === start.href);
      const percent = spineItems.length && chapterIndex >= 0
        ? ((chapterIndex + 1) / spineItems.length) * 100
        : (start.percentage || 0) * 100;
      setEpubLocation(start.cfi);
      setEpubPercent(percent);
      persist({
        current_page: 0,
        progress_percent: percent,
        location: start.cfi,
      });
    });


    return () => {
      rendition.destroy();
      epubBook.destroy();
      renditionRef.current = null;
    };
  }, [book?.id, book?.file_type, data]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  useEffect(() => {
    if (renditionRef.current) {
      const styles = THEMES[theme];
      renditionRef.current.themes.override("body", `background:${styles.page} !important;color:${styles.text} !important;`);
    }
  }, [theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Escape") setPanel("none");
      if (book?.file_type === "pdf") {
        if (event.key === "ArrowRight") setPageNumber((page) => Math.min(numPages || page, page + 1));
        if (event.key === "ArrowLeft") setPageNumber((page) => Math.max(1, page - 1));
      } else {
        if (event.key === "ArrowRight") renditionRef.current?.next();
        if (event.key === "ArrowLeft") renditionRef.current?.prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book?.file_type, numPages]);

  const addBookmark = useMutation({
    mutationFn: () => {
      const location = book?.file_type === "epub" ? epubLocation : `page:${pageNumber}`;
      if (!location) throw new Error("Joy aniqlanmadi");
      return api.post(`/student/books/${bookId}/bookmarks`, {
        page: book?.file_type === "pdf" ? pageNumber : null,
        location,
        label: bookmarkLabel.trim() || (book?.file_type === "pdf" ? `${pageNumber}-sahifa` : "Belgi"),
      });
    },
    onSuccess: () => {
      toast.success("Belgi qo'shildi");
      setBookmarkLabel("");
      queryClient.invalidateQueries({ queryKey: ["book-bookmarks", bookId] });
    },
    onError: (error: Error) => toast.error("Belgi qo'shilmadi", error.message),
  });

  const removeBookmark = useMutation({
    mutationFn: (id: string) => api.delete(`/student/books/${bookId}/bookmarks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book-bookmarks", bookId] });
      toast.success("Belgi o'chirildi");
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const jumpTo = (bookmark: BookmarkType) => {
    if (book?.file_type === "pdf" && bookmark.page) {
      setPageNumber(bookmark.page);
    } else if (book?.file_type === "epub") {
      renditionRef.current?.display(bookmark.location);
    }
    setPanel("none");
  };

  const pageWidth = useMemo(() => Math.round(Math.min(Math.max(containerWidth - 56, 260), 900) * zoom), [containerWidth, zoom]);

  if (isLoading) return <PageLoading />;
  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center"><p className="text-sm font-bold">Kitob topilmadi</p><Button className="mt-4" onClick={() => navigate("/student/library")}>Kutubxonaga qaytish</Button></div>
      </div>
    );
  }

  const styles = THEMES[theme];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app" style={{ backgroundColor: styles.bg }}>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line/60 bg-app-surface/90 px-3 backdrop-blur-xl sm:px-5">
        <button onClick={() => navigate("/student/library")} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-app-soft hover:text-ink" aria-label="Orqaga">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold sm:text-[13px]">{book.title}</p>
          <p className="truncate text-[10px] text-muted">{book.author} · {book.level} · {book.file_type.toUpperCase()}</p>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-app-soft">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="w-9 text-[10px] font-bold text-muted">{percent}%</span>
        </div>

        <div className="flex items-center gap-1">
          <HeaderButton active={panel === "bookmarks"} onClick={() => setPanel(panel === "bookmarks" ? "none" : "bookmarks")} label="Belgilar">
            <Bookmark size={16} />
          </HeaderButton>
          {book.file_type === "epub" && (
            <HeaderButton active={panel === "toc"} onClick={() => setPanel(panel === "toc" ? "none" : "toc")} label="Mundarija">
              <List size={16} />
            </HeaderButton>
          )}
          <HeaderButton active={panel === "settings"} onClick={() => setPanel(panel === "settings" ? "none" : "settings")} label="Sozlamalar">
            <Settings size={16} />
          </HeaderButton>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div ref={viewerRef} className="relative min-w-0 flex-1 overflow-auto">
          {!data && !fileError && book.file_type === "epub" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
              <Loader2 size={26} className="animate-spin text-brand" />
              <p className="text-xs font-medium">Kitob yuklanmoqda...</p>
            </div>
          )}
          {fileError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm font-bold">Faylni ochib bo'lmadi</p>
              <p className="max-w-sm text-xs text-muted">{fileError}</p>
              <Button size="sm" onClick={() => window.location.reload()}>Qayta urinish</Button>
            </div>
          )}

          {book.file_type === "pdf" && (
            <div className="flex min-h-full justify-center p-4 sm:p-7">
              <Document
                file={absoluteApiUrl(book.file_url)}
                onLoadSuccess={({ numPages: total }) => {
                  setNumPages(total);
                  const saved = book.progress?.current_page || 1;
                  const target = Math.min(total, Math.max(1, saved));
                  setPageNumber(target);
                  initialized.current = true;
                }}
                loading={<div className="flex h-64 items-center gap-2 text-xs text-muted"><Loader2 size={18} className="animate-spin" /> PDF ochilmoqda...</div>}
                error={<p className="text-xs text-rose-400">PDF faylni o'qib bo'lmadi. Sahifani yangilab qayta urinib ko'ring.</p>}
                onLoadError={(err) => console.error("PDF load error", err)}
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  className="overflow-hidden rounded-lg shadow-2xl"
                  renderTextLayer
                  renderAnnotationLayer={false}
                  loading={<div className="h-[60vh] w-[70vw] animate-pulse rounded-lg bg-white/70" />}
                />
              </Document>
            </div>
          )}

          {data && book.file_type === "epub" && (
            <div ref={epubViewRef} className="h-full w-full" style={{ background: styles.page }} />
          )}
        </div>

        {panel !== "none" && (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[360px] flex-col border-l border-line bg-app-surface shadow-2xl sm:relative sm:w-[330px] sm:shadow-none">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <p className="text-xs font-bold">
                {panel === "bookmarks" ? "Belgilar" : panel === "toc" ? "Mundarija" : "Sozlamalar"}
              </p>
              <button onClick={() => setPanel("none")} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-app-soft"><X size={15} /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {panel === "bookmarks" && (
                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold">Joriy joyga belgi qo'yish</p>
                    <div className="flex gap-2">
                      <Input value={bookmarkLabel} onChange={(event) => setBookmarkLabel(event.target.value)} placeholder="Belgi nomi (ixtiyoriy)" className="h-9 text-[11px]" />
                      <Button size="sm" onClick={() => addBookmark.mutate()} loading={addBookmark.isPending}><Plus size={14} /></Button>
                    </div>
                    <p className="mt-1 text-[9px] text-muted">{book.file_type === "pdf" ? `${pageNumber}-sahifa` : "Joriy o'qish joyi"}</p>
                  </div>
                  <div className="space-y-1.5">
                    {bookmarks.length === 0 ? (
                      <p className="py-6 text-center text-[11px] text-muted">Hali belgi qo'yilmagan.</p>
                    ) : bookmarks.map((bookmark) => (
                      <div key={bookmark.id} className="group flex items-start gap-2 rounded-xl border border-line bg-app-soft/50 p-2.5">
                        <button onClick={() => jumpTo(bookmark)} className="min-w-0 flex-1 text-left">
                          <p className="truncate text-[11px] font-semibold">{bookmark.label || bookmark.location}</p>
                          <p className="text-[9px] text-muted">{bookmark.page ? `${bookmark.page}-sahifa` : "EPUB joyi"}</p>
                        </button>
                        <button onClick={() => removeBookmark.mutate(bookmark.id)} className="rounded p-1 text-muted opacity-0 transition hover:text-rose-400 group-hover:opacity-100" aria-label="O'chirish"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {panel === "toc" && (
                <div className="space-y-0.5">
                  {toc.length === 0 ? <p className="py-6 text-center text-[11px] text-muted">Mundarija topilmadi.</p> : toc.map((item, index) => (
                    <button
                      key={`${item.href}-${index}`}
                      onClick={() => { renditionRef.current?.display(item.href); setPanel("none"); }}
                      className="block w-full rounded-lg px-2 py-2 text-left text-[11px] text-muted transition hover:bg-app-soft hover:text-ink"
                      style={{ paddingLeft: `${8 + item.level * 14}px` }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {panel === "settings" && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold">Mavzu</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(THEMES) as ReaderTheme[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => setTheme(key)}
                          className={cn("rounded-xl border p-2 text-[10px] font-semibold transition", theme === key ? "border-brand/50 ring-2 ring-brand/20" : "border-line")}
                          style={{ background: THEMES[key].page, color: THEMES[key].text }}
                        >
                          {key === "light" ? <Sun size={14} className="mx-auto mb-1" /> : key === "dark" ? <Moon size={14} className="mx-auto mb-1" /> : <Highlighter size={14} className="mx-auto mb-1" />}
                          {THEMES[key].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {book.file_type === "epub" && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold">Shrift o'lchami: {fontSize}%</p>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="icon" onClick={() => setFontSize((value) => Math.max(70, value - 10))}><Minus size={14} /></Button>
                        <div className="flex-1 text-center text-xs font-bold">{fontSize}%</div>
                        <Button variant="secondary" size="icon" onClick={() => setFontSize((value) => Math.min(180, value + 10))}><Plus size={14} /></Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[11px] font-semibold">Kitob fayli</p>
                    <a href={absoluteApiUrl(book.file_url)} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm" className="w-full"><Download size={14} /> Yuklab olish ({book.file_type.toUpperCase()})</Button>
                    </a>
                  </div>

                  <div className="rounded-xl border border-line bg-app-soft/50 p-3 text-[10px] leading-relaxed text-muted">
                    O'qish joyingiz avtomatik saqlanadi. Keyingi safar shu joydan davom etasiz.
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-line/60 bg-app-surface/90 px-3 backdrop-blur-xl sm:px-5">
        {book.file_type === "pdf" ? (
          <>
            <Button variant="secondary" size="icon" disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => Math.max(1, page - 1))} aria-label="Oldingi sahifa"><ChevronLeft size={17} /></Button>
            <div className="flex items-center gap-1.5 text-[11px]">
              <input
                type="number"
                value={pageNumber}
                min={1}
                max={numPages || 1}
                onChange={(event) => setPageNumber(Math.min(numPages || 1, Math.max(1, Number(event.target.value))))}
                className="h-8 w-12 rounded-lg border border-line bg-app-soft text-center text-[11px] font-bold outline-none"
              />
              <span className="text-muted">/ {numPages || "—"}</span>
            </div>
            <Button variant="secondary" size="icon" disabled={pageNumber >= numPages} onClick={() => setPageNumber((page) => Math.min(numPages, page + 1))} aria-label="Keyingi sahifa"><ChevronRight size={17} /></Button>

            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(0.6, value - 0.15))} aria-label="Kichraytirish"><Minus size={15} /></Button>
              <span className="w-10 text-center text-[10px] font-bold text-muted">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(2, value + 0.15))} aria-label="Kattalashtirish"><Plus size={15} /></Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="secondary" size="icon" onClick={() => renditionRef.current?.prev()} aria-label="Oldingi"><ChevronLeft size={17} /></Button>
            <div className="min-w-0 flex-1 text-center">
              <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-app-soft"><div className="h-full rounded-full bg-brand" style={{ width: `${epubPercent}%` }} /></div>
              <p className="mt-1 text-[9px] text-muted">{Math.round(epubPercent)}% o'qilgan</p>
            </div>
            <Button variant="secondary" size="icon" onClick={() => renditionRef.current?.next()} aria-label="Keyingi"><ChevronRight size={17} /></Button>
          </>
        )}
        <div className="hidden items-center gap-1.5 text-[10px] text-muted sm:flex">
          {saveState === "saving" ? <><Loader2 size={11} className="animate-spin" /> Saqlanmoqda</> : saveState === "saved" ? <><Check size={11} className="text-emerald-400" /> Saqlandi</> : saveState === "error" ? <span className="text-rose-400">Saqlanmadi</span> : <><BookOpen size={11} /> {percent}%</>}
        </div>
      </footer>
    </div>
  );
}

function HeaderButton({ children, active, onClick, label }: { children: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("grid h-9 w-9 place-items-center rounded-xl transition", active ? "bg-brand/15 text-brand" : "text-muted hover:bg-app-soft hover:text-ink")}
    >
      {children}
    </button>
  );
}
