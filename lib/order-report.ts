import { OrderStatus, Station } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { OrderTicket } from "@/lib/types";

const statusLabels: Record<OrderStatus, OrderTicket["status"]> = {
  OPEN: "Open",
  SENT_TO_KITCHEN: "Sent",
  SENT_TO_BAR: "Sent",
  READY: "Ready",
  SERVED: "Served",
  PAID: "Paid",
  VOIDED: "Voided",
  CANCELLED: "Voided"
};

/**
 * Loads open order items and groups them into kitchen or bar tickets for preparation staff.
 */
export async function getOrderTickets(station?: "Kitchen" | "Bar"): Promise<OrderTicket[]> {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        notIn: [OrderStatus.PAID, OrderStatus.VOIDED, OrderStatus.CANCELLED]
      }
    },
    include: {
      table: {
        select: {
          number: true
        }
      },
      waiter: {
        select: {
          name: true
        }
      },
      items: {
        include: {
          product: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  return orders.flatMap((order) => {
    const groupedItems = new Map<Station, typeof order.items>();
    for (const item of order.items) {
      if (item.product.station === Station.NONE) continue;
      groupedItems.set(item.product.station, [...(groupedItems.get(item.product.station) ?? []), item]);
    }

    return Array.from(groupedItems.entries())
      .filter(([itemStation]) => !station || stationToLabel(itemStation) === station)
      .map(([itemStation, items]) => ({
        id: `${order.orderNo}-${itemStation === Station.KITCHEN ? "K" : "B"}`,
        orderId: order.id,
        table: order.table ? `Table ${order.table.number}` : order.type === "DELIVERY" ? "Delivery" : "Takeaway",
        waiter: order.waiter?.name ?? "Waiter",
        station: stationToLabel(itemStation),
        status: getTicketStatus(items.map((item) => item.status)),
        age: formatAge(order.createdAt),
        items: items.map((item) => ({
          name: item.product.name,
          quantity: Number(item.quantity),
          note: item.note ?? undefined
        }))
      }));
  });
}

/**
 * Converts a database preparation-station value into the label displayed to staff.
 */
function stationToLabel(station: Station) {
  return station === Station.BAR ? "Bar" : "Kitchen";
}

/**
 * Combines the statuses of all items on a ticket into one overall order-ticket status.
 */
function getTicketStatus(statuses: OrderStatus[]): OrderTicket["status"] {
  if (statuses.every((status) => status === OrderStatus.SERVED)) return "Served";
  if (statuses.every((status) => status === OrderStatus.READY)) return "Ready";
  if (statuses.some((status) => status === OrderStatus.READY)) return "Ready";
  if (statuses.some((status) => status === OrderStatus.OPEN)) return "Open";
  return "Sent";
}

/**
 * Shows how long an order has been waiting in a short, staff-friendly format.
 */
function formatAge(createdAt: Date) {
  const minutes = Math.max(Math.floor((Date.now() - createdAt.getTime()) / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}
