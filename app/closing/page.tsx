import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PaymentMix } from "@/components/charts/payment-mix";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getClosingPreview } from "@/lib/closing-report";
import { getAuthorizedSession } from "@/lib/current-session";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the closing screen and renders the page for the signed-in user.
 */
export default async function ClosingPage() {
  /**
   * Saves the manager's end-of-day cash count and notes together with the calculated closing totals.
   */
  async function saveClosing(formData: FormData) {
    "use server";

    const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
    if (!session) redirect("/login");

    const preview = await getClosingPreview();
    const actualCashInput = Number(formData.get("actualCash") ?? 0);
    const notes = String(formData.get("notes") ?? "").trim();
    if (!Number.isFinite(actualCashInput) || actualCashInput < 0) redirect("/closing");

    const actualCash = Math.max(actualCashInput, 0);
    const cashVariance = actualCash - preview.expectedCash;

    const closing = await prisma.dailyClosingReport.upsert({
      where: {
        businessDate: preview.businessDate
      },
      update: {
        totalSales: preview.totalSales,
        expectedCash: preview.expectedCash,
        actualCash,
        cashVariance,
        totalBills: preview.totalBills,
        paymentBreakdown: preview.paymentBreakdown,
        notes,
        closedById: session.userId
      },
      create: {
        businessDate: preview.businessDate,
        totalSales: preview.totalSales,
        expectedCash: preview.expectedCash,
        actualCash,
        cashVariance,
        totalBills: preview.totalBills,
        paymentBreakdown: preview.paymentBreakdown,
        notes,
        closedById: session.userId
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "DAILY_CLOSING_SAVED",
        entity: "DailyClosingReport",
        entityId: closing.id,
        description: `Closed ${preview.businessDateLabel}: expected cash ${money(preview.expectedCash)}, actual cash ${money(actualCash)}, variance ${money(cashVariance)}`,
        metadata: {
          businessDate: preview.businessDate.toISOString(),
          totalSales: preview.totalSales,
          totalBills: preview.totalBills,
          expectedCash: preview.expectedCash,
          actualCash,
          cashVariance,
          paymentBreakdown: preview.paymentBreakdown
        }
      }
    });

    revalidatePath("/closing");
    revalidatePath("/dashboard");
    revalidatePath("/owner/dashboard");
    revalidatePath("/owner/audit-logs");
  }

  const preview = await getClosingPreview();
  const paymentItems = Object.entries(preview.paymentBreakdown).map(([method, amount]) => ({ method, amount }));
  const existingActualCash = preview.existingClosing?.actualCash ?? preview.expectedCash;
  const variance = existingActualCash - preview.expectedCash;

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Manager"
        title="Daily Closing"
        description={`Cash drawer close for ${preview.businessDateLabel}.`}
        actions={
          <Link href="/dashboard" className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total sales" value={money(preview.totalSales)} helper={`${preview.totalBills} paid bills`} icon={Save} tone="good" />
        <MetricCard title="Expected cash" value={money(preview.expectedCash)} helper="Cash payments today" icon={Save} />
        <MetricCard title="Actual cash" value={money(existingActualCash)} helper={preview.existingClosing ? `Closed by ${preview.existingClosing.closedBy}` : "Enter count below"} icon={Save} />
        <MetricCard title="Variance" value={money(variance)} helper={variance === 0 ? "Drawer balanced" : "Needs review"} icon={Save} tone={variance === 0 ? "good" : "warn"} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Close cash drawer" subtitle="Record the actual cash counted at end of day">
          <form action={saveClosing} className="space-y-4">
            <label className="block text-sm font-bold text-zinc-800">
              Actual cash counted
              <input
                name="actualCash"
                type="number"
                min={0}
                step="1"
                defaultValue={existingActualCash}
                required
                className="mt-2 h-11 w-full rounded-md border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Notes
              <textarea
                name="notes"
                defaultValue={preview.existingClosing?.notes ?? ""}
                rows={5}
                className="mt-2 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ember-600"
              />
            </label>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white hover:bg-ember-700">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save closing
            </button>
          </form>
        </Panel>

        <Panel title="Payment breakdown" subtitle="Expected totals from paid sales">
          <PaymentMix items={paymentItems} />
          <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">
            Expected cash is calculated from Cash payments only. M-Pesa, card, bank, and split totals remain visible for reconciliation.
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
