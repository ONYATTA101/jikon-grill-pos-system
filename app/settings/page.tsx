import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DatabaseBackup, Download, Save, Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getAuthorizedSession } from "@/lib/current-session";
import { getRestaurantSettings, parseRestaurantSettings, saveRestaurantSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Builds a return URL containing a success or error message so the page can explain the result of a
 * saved form.
 */
const feedbackPath = (status: "success" | "error", message: string) => `/settings?status=${status}&message=${encodeURIComponent(message)}`;

/**
 * Validates and saves restaurant settings, records the change in the audit log, and refreshes affected
 * screens.
 */
async function saveSettings(formData: FormData) {
  "use server";

  const session = await getAuthorizedSession(["OWNER", "MANAGER", "ADMIN"]);
  if (!session) redirect(feedbackPath("error", "You are not allowed to update settings."));

  const settings = parseRestaurantSettings(formData);

  try {
    await prisma.$transaction(async (tx) => {
      await saveRestaurantSettings(settings, tx);
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "SETTINGS_UPDATED",
          entity: "AppSetting",
          description: "Updated restaurant settings",
          metadata: settings
        }
      });
    });
  } catch {
    redirect(feedbackPath("error", "Settings could not be saved."));
  }

  revalidatePath("/settings");
  revalidatePath("/pos");
  revalidatePath("/receipt/[receiptNumber]", "page");
  revalidatePath("/owner/audit-logs");
  redirect(feedbackPath("success", "Settings saved successfully."));
}

/**
 * Loads the information needed for the settings screen and renders the page for the signed-in user.
 */
export default async function SettingsPage({
  searchParams
}: {
  searchParams?: { status?: string; message?: string };
}) {
  const settings = await getRestaurantSettings();

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Restaurant details, receipt text, tax defaults, service charge, and quick operating tools."
      />

      <FeedbackBanner status={searchParams?.status === "error" ? "error" : "success"} message={searchParams?.message} className="mt-5" />

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel title="Restaurant settings" subtitle="These values appear on receipts and the POS payment panel.">
          <form action={saveSettings} className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold text-zinc-800">
              Restaurant name
              <input
                name="restaurantName"
                defaultValue={settings.restaurantName}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
                required
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Receipt subtitle
              <input
                name="receiptSubtitle"
                defaultValue={settings.receiptSubtitle}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Phone
              <input
                name="phone"
                defaultValue={settings.phone}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Address
              <input
                name="address"
                defaultValue={settings.address}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              VAT / tax rate (%)
              <input
                name="taxRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={settings.taxRate}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Default service charge
              <input
                name="defaultServiceCharge"
                type="number"
                min={0}
                step="1"
                defaultValue={settings.defaultServiceCharge}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <label className="block text-sm font-bold text-zinc-800 md:col-span-2">
              Receipt footer
              <input
                name="receiptFooter"
                defaultValue={settings.receiptFooter}
                className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
              />
            </label>
            <div className="md:col-span-2">
              <button className="flex h-11 items-center justify-center gap-2 rounded-md bg-ember-600 px-4 text-sm font-bold text-white transition hover:bg-ember-700">
                <Save className="h-4 w-4" aria-hidden="true" />
                Save settings
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel title="Daily tools" subtitle="Use these shortcuts when closing or reviewing the day.">
            <div className="space-y-3">
              <a href="/api/owner/sales/export" className="flex h-11 items-center justify-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white transition hover:bg-charcoal-800">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export sales CSV
              </a>
              <a href="/api/owner/profit/export" className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800 transition hover:border-ember-600">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export profit CSV
              </a>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                <div className="flex items-center gap-2 font-black text-zinc-950">
                  <DatabaseBackup className="h-4 w-4 text-ember-700" aria-hidden="true" />
                  Database backup
                </div>
                <p className="mt-2 font-mono text-xs text-zinc-600">npm run db:backup</p>
              </div>
            </div>
          </Panel>

          <Panel title="Current defaults">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-zinc-500">Tax rate</span>
                <span className="font-black text-zinc-950">{settings.taxRate}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-zinc-500">Service charge</span>
                <span className="font-black text-zinc-950">KSh {settings.defaultServiceCharge.toLocaleString("en-KE")}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="font-semibold text-zinc-500">Receipt name</span>
                <span className="font-black text-zinc-950">{settings.restaurantName}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
