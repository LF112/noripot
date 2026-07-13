import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}

export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-[5px] data-[state=open]:animate-[fade-in_150ms_ease-out] motion-reduce:animate-none"
          data-slot="dialog-overlay"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-51 max-h-[min(760px,calc(100vh-40px))] w-[min(520px,100%)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-control bg-card data-[state=open]:animate-[dialog-in_180ms_cubic-bezier(0.16,1,0.3,1)] max-[520px]:inset-x-0 max-[520px]:top-auto max-[520px]:bottom-0 max-[520px]:max-h-[calc(100vh-28px)] max-[520px]:w-full max-[520px]:translate-x-0 max-[520px]:translate-y-0 max-[520px]:rounded-t-lg max-[520px]:rounded-b-none max-[520px]:border-x-0 max-[520px]:border-b-0 max-[520px]:data-[state=open]:animate-[fade-in_150ms_ease-out] motion-reduce:animate-none',
            className,
          )}
          data-slot="dialog-content"
        >
          <header className="flex items-start justify-between gap-5 border-b border-border px-5 py-[18px] [&_h2]:m-0 [&_h2]:text-[17px] [&_h2]:font-normal [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:leading-[1.4] [&_p]:text-muted-foreground">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description>
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button aria-label="关闭" size="icon" variant="ghost">
                <X size={17} />
              </Button>
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Sheet({
  open,
  title,
  description,
  children,
  onClose,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-[5px] data-[state=open]:animate-[fade-in_150ms_ease-out] motion-reduce:animate-none"
          data-slot="sheet-overlay"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-56 flex w-[min(720px,92vw)] flex-col border-l border-control bg-card data-[state=open]:animate-[drawer-enter_180ms_cubic-bezier(0.16,1,0.3,1)] max-[520px]:w-full max-[520px]:border-l-0 motion-reduce:animate-none',
            className,
          )}
          data-slot="sheet-content"
        >
          <header className="flex min-h-[66px] items-center justify-between gap-[18px] border-b border-border py-3 pr-4 pl-[18px] [&_h2]:m-0 [&_h2]:text-base [&_h2]:font-normal [&_h2]:text-foreground [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:font-mono [&_p]:text-[10px] [&_p]:text-muted-foreground">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description>
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button aria-label="关闭" size="icon" variant="ghost">
                <X size={17} />
              </Button>
            </DialogPrimitive.Close>
          </header>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Dialog as Modal };
