import { Download, FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";

const reports = [
  ["Daily sales", "Total sales, bill count, average bill, best cashier, best item"],
  ["Sales by cashier", "Cashier performance and payment responsibility"],
  ["Sales by item", "Fastest moving food and drinks"],
  ["Inventory report", "Opening, sold, expected, actual, and variance"],
  ["Profit estimate", "Selling price minus stock cost by item"],
  ["Void/refund report", "Cancelled bills, refunded amounts, and approvers"],
  ["Discount report", "Discount amount, staff member, and approval status"],
  ["Payment report", "Cash, M-Pesa, card, bank, and split payments"],
  ["Closing report", "Expected cash, actual cash, and variance"],
  ["Stock variance", "Expected stock compared with physical count"]
];

export default function OwnerReportsPage() {
  return (
    <AppShell role="OWNER">
      <PageHeader
        eyebrow="Owner"
        title="Reports"
        description="Remote reporting menu for sales, stock, profit, staff activity, payments, and closing."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </button>
        }
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {reports.map(([title, description]) => (
          <Panel key={title} title={title}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm leading-6 text-zinc-600">{description}</p>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
