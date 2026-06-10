import { Wine } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrderTicket } from "@/components/order-ticket";
import { PageHeader } from "@/components/page-header";
import { getOrderTickets } from "@/lib/order-report";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  const barTickets = await getOrderTickets("Bar");

  return (
    <AppShell role="BARTENDER">
      <PageHeader
        eyebrow="Bar Display"
        title="Drink Orders"
        description="Bartender view for beers, spirits, wine, and soft drinks."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white">
            <Wine className="h-4 w-4" aria-hidden="true" />
            {barTickets.length} tickets
          </button>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {barTickets.map((ticket) => (
          <OrderTicket key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </AppShell>
  );
}
