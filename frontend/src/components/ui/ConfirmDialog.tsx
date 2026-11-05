import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Tasdiqlash",
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <div
          className={
            danger
              ? "grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-400"
              : "grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand"
          }
        >
          <AlertTriangle size={24} />
        </div>
        <h3 className="display mt-4 text-lg font-bold">{title}</h3>
        {description && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      </div>
    </Modal>
  );
}
