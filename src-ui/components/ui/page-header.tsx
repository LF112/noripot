import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className="mb-7 flex min-h-21 items-end justify-between gap-6 max-[720px]:mb-6 max-[720px]:min-h-0 max-[720px]:flex-col max-[720px]:items-start"
      data-slot="page-header"
    >
      <div>
        <span className="font-mono text-[10px] leading-[1.4] text-[#898989] uppercase">
          {eyebrow}
        </span>
        <h1 className="my-[7px] mt-2 text-[30px] leading-[1.1] font-normal text-[#fafafa] max-[720px]:text-[26px]">
          {title}
        </h1>
        <p className="m-0 text-sm leading-6 text-[#898989]">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap justify-end gap-2 max-[720px]:w-full max-[720px]:justify-start">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
