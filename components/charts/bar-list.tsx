import { compactNumber, percent } from "@/lib/format";

export function BarList({
  items,
  valuePrefix = ""
}: {
  items: Array<{ label: string; value: number; helper?: string }>;
  valuePrefix?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = (item.value / maxValue) * 100;

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-zinc-800">{item.label}</span>
              <span className="text-zinc-500">
                {valuePrefix}
                {compactNumber(item.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-ember-600" style={{ width: percent(width) }} />
            </div>
            {item.helper ? <p className="text-xs text-zinc-500">{item.helper}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
