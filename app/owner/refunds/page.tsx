import { ApprovalStatus } from "@prisma/client";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { RefundActionButtons } from "@/components/refund-action-buttons";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<ApprovalStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

export default async function OwnerRefundsPage() {
  const refunds = await prisma.refund.findMany({
    include: {
      sale: {
        select: {
          receiptNumber: true,
          total: true,
          paymentStatus: true
        }
      },
      requestedBy: {
        select: {
          name: true
        }
      },
      approvedBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });
  const pending = refunds.filter((refund) => refund.status === ApprovalStatus.PENDING);
  const approvedToday = refunds.filter((refund) => refund.status === ApprovalStatus.APPROVED && isToday(refund.updatedAt));
  const pendingTotal = pending.reduce((sum, refund) => sum + Number(refund.amount), 0);
  const approvedTodayTotal = approvedToday.reduce((sum, refund) => sum + Number(refund.amount), 0);

  return (
    <AppShell role="OWNER">
      <PageHeader eyebrow="Owner" title="Refunds" description="Review refund requests, approve valid refunds, and keep a clean audit trail." />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <MetricCard title="Pending refunds" value={money(pendingTotal)} helper={`${pending.length} request${pending.length === 1 ? "" : "s"} waiting`} icon={RotateCcw} tone="warn" />
        <MetricCard title="Approved today" value={money(approvedTodayTotal)} helper={`${approvedToday.length} approved today`} icon={RotateCcw} tone="good" />
      </div>

      <Panel className="mt-5" title="Refund queue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Receipt</th>
                <th className="py-3 pr-4">Requested</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3 pr-4">Requested by</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Approved by</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="py-3 pr-4 font-black text-zinc-950">{refund.sale.receiptNumber}</td>
                  <td className="py-3 pr-4 text-zinc-600">
                    {refund.createdAt.toLocaleString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="py-3 pr-4 font-black text-zinc-950">{money(Number(refund.amount))}</td>
                  <td className="max-w-xs py-3 pr-4 text-zinc-600">{refund.reason}</td>
                  <td className="py-3 pr-4 text-zinc-600">{refund.requestedBy?.name ?? "Staff"}</td>
                  <td className="py-3 pr-4">
                    <StatusPill status={statusLabels[refund.status]} />
                  </td>
                  <td className="py-3 pr-4 text-zinc-600">{refund.approvedBy?.name ?? "-"}</td>
                  <td className="py-3 pr-4">
                    {refund.status === ApprovalStatus.PENDING ? <RefundActionButtons refundId={refund.id} /> : <span className="text-xs font-semibold text-zinc-400">-</span>}
                  </td>
                </tr>
              ))}
              {!refunds.length ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm font-semibold text-zinc-500">
                    No refund requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}

function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
