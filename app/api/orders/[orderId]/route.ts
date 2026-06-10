import { NextResponse } from "next/server";
import { OrderStatus, Station } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

/**
 * Updates an order or preparation-station status while enforcing staff permissions and valid workflow
 * transitions.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "KITCHEN", "BARTENDER", "WAITER", "CASHIER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to update tickets." }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await request.json();
  const nextStatus = toOrderStatus(body.status);
  const station = toStation(body.station);

  if (!nextStatus || !station) {
    return NextResponse.json({ error: "Valid station and status are required." }, { status: 400 });
  }

  if ((session.role === "KITCHEN" && station !== Station.KITCHEN) || (session.role === "BARTENDER" && station !== Station.BAR)) {
    return NextResponse.json({ error: "You cannot update this station." }, { status: 403 });
  }

  if ((session.role === "WAITER" || session.role === "CASHIER") && nextStatus !== OrderStatus.SERVED) {
    return NextResponse.json({ error: "Service staff can only mark ready tickets as served." }, { status: 403 });
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const stationItems = await tx.orderItem.findMany({
        where: {
          orderId,
          product: {
            station
          }
        },
        select: {
          id: true,
          status: true
        }
      });

      if (!stationItems.length) {
        throw new TicketUpdateError("No matching ticket items found.", 404);
      }

      if (
        nextStatus === OrderStatus.SERVED &&
        stationItems.some((item) => item.status !== OrderStatus.READY && item.status !== OrderStatus.SERVED)
      ) {
        throw new TicketUpdateError("Only ready tickets can be marked served.", 400);
      }

      await tx.orderItem.updateMany({
        where: {
          id: {
            in: stationItems.map((item) => item.id)
          }
        },
        data: {
          status: nextStatus
        }
      });

      const allItems = await tx.orderItem.findMany({
        where: {
          orderId
        },
        select: {
          status: true
        }
      });
      const orderStatus = allItems.every((item) => item.status === OrderStatus.SERVED)
        ? OrderStatus.SERVED
        : allItems.every((item) => item.status === OrderStatus.READY || item.status === OrderStatus.SERVED)
          ? OrderStatus.READY
          : allItems.some((item) => item.status === OrderStatus.SENT_TO_KITCHEN)
            ? OrderStatus.SENT_TO_KITCHEN
            : allItems.some((item) => item.status === OrderStatus.SENT_TO_BAR)
              ? OrderStatus.SENT_TO_BAR
              : OrderStatus.OPEN;

      const updatedOrder = await tx.order.update({
        where: {
          id: orderId
        },
        data: {
          status: orderStatus
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "ORDER_STATUS_UPDATED",
          entity: "Order",
          entityId: orderId,
          description: `${updatedOrder.orderNo} ${station === Station.BAR ? "bar" : "kitchen"} ticket marked ${nextStatus}`,
          metadata: {
            orderNo: updatedOrder.orderNo,
            station,
            status: nextStatus
          }
        }
      });

      return updatedOrder;
    });

    return NextResponse.json({ data: { id: order.id, orderNo: order.orderNo, status: order.status } });
  } catch (error) {
    if (error instanceof TicketUpdateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Ticket could not be updated." }, { status: 400 });
  }
}

/**
 * Converts submitted text into a supported order workflow status.
 */
function toOrderStatus(value: unknown) {
  if (value === OrderStatus.READY || value === OrderStatus.SERVED) {
    return value;
  }

  return null;
}

/**
 * Converts submitted text into a supported kitchen or bar station.
 */
function toStation(value: unknown) {
  if (value === "Kitchen") return Station.KITCHEN;
  if (value === "Bar") return Station.BAR;
  return null;
}

/**
 * Carries a safe staff-facing message and HTTP status when an order-ticket update cannot be completed.
 */
class TicketUpdateError extends Error {
  /**
   * Creates a ticket-update error that the API can turn into a clear response instead of a generic server error.
   */
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
