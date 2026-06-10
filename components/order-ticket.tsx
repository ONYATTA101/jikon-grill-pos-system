"use client";

import { AlertCircle, CheckCheck, ChefHat, CircleCheck, Clock3, Wine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StatusPill } from "@/components/status-pill";
import type { OrderTicket as OrderTicketType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders the reusable order ticket section of the user interface from the information supplied by its
 * parent screen.
 */
export function OrderTicket({
  ticket,
  actionMode = "station"
}: {
  ticket: OrderTicketType;
  actionMode?: "station" | "service";
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const StationIcon = ticket.station === "Bar" ? Wine : ChefHat;
  const itemCount = ticket.items.reduce((sum, item) => sum + item.quantity, 0);
  const isReady = ticket.status === "Ready";
  const isServed = ticket.status === "Served";

  /**
   * Updates an order ticket's preparation status and refreshes the screen so the team sees the latest
   * workflow state.
   */
  async function updateStatus(status: "READY" | "SERVED") {
    if (!ticket.orderId) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${ticket.orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          station: ticket.station,
          status
        })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Ticket could not be updated.");
      }

      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Ticket could not be updated.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-l-4 border-zinc-200 bg-white shadow-panel",
        ticket.station === "Bar" ? "border-l-sky-600" : "border-l-ember-600"
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                ticket.station === "Bar" ? "bg-sky-500/10 text-sky-700" : "bg-ember-500/10 text-ember-700"
              )}
            >
              <StationIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-zinc-950">{ticket.id}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
                {ticket.table} - {ticket.waiter}
              </p>
            </div>
          </div>
        </div>
        <StatusPill status={ticket.status} />
      </div>

      <div className="flex items-center justify-between gap-3 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {ticket.age}
        </span>
        <span>
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2 p-4">
        {ticket.items.map((item) => (
          <div key={`${ticket.id}-${item.name}`} className="rounded-md border border-zinc-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-900">{item.name}</span>
              <span className="grid h-7 min-w-7 place-items-center rounded-md bg-zinc-100 px-2 text-sm font-black text-zinc-950">x{item.quantity}</span>
            </div>
            {item.note ? <p className="mt-1 text-xs font-semibold text-ember-700">{item.note}</p> : null}
          </div>
        ))}
      </div>

      {error ? (
        <div className="mx-4 mb-3 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      {ticket.orderId ? (
        <div className="border-t border-zinc-100 p-4">
          {actionMode === "station" ? (
            <button
              type="button"
              onClick={() => updateStatus("READY")}
              disabled={isUpdating || isReady || isServed}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white hover:bg-ember-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              {isUpdating ? "Updating..." : isReady || isServed ? "Ready" : "Mark ready"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateStatus("SERVED")}
              disabled={isUpdating || !isReady || isServed}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-charcoal-900 px-3 text-sm font-bold text-white hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {isUpdating ? "Updating..." : isServed ? "Served" : isReady ? "Mark served" : "Waiting for ready"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
