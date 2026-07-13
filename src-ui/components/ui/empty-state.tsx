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
      <div className="grid size-11 place-items-center rounded-lg border border-[#363636] bg-[#202020] text-[#898989]">
        {icon}
      </div>
      <h3 className="mt-[15px] mb-[5px] text-[15px] font-normal">{title}</h3>
      <p className="mb-[18px] max-w-[340px] text-xs leading-[1.5] text-[#646464]">
        {description}
      </p>
      {action}
    </div>
  );
}
