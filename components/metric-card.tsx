import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "neutral"
}: {
  title: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const toneClass = {
    neutral: "bg-zinc-950 text-white shadow-zinc-950/20",
    good: "bg-leaf-600 text-white shadow-leaf-600/20",
    warn: "bg-ember-600 text-white shadow-ember-600/20",
    danger: "bg-red-600 text-white shadow-red-600/20"
  }[tone];

  return (
    <section className="rounded-md border border-zinc-200 bg-white/95 p-4 shadow-panel backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-zinc-950">{value}</p>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-md shadow-lg", toneClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {helper ? <p className="mt-3 text-xs font-medium text-zinc-500">{helper}</p> : null}
    </section>
  );
}
