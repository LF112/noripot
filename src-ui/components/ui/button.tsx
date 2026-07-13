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
          'border-primary bg-primary text-primary-foreground enabled:hover:border-primary-hover enabled:hover:bg-primary-hover',
        secondary:
          'border-control bg-card text-foreground-strong enabled:hover:border-control-hover enabled:hover:bg-secondary',
        danger:
          'border-destructive/30 bg-transparent text-destructive enabled:hover:border-destructive/25 enabled:hover:bg-destructive/6 enabled:hover:text-destructive',
        ghost:
          'border-transparent bg-transparent text-muted-foreground enabled:hover:border-border-strong enabled:hover:bg-secondary enabled:hover:text-foreground',
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
