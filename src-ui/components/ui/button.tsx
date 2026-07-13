import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3.5 py-1.5 text-[13px] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/70 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary:
          'border-primary bg-primary text-primary-foreground enabled:hover:border-[#58d9a0] enabled:hover:bg-[#58d9a0]',
        secondary:
          'border-[#393939] bg-[#1c1c1c] text-[#efefef] enabled:hover:border-[#4d4d4d] enabled:hover:bg-[#242424]',
        danger:
          'border-red-400/30 bg-transparent text-red-300 enabled:hover:border-red-400/25 enabled:hover:bg-red-400/6 enabled:hover:text-red-400',
        ghost:
          'border-transparent bg-transparent text-[#898989] enabled:hover:border-[#363636] enabled:hover:bg-[#242424] enabled:hover:text-[#fafafa]',
      },
      size: {
        default: '',
        sm: 'min-h-[30px] px-2 py-1 text-[11px]',
        icon: 'size-[34px] min-h-0 shrink-0 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot="button"
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
          size={15}
        />
      ) : null}
      {children}
    </button>
  );
}

export { buttonVariants };
