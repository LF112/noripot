import { type ButtonHTMLAttributes, type ReactNode, useState } from 'react';
import { Button } from './button';
import { Tooltip } from './tooltip';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'default' | 'danger';
  children: ReactNode;
}

export function IconButton({
  label,
  variant = 'default',
  children,
  onClick,
  ...props
}: IconButtonProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <Tooltip content={label} open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <Button
        aria-label={label}
        onClick={(event) => {
          setTooltipOpen(false);
          onClick?.(event);
        }}
        size="icon"
        variant={variant === 'danger' ? 'danger' : 'ghost'}
        {...props}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
