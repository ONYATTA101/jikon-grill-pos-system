import { Download, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { RequestRefundButton } from "@/components/request-refund-button";
import { StatusPill } from "@/components/status-pill";
import { VoidSaleButton } from "@/components/void-sale-button";
import { money } from "@/lib/format";
import { getSalesHistory } from "@/lib/sales-report";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the owner sales screen and renders the page for the signed-in user.
 */
export default async function OwnerSalesPage() {
  const salesHistory = await getSalesHistory();

  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Owner"
        title="Sales"
        description="Search sales by date, cashier, table, receipt, item, and payment method."
        actions={
          <a href="/api/owner/sales/export" className="flex h-10 items-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white transition hover:bg-charcoal-800">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </a>
        }
      />

      <Panel
        className="mt-5"
        title="Sales history"
        action={
          <div className="flex h-10 min-w-64 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm text-zinc-500">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search receipts
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Receipt</th>
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Table</th>
                <th className="py-3 pr-4">Cashier</th>
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {salesHistory.map((sale) => (
                <tr key={sale.receipt}>
                  <td className="py-3 pr-4 font-black text-zinc-950">{sale.receipt}</td>
                  <td className="py-3 pr-4 text-zinc-600">{sale.time}</td>
                  <td className="py-3 pr-4 text-zinc-600">{sale.table}</td>
                  <td className="py-3 pr-4 text-zinc-600">{sale.cashier}</td>
                  <td className="py-3 pr-4 text-zinc-600">{sale.paymentMethod}</td>
                  <td className="py-3 pr-4 font-semibold text-zinc-950">{money(sale.total)}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={sale.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {sale.status === "Paid" ? (
                      <div className="flex flex-wrap gap-2">
                        <RequestRefundButton saleId={sale.id} receipt={sale.receipt} total={sale.total} />
                        <VoidSaleButton saleId={sale.id} receipt={sale.receipt} />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-zinc-400">-</span>
                    )}
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
