import type { ReactNode } from 'react';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the form control is provided as a child component.
    <label className="flex min-w-0 flex-col gap-[7px]" data-slot="field">
      <span className="text-[11px] font-medium text-foreground-secondary">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[10px] leading-[1.4] text-foreground-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
