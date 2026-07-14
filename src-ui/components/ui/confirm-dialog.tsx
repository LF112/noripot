import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Dialog } from './dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      className="w-[min(420px,calc(100%-32px))] shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-[520px]:w-full [&>header]:border-b-0 [&>header]:px-4 [&>header]:pt-4 [&>header]:pb-3 [&>header_h2]:text-base"
      description={description}
      icon={
        <span className="grid size-8 shrink-0 place-items-center rounded-[4px] border border-destructive/30 bg-destructive/6 text-destructive">
          <AlertTriangle size={16} />
        </span>
      }
      open={open}
      priority
      title={title}
      onClose={onCancel}
    >
      <footer className="flex justify-end gap-2 border-t border-border bg-surface-inset px-4 py-3">
        <Button
          autoFocus
          className="rounded-[4px]"
          onClick={onCancel}
          variant="secondary"
        >
          取消
        </Button>
        <Button className="rounded-[4px]" onClick={onConfirm} variant="danger">
          {confirmLabel}
        </Button>
      </footer>
    </Dialog>
  );
}
