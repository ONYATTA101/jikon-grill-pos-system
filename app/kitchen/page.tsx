import { ChefHat } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrderTicket } from "@/components/order-ticket";
import { PageHeader } from "@/components/page-header";
import { getOrderTickets } from "@/lib/order-report";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const kitchenTickets = await getOrderTickets("Kitchen");

  return (
    <AppShell role="KITCHEN">
      <PageHeader
        eyebrow="Kitchen Display"
        title="Food Orders"
        description="Kitchen only sees food items and preparation status."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white">
            <ChefHat className="h-4 w-4" aria-hidden="true" />
            {kitchenTickets.length} tickets
          </button>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {kitchenTickets.map((ticket) => (
          <OrderTicket key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </AppShell>
  );
}
