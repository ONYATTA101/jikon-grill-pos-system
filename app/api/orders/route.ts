import { NextResponse } from "next/server";
import { OrderStatus, OrderType, Station } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { getNextDocumentNumber } from "@/lib/document-number";
import { prisma } from "@/lib/prisma";

type OrderRequestItem = {
  productId: string;
  quantity: number;
};

/**
 * Validates a new order, creates its kitchen or bar items, reserves its table when needed, and records
 * an audit entry.
 */
export async function POST(request: Request) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "CASHIER", "WAITER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to create orders." }, { status: 403 });
  }

  const body = await request.json();
  const items: OrderRequestItem[] = Array.isArray(body.items) ? body.items : [];
  const orderType = toOrderType(body.orderType);
  const tableNumber = parseTableNumber(body.table);

  if (!items.length) {
    return NextResponse.json({ error: "Add at least one item before sending the order." }, { status: 400 });
  }

  if (!orderType) {
    return NextResponse.json({ error: "Invalid order type." }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: items.map((item) => String(item.productId))
      },
      isActive: true
    }
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const orderItems = items.map((item) => {
    const product = productById.get(String(item.productId));
    const quantity = Number(item.quantity);

    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    return {
      product,
      quantity
    };
  });

  if (orderItems.some((item) => item === null)) {
    return NextResponse.json({ error: "One or more order items are invalid." }, { status: 400 });
  }

  const validOrderItems = orderItems.filter((item): item is NonNullable<(typeof orderItems)[number]> => Boolean(item));
  const hasKitchenItems = validOrderItems.some((item) => item.product.station === Station.KITCHEN);
  const hasBarItems = validOrderItems.some((item) => item.product.station === Station.BAR);
  const orderStatus = hasKitchenItems ? OrderStatus.SENT_TO_KITCHEN : hasBarItems ? OrderStatus.SENT_TO_BAR : OrderStatus.OPEN;
  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.userId
    }
  });
  if (!currentUser || currentUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "Your account is not active." }, { status: 403 });
  }
  const order = await prisma.$transaction(async (tx) => {
    const orderNo = await getNextDocumentNumber(tx, "ORDER");
    const table =
      orderType === OrderType.TABLE && tableNumber
        ? await tx.restaurantTable.upsert({
            where: {
              number: tableNumber
            },
            update: {
              status: "ordered"
            },
            create: {
              number: tableNumber,
              seats: 4,
              status: "ordered"
            }
          })
        : null;

    const createdOrder = await tx.order.create({
      data: {
        orderNo,
        type: orderType,
        status: orderStatus,
        tableId: table?.id,
        waiterId: currentUser.id,
        items: {
          create: validOrderItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            status: item.product.station === Station.KITCHEN ? OrderStatus.SENT_TO_KITCHEN : item.product.station === Station.BAR ? OrderStatus.SENT_TO_BAR : OrderStatus.OPEN
          }))
        }
      }
    });

    await tx.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "ORDER_SENT",
        entity: "Order",
        entityId: createdOrder.id,
        description: `${orderNo} sent to ${hasKitchenItems && hasBarItems ? "kitchen and bar" : hasKitchenItems ? "kitchen" : hasBarItems ? "bar" : "orders"}`,
        metadata: {
          orderNo,
          orderType,
          table: body.table,
          items: validOrderItems.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            station: item.product.station
          }))
        }
      }
    });

    return createdOrder;
  });

  return NextResponse.json(
    {
      data: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status
      }
    },
    { status: 201 }
  );
}

/**
 * Converts submitted text into one of the supported dine-in or takeaway order types.
 */
function toOrderType(value: unknown) {
  const map: Record<string, OrderType> = {
    Table: OrderType.TABLE,
    Takeaway: OrderType.TAKEAWAY,
    Delivery: OrderType.DELIVERY
  };

  return typeof value === "string" ? map[value] : null;
}

/**
 * Validates an optional submitted table number and converts it into a database-ready value.
 */
function parseTableNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^Table\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}
