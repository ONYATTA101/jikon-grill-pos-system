import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Paid: "bg-leaf-500/10 text-leaf-600 ring-leaf-500/20",
  Approved: "bg-leaf-500/10 text-leaf-600 ring-leaf-500/20",
  Ready: "bg-leaf-500/10 text-leaf-600 ring-leaf-500/20",
  Active: "bg-leaf-500/10 text-leaf-600 ring-leaf-500/20",
  Preparing: "bg-ember-500/10 text-ember-700 ring-ember-500/20",
  Sent: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  Open: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  Dining: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
  Kitchen: "bg-ember-500/10 text-ember-700 ring-ember-500/20",
  Bar: "bg-violet-500/10 text-violet-700 ring-violet-500/20",
  Available: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  Reserved: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20",
  "Bill due": "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  Voided: "bg-red-500/10 text-red-700 ring-red-500/20",
  Refunded: "bg-red-500/10 text-red-700 ring-red-500/20",
  Suspended: "bg-red-500/10 text-red-700 ring-red-500/20",
  Unpaid: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  Pending: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  Rejected: "bg-red-500/10 text-red-700 ring-red-500/20"
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ring-1",
        statusStyles[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"
      )}
    >
      {status}
    </span>
  );
}
