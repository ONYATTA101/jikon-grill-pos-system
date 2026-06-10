import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  children,
  className,
  action
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("rounded-md border border-zinc-200 bg-white/95 p-4 shadow-panel backdrop-blur", className)}>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <h2 className="text-base font-black text-zinc-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
