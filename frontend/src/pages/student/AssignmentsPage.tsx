import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, ClipboardList, Download, FileText, Paperclip, Search } from "lucide-react";
import { absoluteApiUrl, api } from "@/lib/api";
import type { Assignment } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock, SkeletonRows } from "@/components/ui/States";
import { DueBadge } from "@/components/common";
import { fileSize, formatDate, relativeTime } from "@/lib/utils";

export default function StudentAssignmentsPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: assignments = [], isLoading, isError, refetch } = useQuery<Assignment[]>({
    queryKey: ["student-assignments"],
    queryFn: () => api.get("/student/assignments"),
  });

  const detail = useQuery<Assignment>({
    queryKey: ["student-assignment", selected],
    queryFn: () => api.get(`/student/assignments/${selected}`),
    enabled: Boolean(selected),
  });

  const filtered = useMemo(() => assignments.filter((assignment) => {
    const matchesSearch = !search.trim() || assignment.title.toLowerCase().includes(search.toLowerCase());
    const status = assignment.due_status;
    if (tab === "new") return matchesSearch && !assignment.viewed_at;
    if (tab === "overdue") return matchesSearch && status === "overdue";
    if (tab === "upcoming") return matchesSearch && status !== "overdue";
    return matchesSearch;
  }), [assignments, search, tab]);

  const counts = {
    all: assignments.length,
    new: assignments.filter((item) => !item.viewed_at).length,
    upcoming: assignments.filter((item) => item.due_status !== "overdue").length,
    overdue: assignments.filter((item) => item.due_status === "overdue").length,
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="O'quv jarayoni"
        title="Vazifalar"
        subtitle="Vazifani o'qing, faylni yuklab oling va darsda ustozga ko'rsating. Platformaga topshirish shart emas."
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "Barchasi", count: counts.all },
            { value: "new", label: "Yangi", count: counts.new },
            { value: "upcoming", label: "Muddatli", count: counts.upcoming },
            { value: "overdue", label: "O'tgan", count: counts.overdue },
          ]}
        />
        <div className="relative w-full lg:w-72">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Vazifa qidirish..." className="pl-10" />
        </div>
      </Card>

      {isLoading && <Card className="p-5"><SkeletonRows rows={5} /></Card>}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState icon={<ClipboardList size={26} />} title="Vazifa topilmadi" description="Ushbu bo'limda hozircha vazifa yo'q." />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((assignment) => (
          <Card key={assignment.id} className={`card-hover p-5 ${!assignment.viewed_at ? "border-brand/25" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${assignment.viewed_at ? "bg-app-soft text-muted" : "bg-brand/[0.12] text-brand"}`}>
                  <ClipboardList size={18} />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold leading-tight">{assignment.title}</h3>
                  <p className="mt-1 text-[10px] text-muted">{assignment.group_name} · {relativeTime(assignment.created_at)}</p>
                </div>
              </div>
              {!assignment.viewed_at ? <Badge variant="brand" dot>Yangi</Badge> : <Check size={15} className="mt-1 text-emerald-400" />}
            </div>
            <p className="mt-3 line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted">{assignment.description || "Tavsif kiritilmagan"}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <DueBadge assignment={assignment} />
              {assignment.attachment && <Badge variant="outline"><Paperclip size={10} /> PDF</Badge>}
              <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setSelected(assignment.id)}>Batafsil</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={detail.data?.title || "Vazifa"}
        subtitle={detail.data ? `${detail.data.group_name} · ${detail.data.teacher_name || ""}` : undefined}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Yopish</Button>}
      >
        {detail.isLoading ? <LoadingBlock /> : detail.data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <DueBadge assignment={detail.data} />
              <Badge variant="neutral"><CalendarClock size={10} /> {detail.data.due_at ? formatDate(detail.data.due_at, true) : "Muddat belgilanmagan"}</Badge>
              {detail.data.viewed_at && <Badge variant="success"><Check size={10} /> Ko'rilgan</Badge>}
            </div>
            <div className="rounded-2xl border border-line bg-app-soft/40 p-4">
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{detail.data.description || "Tavsif kiritilmagan"}</p>
            </div>
            {detail.data.attachment && (
              <a href={absoluteApiUrl(detail.data.attachment.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-line bg-app-surface p-3 transition hover:border-brand/30">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-400"><FileText size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{detail.data.attachment.name}</p>
                  <p className="text-[10px] text-muted">{fileSize(detail.data.attachment.size)} · PDF</p>
                </div>
                <Download size={16} className="text-muted" />
              </a>
            )}
            <div className="rounded-xl border border-brand/20 bg-brand/[0.05] p-3 text-[11px] leading-relaxed text-muted">
              <span className="font-semibold text-brand">Eslatma:</span> vazifa platformaga topshirilmaydi. Uni darsda ustozga ko'rsating.
            </div>
          </div>
        ) : <ErrorState message="Vazifa yuklanmadi" />}
      </Modal>
    </div>
  );
}
