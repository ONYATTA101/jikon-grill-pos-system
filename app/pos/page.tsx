import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { PosTerminal } from "@/components/pos-terminal";
import { getCurrentSession } from "@/lib/current-session";
import { toProductView } from "@/lib/product-mapper";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const session = await getCurrentSession();
  const settings = await getRestaurantSettings();
  const products = (
    await prisma.product.findMany({
      where: {
        isActive: true
      },
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
  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];

  return (
    <AppShell role="CASHIER">
      <PageHeader
        eyebrow="Sales"
        title="POS Terminal"
        description="Create table, takeaway, and delivery bills with cash, M-Pesa, card, bank, or split payment."
      />
      <div className="mt-5">
        <PosTerminal
          categories={categories}
          products={products}
          taxRate={settings.taxRate}
          defaultServiceCharge={settings.defaultServiceCharge}
          canPay={Boolean(session && ["OWNER", "MANAGER", "CASHIER"].includes(session.role))}
          canDiscount={Boolean(session && ["OWNER", "MANAGER"].includes(session.role))}
        />
      </div>
    </AppShell>
  );
}
