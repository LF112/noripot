import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex min-h-[38px] w-full items-center justify-between gap-2 rounded-md border border-[#393939] bg-[#141414] px-2.5 py-2 text-left text-xs text-[#efefef] hover:border-[#4d4d4d] focus-visible:border-primary/65 focus-visible:ring-3 focus-visible:ring-primary/10 focus-visible:outline-none data-[state=open]:border-primary/65 data-[state=open]:ring-3 data-[state=open]:ring-primary/10 data-[placeholder]:text-[#595959] [&>span:first-child]:truncate [&>svg]:shrink-0 [&>svg]:text-[#646464]',
        className,
      )}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" size={14} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 5,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'z-90 max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-[#393939] bg-[#202020] text-[#efefef] data-[state=open]:animate-[select-in_140ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:data-[state=open]:animate-none',
          className,
        )}
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="grid h-7 cursor-default place-items-center text-[#898989]">
          <ChevronUp aria-hidden="true" size={14} />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="grid h-7 cursor-default place-items-center text-[#898989]">
          <ChevronDown aria-hidden="true" size={14} />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex min-h-8 cursor-default items-center rounded-sm py-1.5 pr-8 pl-[9px] text-xs text-[#b4b4b4] outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-[#2a2a2a] data-[highlighted]:text-[#fafafa]',
        className,
      )}
      data-slot="select-item"
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-[9px] grid place-items-center text-primary">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" size={14} />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}
