import { Download, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { money } from "@/lib/format";
import { getProfitRows } from "@/lib/sales-report";

export const dynamic = "force-dynamic";

export default async function OwnerProfitPage() {
  const profitRows = await getProfitRows();
  const totalProfit = profitRows.reduce((sum, row) => sum + row.totalProfit, 0);

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Owner"
        title="Profit Estimate"
        description="Gross profit by item using selling price minus stock cost."
        actions={
          <a href="/api/owner/profit/export" className="flex h-10 items-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white transition hover:bg-charcoal-800">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        }
      />

      <div className="mt-5 max-w-sm">
        <MetricCard title="Estimated gross profit" value={money(totalProfit)} helper="Based on paid sales" icon={Wallet} tone="good" />
      </div>

      <Panel className="mt-5" title="Item profit">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Item</th>
                <th className="py-3 pr-4">Selling price</th>
                <th className="py-3 pr-4">Cost</th>
                <th className="py-3 pr-4">Gross profit</th>
                <th className="py-3 pr-4">Qty sold</th>
                <th className="py-3 pr-4">Total profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {profitRows.map((row) => (
                <tr key={row.name}>
                  <td className="py-3 pr-4 font-black text-zinc-950">{row.name}</td>
                  <td className="py-3 pr-4 text-zinc-600">{money(row.sellingPrice)}</td>
                  <td className="py-3 pr-4 text-zinc-600">{money(row.cost)}</td>
                  <td className="py-3 pr-4 font-semibold text-zinc-950">{money(row.grossProfit)}</td>
                  <td className="py-3 pr-4 text-zinc-600">{row.quantitySold}</td>
                  <td className="py-3 pr-4 font-black text-leaf-600">{money(row.totalProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
