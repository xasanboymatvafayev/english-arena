import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Group } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import { groupColors } from "@/lib/groupColors";

export function GroupModal({
  open,
  onClose,
  group,
}: {
  open: boolean;
  onClose: () => void;
  group?: Group | null;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("violet");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(group?.name || "");
    setDescription(group?.description || "");
    setColor(group?.color || "violet");
    setError(null);
  }, [open, group]);

  const mutation = useMutation({
    mutationFn: () =>
      group
        ? api.patch<Group>(`/teacher/groups/${group.id}`, { name, description, color })
        : api.post<Group>("/teacher/groups", { name, description, color }),
    onSuccess: () => {
      toast.success(group ? "Guruh yangilandi" : "Guruh yaratildi", name);
      queryClient.invalidateQueries({ queryKey: ["teacher-groups"] });
      if (group) queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.detail : "Xatolik yuz berdi"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? "Guruhni tahrirlash" : "Yangi guruh yaratish"}
      subtitle="Guruh nomi va rangi o'quvchilar uchun ko'rinadi."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {group ? "Saqlash" : "Guruh yaratish"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Guruh nomi" required error={error}>
          <Input
            autoFocus
            placeholder="Masalan: Pre-Intermediate Group"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
        </Field>
        <Field label="Tavsif" hint="Ixtiyoriy — daraja yoki dars vaqti haqida yozishingiz mumkin.">
          <Textarea
            placeholder="Masalan: B1 daraja, seshanba va payshanba 18:00"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
        </Field>
        <Field label="Guruh rangi">
          <div className="flex flex-wrap gap-2">
            {groupColors.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setColor(item.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition",
                  color === item.value ? "border-brand/50 bg-brand/10 text-ink" : "border-line bg-app-soft text-muted hover:text-ink"
                )}
              >
                <span className={cn("h-3 w-3 rounded-full", item.dot)} />
                {item.label}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
