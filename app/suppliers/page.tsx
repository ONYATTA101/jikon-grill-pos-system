import { Plus } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
/**
 * Builds a return URL containing a success or error message so the page can explain the result of a
 * saved form.
 */
const feedbackPath = (status: "success" | "error", message: string) => `/suppliers?status=${status}&message=${encodeURIComponent(message)}`;

/**
 * Loads the information needed for the suppliers screen and renders the page for the signed-in user.
 */
export default async function SuppliersPage({
  searchParams
}: {
  searchParams?: { status?: string; message?: string };
}) {
  /**
   * Validates and saves a supplier record, then reports whether the operation succeeded.
   */
  async function saveSupplier(formData: FormData) {
    "use server";

    const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
    if (!session) redirect(feedbackPath("error", "You are not allowed to save suppliers."));

    const name = String(formData.get("name") ?? "").trim();
    const contactPerson = String(formData.get("contactPerson") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name) redirect(feedbackPath("error", "Supplier name is required."));

    try {
      const supplier = await prisma.supplier.create({
        data: {
          name,
          contactPerson: contactPerson || null,
          phone: phone || null,
          email: email || null
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "SUPPLIER_CREATED",
          entity: "Supplier",
          entityId: supplier.id,
          description: `Created supplier ${supplier.name}`,
          metadata: {
            contactPerson,
            phone,
            email
          }
        }
      });
    } catch {
      redirect(feedbackPath("error", "Supplier could not be saved."));
    }

    revalidatePath("/suppliers");
    revalidatePath("/owner/audit-logs");
    redirect(feedbackPath("success", `${name} supplier saved successfully.`));
  }

  const suppliers = await prisma.supplier.findMany({
    include: {
      stockMovements: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Purchasing"
        title="Suppliers"
        description="Supplier contacts, balances, and delivery activity."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Supplier
          </button>
        }
      />

      <FeedbackBanner status={searchParams?.status === "error" ? "error" : "success"} message={searchParams?.message} className="mt-5" />

      <div className="mt-5 grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="New supplier">
          <form action={saveSupplier} className="space-y-3">
            <label className="block text-sm font-bold text-zinc-800">
              Supplier name
              <input name="name" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Contact person
              <input name="contactPerson" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Phone
              <input name="phone" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Email
              <input name="email" type="email" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Save supplier
            </button>
          </form>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
        {suppliers.map((supplier) => (
          <Panel key={supplier.id} title={supplier.name} subtitle={supplier.contactPerson ?? "No contact person"}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-500">Phone</span>
                <span className="font-bold text-zinc-950">{supplier.phone ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-500">Email</span>
                <span className="font-bold text-zinc-950">{supplier.email ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-zinc-500">Last delivery</span>
                <span className="font-bold text-zinc-950">
                  {supplier.stockMovements[0]?.createdAt.toLocaleDateString("en-KE", { day: "2-digit", month: "short" }) ?? "No deliveries"}
                </span>
              </div>
            </div>
          </Panel>
        ))}
        </div>
      </div>
    </AppShell>
  );
}
