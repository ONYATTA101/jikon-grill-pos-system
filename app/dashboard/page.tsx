import Link from "next/link";
import { AlertTriangle, Boxes, Plus, Receipt, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BarList } from "@/components/charts/bar-list";
import { PaymentMix } from "@/components/charts/payment-mix";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { getDashboardReport } from "@/lib/dashboard-report";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the manager dashboard screen and renders the page for the signed-in
 * user.
 */
export default async function ManagerDashboardPage() {
  const { dailyClosing, lowStockItems, paymentSummary, salesSummary, topItems } = await getDashboardReport();

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Manager"
        title="Operations Dashboard"
        description="Daily sales, payment mix, stock alerts, and closing controls for the restaurant team."
        actions={
          <Link href="/pos" className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white hover:bg-ember-700">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New sale
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Today sales" value={money(salesSummary.totalSales)} helper={`${salesSummary.bills} bills`} icon={Receipt} tone="good" />
        <MetricCard title="Average bill" value={money(salesSummary.averageBill)} helper={`Best cashier: ${salesSummary.bestCashier}`} icon={ShoppingCart} />
        <MetricCard title="Low stock" value={`${lowStockItems.length} items`} helper="Needs manager review" icon={Boxes} tone="warn" />
        <MetricCard title="Voids/refunds" value={`${salesSummary.voids + salesSummary.refunds}`} helper={money(4200)} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Panel title="Payment report" subtitle="Cash, M-Pesa, card, and bank totals">
          <PaymentMix items={paymentSummary} />
        </Panel>

        <Panel title="Top selling items" subtitle="Quantity sold today">
          <BarList items={topItems.map((item) => ({ label: item.name, value: item.quantity, helper: money(item.revenue) }))} />
        </Panel>

        <Panel title="Low stock alerts">
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
                <div>
                  <p className="text-sm font-black text-zinc-950">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.currentStock} {item.unit} remaining, minimum {item.minimumStock}
                  </p>
                </div>
                <StatusPill status="Bill due" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Daily closing" subtitle={`Closed by ${dailyClosing.closedBy}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-500">Expected cash</p>
              <p className="mt-1 text-xl font-black">{money(dailyClosing.expectedCash)}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-500">Actual cash</p>
              <p className="mt-1 text-xl font-black">{money(dailyClosing.actualCash)}</p>
            </div>
          </div>
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{dailyClosing.notes}</p>
          <Link href="/closing" className="mt-3 flex h-10 items-center justify-center rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white hover:bg-charcoal-800">
            Open daily closing
          </Link>
        </Panel>
      </div>
    </AppShell>
  );
}
