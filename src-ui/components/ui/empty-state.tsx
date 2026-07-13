import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex min-h-[310px] flex-col items-center justify-center px-5 py-10 text-center"
      data-slot="empty-state"
    >
      <div className="grid size-11 place-items-center rounded-lg border border-border-strong bg-muted text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-[15px] mb-[5px] text-[15px] font-normal">{title}</h3>
      <p className="mb-[18px] max-w-[340px] text-xs leading-[1.5] text-foreground-subtle">
        {description}
      </p>
      {action}
    </div>
  );
}
