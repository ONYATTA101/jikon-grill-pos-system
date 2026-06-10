import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { getInventoryReport } from "@/lib/inventory-report";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the inventory screen and renders the page for the signed-in user.
 */
export default async function InventoryPage() {
  const inventoryItems = await getInventoryReport();

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Stock"
        title="Inventory"
        description="Opening stock, sales deduction, expected balance, actual balance, and low-stock alerts."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Stock in
          </button>
        }
      />

      <Panel className="mt-5" title="Stock count">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Item</th>
                <th className="py-3 pr-4">Opening</th>
                <th className="py-3 pr-4">Sold</th>
                <th className="py-3 pr-4">Expected</th>
                <th className="py-3 pr-4">Actual</th>
                <th className="py-3 pr-4">Variance</th>
                <th className="py-3 pr-4">Cost/unit</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {inventoryItems.map((item) => {
                const variance = item.actual - item.expected;
                const status = item.currentStock <= item.minimumStock ? "Bill due" : "Active";
                return (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 font-bold text-zinc-950">{item.name}</td>
                    <td className="py-3 pr-4 text-zinc-600">
                      {item.openingStock} {item.unit}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">
                      {item.sold} {item.unit}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">
                      {item.expected} {item.unit}
                    </td>
                    <td className="py-3 pr-4 text-zinc-600">
                      {item.actual} {item.unit}
                    </td>
                    <td className={`py-3 pr-4 font-black ${variance < 0 ? "text-red-700" : "text-leaf-600"}`}>{variance}</td>
                    <td className="py-3 pr-4 text-zinc-600">{money(item.costPerUnit)}</td>
                    <td className="py-3 pr-4">
                      <StatusPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
