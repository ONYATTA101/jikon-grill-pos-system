import { money, percent } from "@/lib/format";

const colors = ["bg-leaf-600", "bg-ember-600", "bg-zinc-950", "bg-sky-600", "bg-violet-600"];

export function PaymentMix({ items }: { items: Array<{ method: string; amount: number }> }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100">
        {items.map((item, index) => (
          <div
            key={item.method}
            className={colors[index % colors.length]}
            style={{ width: percent((item.amount / total) * 100) }}
            title={`${item.method} ${money(item.amount)}`}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <div key={item.method} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${colors[index % colors.length]}`} />
              <span className="text-sm font-semibold text-zinc-700">{item.method}</span>
            </div>
            <span className="text-sm font-bold text-zinc-950">{money(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
