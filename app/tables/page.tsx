import Link from "next/link";
import { ArrowRight, CircleCheck, Clock3, Plus, Receipt, Users } from "lucide-react";
import { OrderStatus, Station } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tableTones: Record<string, string> = {
  Available: "border-l-zinc-300",
  Dining: "border-l-sky-500",
  Kitchen: "border-l-ember-600",
  Bar: "border-l-violet-500",
  Ready: "border-l-leaf-500",
  Paid: "border-l-leaf-500"
};

function tableStatus(
  order?: {
    status: OrderStatus;
    items: Array<{ status: OrderStatus; product: { station: Station; sellingPrice: unknown } }>;
  },
  storedStatus?: string
) {
  if (order) {
    const allServed = order.items.every((item) => item.status === OrderStatus.SERVED);
    const allReadyOrServed = order.items.every((item) => item.status === OrderStatus.READY || item.status === OrderStatus.SERVED);
    const pendingItems = order.items.filter((item) => item.status !== OrderStatus.READY && item.status !== OrderStatus.SERVED);

    if (allServed) return "Dining";
    if (allReadyOrServed) return "Ready";
    if (pendingItems.some((item) => item.product.station === Station.KITCHEN)) return "Kitchen";
    if (pendingItems.some((item) => item.product.station === Station.BAR)) return "Bar";
    return "Dining";
  }

  if (storedStatus === "paid") return "Paid";
  if (storedStatus === "ordered") return "Kitchen";
  return "Available";
}

export default async function TablesPage() {
  const tables = await prisma.restaurantTable.findMany({
    include: {
      orders: {
        where: {
          status: {
            notIn: ["PAID", "VOIDED", "CANCELLED"]
          }
        },
        include: {
          waiter: true,
          items: {
            include: {
              product: {
                select: {
                  station: true,
                  sellingPrice: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      sales: {
        where: {
          paymentStatus: {
            in: ["UNPAID", "PARTIAL"]
          }
        }
      }
    },
    orderBy: {
      number: "asc"
    }
  });
  const tableStates = tables.map((table) => {
    const openOrder = table.orders[0];
    const openBillTotal = table.sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const openOrderTotal =
      openOrder?.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.product.sellingPrice), 0) ?? 0;
    const status = tableStatus(openOrder, table.status);

    return {
      number: table.number,
      status,
      guests: table.seats,
      waiter: openOrder?.waiter?.name ?? "-",
      orderNo: openOrder?.orderNo ?? null,
      total: openBillTotal || openOrderTotal
    };
  });
  const activeTables = tableStates.filter((table) => table.status !== "Available" && table.status !== "Paid").length;
  const readyTables = tableStates.filter((table) => table.status === "Ready").length;
  const availableTables = tableStates.filter((table) => table.status === "Available").length;

  return (
    <AppShell role="WAITER">
      <PageHeader
        eyebrow="Floor"
        title="Tables"
        description="Track active tables, bills due, kitchen orders, bar orders, and paid tables."
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
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Active</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{activeTables}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-leaf-500/10 text-leaf-600">
            <CircleCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Ready</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{readyTables}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-panel">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-zinc-100 text-zinc-600">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">Available</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{availableTables}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tableStates.map((table) => (
          <section
            key={table.number}
            className={cn("rounded-md border border-l-4 border-zinc-200 bg-white p-4 shadow-panel", tableTones[table.status] ?? tableTones.Available)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Table</p>
                <h2 className="mt-1 text-3xl font-black text-zinc-950">{table.number}</h2>
              </div>
              <StatusPill status={table.status} />
            </div>

            <p className="mt-3 min-h-5 truncate text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
              {table.orderNo ?? "No active order"}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="font-semibold text-zinc-500">Seats</p>
                <p className="mt-1 text-lg font-black text-zinc-950">{table.guests}</p>
              </div>
              <div className="rounded-md bg-zinc-50 p-3">
                <p className="font-semibold text-zinc-500">Bill</p>
                <p className="mt-1 text-lg font-black text-zinc-950">{money(table.total)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-zinc-500">Waiter: {table.waiter}</span>
              <Link
                href={table.orderNo ? "/orders" : "/pos"}
                title={table.orderNo ? "View open tickets" : "Create order"}
                aria-label={table.orderNo ? `View Table ${table.number} tickets` : `Create Table ${table.number} order`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-ember-700 transition hover:border-ember-600 hover:bg-ember-50"
              >
                {table.orderNo ? <Receipt className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
