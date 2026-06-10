import { AlertTriangle, Boxes, Receipt, ShieldCheck, Wallet } from "lucide-react";
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

export default async function OwnerDashboardPage() {
  const { businessDate, dailyClosing, lowStockItems, paymentSummary, profitSignal, salesSummary, topItems } = await getDashboardReport();

  return (
    <AppShell role="OWNER">
      <PageHeader eyebrow="Remote owner view" title="Jikon Grill - Today's Report" description={`Live operating snapshot for ${businessDate}.`} />

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total sales" value={money(salesSummary.totalSales)} helper={`${salesSummary.bills} bills`} icon={Receipt} tone="good" />
        <MetricCard title="Profit signal" value={money(profitSignal)} helper="Gross estimate" icon={Wallet} />
        <MetricCard title="Low stock" value={`${lowStockItems.length} items`} helper="Stock action required" icon={Boxes} tone="warn" />
        <MetricCard title="Risk activity" value={`${salesSummary.voids + salesSummary.refunds}`} helper="Voids and refunds today" icon={AlertTriangle} tone="danger" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Payment report" subtitle="Cash vs M-Pesa vs card vs bank">
          <PaymentMix items={paymentSummary} />
        </Panel>

        <Panel title="Suspicious activity" subtitle="Approval-sensitive actions">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-500">Refunds</p>
              <p className="mt-1 text-2xl font-black">{salesSummary.refunds}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-500">Voids</p>
              <p className="mt-1 text-2xl font-black">{salesSummary.voids}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-500">Discounts</p>
              <p className="mt-1 text-2xl font-black">{money(salesSummary.discounts)}</p>
            </div>
            <div className="rounded-md border border-zinc-200 p-3">
              <p className="text-sm font-semibold text-zinc-500">Stock adjustments</p>
              <p className="mt-1 text-2xl font-black">{salesSummary.stockAdjustments}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Top selling items">
          <BarList items={topItems.map((item) => ({ label: item.name, value: item.quantity, helper: money(item.revenue) }))} />
        </Panel>

        <Panel title="Low stock">
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3">
                <div>
                  <p className="text-sm font-black text-zinc-950">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.currentStock} {item.unit} remaining
                  </p>
                </div>
                <StatusPill status="Bill due" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Closing report" subtitle={`Closed by ${dailyClosing.closedBy}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-500">Expected cash</p>
              <p className="mt-1 text-lg font-black">{money(dailyClosing.expectedCash)}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-500">Actual cash</p>
              <p className="mt-1 text-lg font-black">{money(dailyClosing.actualCash)}</p>
            </div>
            <div className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-500">Variance</p>
              <p className="mt-1 text-lg font-black text-red-700">{money(dailyClosing.variance)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Security posture">
          <div className="flex gap-3 rounded-md border border-leaf-500/20 bg-leaf-500/10 p-3 text-sm font-semibold text-leaf-600">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
            Owner-only reports, audit logs, and refund approval controls are included in the system design.
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
