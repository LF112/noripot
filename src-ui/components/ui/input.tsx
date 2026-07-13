import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-[38px] w-full rounded-md border border-control bg-card px-2.5 py-2 text-xs text-foreground-strong outline-none placeholder:text-placeholder focus:border-primary/65 focus:ring-3 focus:ring-primary/10 read-only:bg-surface-hover read-only:text-muted-foreground',
        className,
      )}
      data-slot="input"
      {...props}
    />
  );
}
