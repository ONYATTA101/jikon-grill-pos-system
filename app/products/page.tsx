import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { toProductView } from "@/lib/product-mapper";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the products screen and renders the page for the signed-in user.
 */
export default async function ProductsPage() {
  const products = (
    await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }]
    })
  ).map(toProductView);

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Menu items, selling prices, costs, station routing, and inventory tracking mode."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Product
          </button>
        }
      />

      <Panel
        className="mt-5"
        title="Menu catalog"
        action={
          <div className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm text-zinc-500">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search products
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Station</th>
                <th className="py-3 pr-4">Price</th>
                <th className="py-3 pr-4">Cost</th>
                <th className="py-3 pr-4">Tracking</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="py-3 pr-4 font-bold text-zinc-950">{product.name}</td>
                  <td className="py-3 pr-4 text-zinc-600">{product.category}</td>
                  <td className="py-3 pr-4 text-zinc-600">{product.station}</td>
                  <td className="py-3 pr-4 font-semibold text-zinc-950">{money(product.price)}</td>
                  <td className="py-3 pr-4 text-zinc-600">{money(product.cost)}</td>
                  <td className="py-3 pr-4 text-zinc-600">{product.stockTrackingType}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={product.active ? "Active" : "Suspended"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
