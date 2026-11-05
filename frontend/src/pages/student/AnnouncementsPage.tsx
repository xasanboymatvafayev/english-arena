import { useQuery } from "@tanstack/react-query";
import { Bell, Pin } from "lucide-react";
import { api } from "@/lib/api";
import type { Announcement } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { formatDate, relativeTime } from "@/lib/utils";

export default function StudentAnnouncementsPage() {
  const { data: announcements = [], isLoading, isError, refetch } = useQuery<Announcement[]>({
    queryKey: ["student-announcements"],
    queryFn: () => api.get("/student/announcements"),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Yangiliklar" title="E'lonlar" subtitle="Ustoz yuborgan barcha e'lonlar va muhim xabarlar." />

      {isLoading && <LoadingBlock label="E'lonlar yuklanmoqda..." />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && announcements.length === 0 && (
        <EmptyState icon={<Bell size={26} />} title="E'lonlar yo'q" description="Ustoz e'lon joylashtirganda shu yerda ko'rinadi." />
      )}

      <div className="space-y-3">
        {announcements.map((item) => (
          <Card key={item.id} className={item.is_pinned ? "border-brand/25 p-5" : "p-5"}>
            <div className="flex items-start gap-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.is_pinned ? "bg-brand/[0.12] text-brand" : "bg-app-soft text-muted"}`}>
                {item.is_pinned ? <Pin size={17} /> : <Bell size={17} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-bold">{item.title}</h3>
                  {item.is_pinned && <Badge variant="brand">Muhim</Badge>}
                  {item.group_name && <Badge variant="neutral">{item.group_name}</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">{item.body}</p>
                <p className="mt-3 text-[10px] text-muted/70">{formatDate(item.created_at, true)} · {relativeTime(item.created_at)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
