import type { ReactNode } from "react";

/**
 * Renders the reusable page header section of the user interface from the information supplied by its
 * parent screen.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white/85 p-5 shadow-panel backdrop-blur lg:flex lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-ember-700">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-black tracking-normal text-zinc-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p> : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-0">{actions}</div> : null}
    </div>
  );
}
