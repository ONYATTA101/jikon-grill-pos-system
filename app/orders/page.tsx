import { CheckCheck, Clock3, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OrderTicket } from "@/components/order-ticket";
import { PageHeader } from "@/components/page-header";
import { getOrderTickets } from "@/lib/order-report";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the orders screen and renders the page for the signed-in user.
 */
export default async function OrdersPage() {
  const orderTickets = await getOrderTickets();
  const readyTickets = orderTickets.filter((ticket) => ticket.status === "Ready").length;
  const openTickets = orderTickets.filter((ticket) => ticket.status !== "Ready" && ticket.status !== "Served").length;
  const servedTickets = orderTickets.filter((ticket) => ticket.status === "Served").length;

  return (
    <AppShell role="WAITER">
      <PageHeader
        eyebrow="Orders"
        title="Open Tickets"
        description="Food and drink tickets sent from the POS to the kitchen and bar."
        actions={
          <Link href="/pos" className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white hover:bg-ember-700">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New order
          </Link>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-sky-500/10 text-sky-700">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Open</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{openTickets}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-leaf-500/10 text-leaf-600">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Ready</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{readyTickets}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-zinc-100 text-zinc-600">
            <CheckCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Served</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{servedTickets}</p>
          </div>
        </div>
      </div>

      {!orderTickets.length ? (
        <section className="mt-5 grid min-h-56 place-items-center rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center shadow-panel">
          <div>
            <ListChecks className="mx-auto h-9 w-9 text-zinc-400" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-black text-zinc-950">No open tickets</h2>
            <p className="mt-1 text-sm text-zinc-500">New kitchen and bar tickets will appear here.</p>
          </div>
        </section>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {orderTickets.map((ticket) => (
            <OrderTicket key={ticket.id} ticket={ticket} actionMode="service" />
          ))}
        </div>
      )}
    </AppShell>
  );
}
