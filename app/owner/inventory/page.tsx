import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getInventoryReport } from "@/lib/inventory-report";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the owner inventory screen and renders the page for the signed-in
 * user.
 */
export default async function OwnerInventoryPage() {
  const inventoryItems = await getInventoryReport();

  return (
    <AppShell role="OWNER">
      <PageHeader eyebrow="Owner" title="Stock Variance" description="Expected stock compared with actual physical count." />

      <Panel className="mt-5" title="Variance report">
        <div className="space-y-3">
          {inventoryItems.map((item) => {
            const variance = item.actual - item.expected;
            return (
              <div key={item.id} className="grid gap-3 rounded-md border border-zinc-200 p-3 text-sm md:grid-cols-[1fr_120px_120px_120px]">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 grid h-8 w-8 place-items-center rounded-md ${variance < 0 ? "bg-red-500/10 text-red-700" : "bg-leaf-500/10 text-leaf-600"}`}>
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-black text-zinc-950">{item.name}</span>
                    <span className="block text-zinc-500">
                      Sold {item.sold} {item.unit}
                    </span>
                  </span>
                </div>
                <span className="font-semibold text-zinc-600">Expected: {item.expected}</span>
                <span className="font-semibold text-zinc-600">Actual: {item.actual}</span>
                <span className={`font-black ${variance < 0 ? "text-red-700" : "text-leaf-600"}`}>Variance: {variance}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </AppShell>
  );
}
