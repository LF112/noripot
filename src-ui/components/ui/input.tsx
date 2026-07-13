import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-[38px] w-full rounded-md border border-[#393939] bg-[#141414] px-2.5 py-2 text-xs text-[#efefef] outline-none placeholder:text-[#595959] focus:border-primary/65 focus:ring-3 focus:ring-primary/10 read-only:bg-[#1c1c1c] read-only:text-[#898989]',
        className,
      )}
      data-slot="input"
      {...props}
    />
  );
}
