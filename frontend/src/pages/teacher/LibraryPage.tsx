import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, BookPlus, Download, Eye, EyeOff, FileText, ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BookCover } from "@/components/common";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/contexts/ToastContext";
import { cn, fileSize } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const emptyForm = { title: "", author: "", description: "", level: "A2", is_published: true };

export default function TeacherLibraryPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");

  const { data: books = [], isLoading, isError, refetch } = useQuery<Book[]>({
    queryKey: ["teacher-books"],
    queryFn: () => api.get("/teacher/books"),
  });

  const filtered = useMemo(() => books.filter((book) => {
    const matchLevel = !level || book.level === level;
    const matchSearch = !search.trim() || book.title.toLowerCase().includes(search.toLowerCase()) || book.author.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  }), [books, level, search]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.patch(`/teacher/books/${editing.id}`, {
          title: form.title,
          author: form.author,
          description: form.description,
          level: form.level,
          is_published: form.is_published,
        });
        if (cover) {
          const data = new FormData();
          data.append("cover", cover);
          await api.upload(`/teacher/books/${editing.id}/cover`, data);
        }
        return;
      }
      if (!bookFile) throw new Error("Kitob fayli tanlanmagan");
      const data = new FormData();
      data.append("title", form.title);
      data.append("author", form.author);
      data.append("description", form.description);
      data.append("level", form.level);
      data.append("is_published", String(form.is_published));
      if (cover) data.append("cover", cover);
      data.append("file", bookFile);
      return api.upload<Book>("/teacher/books", data);
    },
    onSuccess: () => {
      toast.success(editing ? "Kitob yangilandi" : "Kitob qo'shildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-books"] });
      closeModal();
    },
    onError: (error: Error) => toast.error("Saqlanmadi", error.message),
  });

  const togglePublish = useMutation({
    mutationFn: (book: Book) => api.patch(`/teacher/books/${book.id}`, { is_published: !book.is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-books"] });
      toast.success("Ko'rinish holati yangilandi");
    },
    onError: (error: Error) => toast.error("Xatolik", error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/teacher/books/${id}`),
    onSuccess: () => {
      toast.success("Kitob o'chirildi");
      queryClient.invalidateQueries({ queryKey: ["teacher-books"] });
      setDeleting(null);
    },
    onError: (error: Error) => toast.error("O'chirib bo'lmadi", error.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setBookFile(null);
    setCover(null);
    setModalOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setForm({ title: book.title, author: book.author, description: book.description, level: book.level, is_published: book.is_published });
    setBookFile(null);
    setCover(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setBookFile(null);
    setCover(null);
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="Elektron kutubxona"
        subtitle="PDF va EPUB kitoblarni yuklang. O'quvchilar platformaning o'zida o'qiydi va joyini saqlab boradi."
        actions={<Button onClick={openCreate}><Plus size={16} /> Kitob qo'shish</Button>}
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kitob yoki muallif bo'yicha qidirish..." className="pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setLevel("")} className={cn("shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold", !level ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted")}>Barchasi</button>
          {LEVELS.map((item) => (
            <button key={item} onClick={() => setLevel(item)} className={cn("shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold", level === item ? "border-brand/40 bg-brand/10 text-brand" : "border-line bg-app-soft text-muted")}>{item}</button>
          ))}
        </div>
      </Card>

      {isLoading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-80" />)}</div>}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState icon={<BookOpen size={26} />} title="Kitoblar topilmadi" description="PDF yoki EPUB yuklab, kutubxonani boshlang." action={<Button size="sm" onClick={openCreate}><BookPlus size={14} /> Kitob qo'shish</Button>} />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((book) => (
          <div key={book.id} className="group">
            <div className="relative">
              <BookCover book={book} />
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-xl bg-black/55 p-1.5 opacity-0 backdrop-blur transition group-hover:opacity-100">
                <a href={book.file_url} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-white hover:bg-white/15" title="Faylni ochish"><Download size={14} /></a>
                <button onClick={() => openEdit(book)} className="grid h-8 w-8 place-items-center rounded-lg text-white hover:bg-white/15" title="Tahrirlash"><Pencil size={14} /></button>
                <button onClick={() => togglePublish.mutate(book)} className="grid h-8 w-8 place-items-center rounded-lg text-white hover:bg-white/15" title={book.is_published ? "Yashirish" : "Ko'rsatish"}>
                  {book.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => setDeleting(book)} className="grid h-8 w-8 place-items-center rounded-lg text-white hover:bg-rose-500/40" title="O'chirish"><Trash2 size={14} /></button>
              </div>
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                <Badge variant={book.is_published ? "success" : "neutral"}>{book.is_published ? "Ochiq" : "Yashirin"}</Badge>
              </div>
            </div>
            <div className="mt-3">
              <p className="line-clamp-1 text-[13px] font-bold">{book.title}</p>
              <p className="text-[10px] text-muted">{book.author}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[9px] uppercase tracking-wide text-muted">
                <span className="rounded bg-app-soft px-1.5 py-0.5 font-bold">{book.level}</span>
                <span>{book.file_type.toUpperCase()}</span>
                <span>{fileSize(book.file_size)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Kitobni tahrirlash" : "Yangi kitob qo'shish"}
        subtitle="PDF yoki EPUB fayl, muqova va daraja."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Bekor qilish</Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!form.title.trim() || !form.author.trim() || (!editing && !bookFile)}>
              {editing ? "Saqlash" : "Kutubxonaga qo'shish"}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Muqova</p>
            <label className="flex aspect-[2/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-app-soft/50 text-center text-muted transition hover:border-brand/40">
              {cover ? (
                <img src={URL.createObjectURL(cover)} alt="" className="h-full w-full object-cover" />
              ) : editing?.cover_url ? (
                <img src={editing.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <><ImagePlus size={22} /><span className="mt-2 px-2 text-[10px]">Rasm yuklash</span></>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setCover(event.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="space-y-4">
            <Field label="Kitob nomi" required>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="The Little Prince" maxLength={200} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Muallif" required>
                <Input value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} placeholder="Antoine de Saint-Exupéry" maxLength={150} />
              </Field>
              <Field label="Daraja" required>
                <Select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                  {LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Tavsif">
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Kitob haqida qisqacha ma'lumot" className="min-h-[90px]" />
            </Field>

            {!editing && (
              <Field label="Kitob fayli" required hint="PDF yoki EPUB · maksimal 40 MB">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-app-soft/40 p-4 transition hover:border-brand/40">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-app-surface text-brand"><FileText size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold">{bookFile ? bookFile.name : "PDF yoki EPUB tanlash"}</span>
                    <span className="block text-[10px] text-muted">{bookFile ? fileSize(bookFile.size) : "Faylni bu yerga bosing"}</span>
                  </span>
                  <input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" className="hidden" onChange={(event) => setBookFile(event.target.files?.[0] || null)} />
                </label>
              </Field>
            )}

            <button
              type="button"
              onClick={() => setForm({ ...form, is_published: !form.is_published })}
              className={cn("flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-xs font-semibold transition", form.is_published ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-line bg-app-soft text-muted")}
            >
              {form.is_published ? "O'quvchilarga ko'rinadi" : "Yashirin (faqat ustoz ko'radi)"}
              <span className={cn("relative h-5 w-9 rounded-full transition", form.is_published ? "bg-emerald-500" : "bg-app-raised")}>
                <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", form.is_published ? "left-4" : "left-0.5")} />
              </span>
            </button>
            <p className="text-[10px] leading-relaxed text-muted">Faqat foydalanish huquqiga ega bo'lgan, ochiq litsenziyali yoki o'zingiz yuklashga ruxsat olgan kitoblarni joylashtiring.</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title={`"${deleting?.title}" o'chirilsinmi?`}
        description="Kitob fayli, muqova va o'quvchilarning o'qish jarayoni o'chiriladi."
        confirmLabel="O'chirish"
        loading={remove.isPending}
      />
    </div>
  );
}
