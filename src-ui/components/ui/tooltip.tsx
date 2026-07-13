import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  children,
  content,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  content: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-100 max-w-60 animate-[tooltip-in_120ms_ease-out] rounded-[5px] border border-tooltip bg-tooltip px-2 py-1.5 text-[10px] leading-[1.3] text-tooltip-foreground motion-reduce:animate-none"
          data-slot="tooltip-content"
          sideOffset={7}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-tooltip" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
