import { NextResponse } from "next/server";
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus, StockMovementType, StockTrackingType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { getNextDocumentNumber } from "@/lib/document-number";
import { prisma } from "@/lib/prisma";

type SaleRequestItem = {
  productId: string;
  quantity: number;
};

type ProductForSale = Prisma.ProductGetPayload<{
  include: {
    recipeItems: {
      include: {
        inventoryItem: true;
      };
    };
  };
}>;

type ExistingOrderForSale = Prisma.OrderGetPayload<{
  include: {
    sale: true;
    table: true;
    items: {
      include: {
        product: {
          include: {
            recipeItems: {
              include: {
                inventoryItem: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type ValidSaleItem = {
  product: ProductForSale;
  quantity: number;
  unitPrice: number;
  total: number;
};

type SaleWithPayment = Prisma.SaleGetPayload<{
  include: {
    payments: true;
    saleItems: true;
  };
}>;

type SaleRequest = {
  items: SaleRequestItem[];
  discount: number;
  serviceCharge: number;
  tax: number;
  paymentMethod: PaymentMethod;
  orderType: OrderType;
  existingOrderId: string | null;
  tableNumber: number | null;
  reference: string | null;
};

/**
 * Returns recent completed sales for authorized staff and owner screens.
 */
export async function GET() {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "CASHIER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to view sales." }, { status: 403 });
  }

  const sales = await prisma.sale.findMany({
    include: {
      cashier: {
        select: {
          name: true
        }
      },
      table: {
        select: {
          number: true
        }
      },
      payments: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  return NextResponse.json({
    data: sales.map((sale) => ({
      receipt: sale.receiptNumber,
      time: sale.createdAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      table: sale.table ? `Table ${sale.table.number}` : "Takeaway",
      cashier: sale.cashier?.name ?? "Cashier",
      total: Number(sale.total),
      paymentMethod: sale.payments[0]?.method ?? "CASH",
      status: sale.paymentStatus
    }))
  });
}

/**
 * Validates a bill, completes its payment inside one database transaction, deducts stock, and returns
 * the receipt details.
 */
export async function POST(request: Request) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "CASHIER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to create sales." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const saleRequest = parseSaleRequest(body);
    if (saleRequest.discount > 0 && session.role !== "OWNER" && session.role !== "MANAGER") {
      throw new SaleError("Only an owner or manager can apply a discount.", 403);
    }

    const cashier = await getActiveCashier(session.userId);
    const { existingOrder, saleItems } = await getPayableSaleItems(saleRequest);
    const totals = getSaleTotals(saleItems, saleRequest);

    const sale = await prisma.$transaction((tx) =>
      createPaidSale(tx, {
        saleRequest,
        cashierId: cashier.id,
        existingOrder,
        saleItems,
        totals
      })
    );

    return NextResponse.json({ data: toSaleResponse(sale) }, { status: 201 });
  } catch (error) {
    const { message, status } = toErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Converts the submitted payment request into a validated internal sale request.
 */
function parseSaleRequest(body: Record<string, unknown>): SaleRequest {
  const items: SaleRequestItem[] = Array.isArray(body.items) ? body.items : [];
  const existingOrderId = typeof body.orderId === "string" && body.orderId ? body.orderId : null;
  const paymentMethod = toPaymentMethod(body.paymentMethod);
  const orderType = toOrderType(body.orderType);

  if (!existingOrderId && !items.length) {
    throw new SaleError("Add at least one item before payment.", 400);
  }

  if (!paymentMethod || !orderType) {
    throw new SaleError("Invalid order type or payment method.", 400);
  }

  return {
    items,
    existingOrderId,
    paymentMethod,
    orderType,
    discount: Math.max(Number(body.discount ?? 0), 0),
    serviceCharge: Math.max(Number(body.serviceCharge ?? 0), 0),
    tax: Math.max(Number(body.tax ?? 0), 0),
    tableNumber: parseTableNumber(body.table),
    reference: typeof body.reference === "string" ? body.reference : null
  };
}

/**
 * Confirms that the staff member taking payment still has an active cashier account.
 */
async function getActiveCashier(userId: string) {
  const cashier = await prisma.user.findUnique({
    where: {
      id: userId
    }
  });

  if (!cashier || cashier.status !== "ACTIVE") {
    throw new SaleError("Your account is not active.", 403);
  }

  return cashier;
}

/**
 * Loads and validates the products that can be charged for an existing order or a direct POS sale.
 */
async function getPayableSaleItems(saleRequest: SaleRequest) {
  if (saleRequest.existingOrderId) {
    return getExistingOrderSaleItems(saleRequest.existingOrderId);
  }

  return {
    existingOrder: null,
    saleItems: await getDirectSaleItems(saleRequest.items)
  };
}

/**
 * Loads an unpaid order and converts its items into sale lines ready for payment.
 */
async function getExistingOrderSaleItems(existingOrderId: string) {
  const existingOrder = await prisma.order.findUnique({
    where: {
      id: existingOrderId
    },
    include: {
      sale: true,
      table: true,
      items: {
        include: {
          product: {
            include: {
              recipeItems: {
                include: {
                  inventoryItem: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!existingOrder) {
    throw new SaleError("Order was not found.", 404);
  }

  if (existingOrder.sale) {
    throw new SaleError("This order has already been paid.", 400);
  }

  return {
    existingOrder,
    saleItems: existingOrder.items.map((item) => toValidSaleItem(item.product, Number(item.quantity)))
  };
}

/**
 * Validates products selected directly in the POS and converts them into sale lines.
 */
async function getDirectSaleItems(items: SaleRequestItem[]) {
  const productIds = items.map((item) => String(item.productId));
  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds
      },
      isActive: true
    },
    include: {
      recipeItems: {
        include: {
          inventoryItem: true
        }
      }
    }
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const saleItems = items.map((item) => {
    const product = productById.get(String(item.productId));
    const quantity = Number(item.quantity);

    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return null;
    }

    return toValidSaleItem(product, quantity);
  });

  if (saleItems.some((item) => item === null)) {
    throw new SaleError("One or more cart items are invalid.", 400);
  }

  return saleItems.filter((item): item is ValidSaleItem => Boolean(item));
}

/**
 * Converts a product and quantity into the complete pricing and cost information required for a sale
 * line.
 */
function toValidSaleItem(product: ProductForSale, quantity: number): ValidSaleItem {
  const unitPrice = Number(product.sellingPrice);

  return {
    product,
    quantity,
    unitPrice,
    total: unitPrice * quantity
  };
}

/**
 * Calculates subtotal, discount, tax, service charge, and final total for a sale.
 */
function getSaleTotals(saleItems: ValidSaleItem[], saleRequest: SaleRequest) {
  if (!saleItems.length) {
    throw new SaleError("No payable items were found.", 400);
  }

  const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);

  return {
    subtotal,
    discount: saleRequest.discount,
    tax: saleRequest.tax,
    serviceCharge: saleRequest.serviceCharge,
    total: Math.max(subtotal - saleRequest.discount + saleRequest.serviceCharge + saleRequest.tax, 0)
  };
}

/**
 * Completes all database work for a paid sale as one transaction so partial sales cannot be saved.
 */
async function createPaidSale(
  tx: Prisma.TransactionClient,
  {
    saleRequest,
    cashierId,
    existingOrder,
    saleItems,
    totals
  }: {
    saleRequest: SaleRequest;
    cashierId: string;
    existingOrder: ExistingOrderForSale | null;
    saleItems: ValidSaleItem[];
    totals: ReturnType<typeof getSaleTotals>;
  }
) {
  const receiptNumber = await getNextDocumentNumber(tx, "RECEIPT");
  const tableNumber = existingOrder?.table?.number ?? saleRequest.tableNumber;
  const table = await getOrCreatePaidTable(tx, saleRequest.orderType, tableNumber);
  const order = await getOrCreatePaidOrder(tx, {
    saleRequest,
    existingOrder,
    tableId: table?.id,
    saleItems
  });
  const sale = await createSaleRecord(tx, {
    receiptNumber,
    orderId: order.id,
    tableId: table?.id,
    cashierId,
    saleRequest,
    saleItems,
    totals
  });

  await deductStockForSale(tx, {
    saleItems,
    saleId: sale.id,
    receiptNumber,
    cashierId
  });

  await createSaleAuditLog(tx, {
    cashierId,
    saleId: sale.id,
    receiptNumber,
    orderNo: order.orderNo,
    existingOrderId: saleRequest.existingOrderId,
    paymentMethod: saleRequest.paymentMethod,
    saleItems,
    totals
  });

  return sale;
}

/**
 * Finds or creates the table record needed for a paid dine-in sale.
 */
async function getOrCreatePaidTable(tx: Prisma.TransactionClient, orderType: OrderType, tableNumber: number | null) {
  if (orderType !== OrderType.TABLE || !tableNumber) return null;

  return tx.restaurantTable.upsert({
    where: {
      number: tableNumber
    },
    update: {
      status: "paid"
    },
    create: {
      number: tableNumber,
      seats: 4,
      status: "paid"
    }
  });
}

/**
 * Uses an existing order or creates a completed order to connect the payment with its ordered items.
 */
async function getOrCreatePaidOrder(
  tx: Prisma.TransactionClient,
  {
    saleRequest,
    existingOrder,
    tableId,
    saleItems
  }: {
    saleRequest: SaleRequest;
    existingOrder: ExistingOrderForSale | null;
    tableId?: string;
    saleItems: ValidSaleItem[];
  }
) {
  if (saleRequest.existingOrderId) {
    const order = await tx.order.update({
      where: {
        id: saleRequest.existingOrderId
      },
      data: {
        status: OrderStatus.PAID,
        tableId: tableId ?? existingOrder?.tableId
      }
    });

    await tx.orderItem.updateMany({
      where: {
        orderId: saleRequest.existingOrderId
      },
      data: {
        status: OrderStatus.PAID
      }
    });

    return order;
  }

  return tx.order.create({
    data: {
      orderNo: await getNextDocumentNumber(tx, "ORDER"),
      type: saleRequest.orderType,
      status: OrderStatus.PAID,
      tableId,
      items: {
        create: saleItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          status: OrderStatus.PAID
        }))
      }
    }
  });
}

/**
 * Creates the permanent sale, line items, and payment records and assigns the next receipt number.
 */
async function createSaleRecord(
  tx: Prisma.TransactionClient,
  {
    receiptNumber,
    orderId,
    tableId,
    cashierId,
    saleRequest,
    saleItems,
    totals
  }: {
    receiptNumber: string;
    orderId: string;
    tableId?: string;
    cashierId: string;
    saleRequest: SaleRequest;
    saleItems: ValidSaleItem[];
    totals: ReturnType<typeof getSaleTotals>;
  }
) {
  return tx.sale.create({
    data: {
      receiptNumber,
      orderId,
      tableId,
      cashierId,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      serviceCharge: totals.serviceCharge,
      total: totals.total,
      paymentStatus: PaymentStatus.PAID,
      saleItems: {
        create: saleItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }))
      },
      payments: {
        create: {
          method: saleRequest.paymentMethod,
          amount: totals.total,
          reference: saleRequest.reference
        }
      }
    },
    include: {
      payments: true,
      saleItems: true
    }
  });
}

/**
 * Deducts ingredients and tracked products from inventory after a sale and records each stock
 * movement.
 */
async function deductStockForSale(
  tx: Prisma.TransactionClient,
  {
    saleItems,
    saleId,
    receiptNumber,
    cashierId
  }: {
    saleItems: ValidSaleItem[];
    saleId: string;
    receiptNumber: string;
    cashierId: string;
  }
) {
  const deductions = await getStockDeductions(tx, saleItems);
  const currentInventory = await tx.inventoryItem.findMany({
    where: {
      id: {
        in: Array.from(deductions.keys())
      }
    }
  });
  const currentInventoryById = new Map(currentInventory.map((item) => [item.id, item]));

  for (const [inventoryItemId, deduction] of deductions) {
    const inventoryItem = currentInventoryById.get(inventoryItemId);
    if (!inventoryItem || Number(inventoryItem.currentStock) < deduction.quantity) {
      throw new SaleError(`Not enough stock for ${deduction.name}.`, 400);
    }

    await tx.inventoryItem.update({
      where: {
        id: inventoryItemId
      },
      data: {
        currentStock: {
          decrement: deduction.quantity
        }
      }
    });

    await tx.stockMovement.create({
      data: {
        inventoryItemId,
        movementType: StockMovementType.SALE_DEDUCTION,
        quantity: -deduction.quantity,
        reason: `Receipt ${receiptNumber} - ${deduction.reason}`,
        saleId,
        createdById: cashierId
      }
    });
  }
}

/**
 * Combines all ingredient and direct-product quantities that must be removed from stock for a sale.
 */
async function getStockDeductions(tx: Prisma.TransactionClient, saleItems: ValidSaleItem[]) {
  const deductions = new Map<string, { name: string; quantity: number; reason: string }>();

  /**
   * Adds a required stock deduction to the running total for an inventory item.
   */
  function addDeduction(inventoryItemId: string, name: string, quantity: number, reason: string) {
    const existing = deductions.get(inventoryItemId);
    deductions.set(inventoryItemId, {
      name,
      quantity: (existing?.quantity ?? 0) + quantity,
      reason: existing ? `${existing.reason}, ${reason}` : reason
    });
  }

  for (const item of saleItems) {
    if (item.product.stockTrackingType === StockTrackingType.NONE) {
      continue;
    }

    if (item.product.stockTrackingType === StockTrackingType.DIRECT) {
      const inventoryItem = await tx.inventoryItem.findUnique({
        where: {
          name: item.product.name
        }
      });

      if (!inventoryItem) {
        throw new SaleError(`Inventory item not found for ${item.product.name}.`, 400);
      }

      addDeduction(inventoryItem.id, inventoryItem.name, item.quantity, item.product.name);
    }

    if (item.product.stockTrackingType === StockTrackingType.RECIPE) {
      for (const recipeItem of item.product.recipeItems) {
        const deduction = Number(recipeItem.quantity) * item.quantity;
        addDeduction(recipeItem.inventoryItemId, recipeItem.inventoryItem.name, deduction, item.product.name);
      }
    }
  }

  return deductions;
}

/**
 * Records the completed sale in the audit log with enough detail for later review.
 */
async function createSaleAuditLog(
  tx: Prisma.TransactionClient,
  {
    cashierId,
    saleId,
    receiptNumber,
    orderNo,
    existingOrderId,
    paymentMethod,
    saleItems,
    totals
  }: {
    cashierId: string;
    saleId: string;
    receiptNumber: string;
    orderNo: string;
    existingOrderId: string | null;
    paymentMethod: PaymentMethod;
    saleItems: ValidSaleItem[];
    totals: ReturnType<typeof getSaleTotals>;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: cashierId,
      action: "SALE_PAID",
      entity: "Sale",
      entityId: saleId,
      description: `Receipt ${receiptNumber} paid by ${paymentMethod} for KSh ${totals.total.toLocaleString("en-KE")}`,
      metadata: {
        receiptNumber,
        orderNo,
        existingOrderId,
        paymentMethod,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        serviceCharge: totals.serviceCharge,
        items: saleItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          total: item.total
        }))
      }
    }
  });
}

/**
 * Converts the saved database sale into the concise receipt information returned to the POS.
 */
function toSaleResponse(sale: SaleWithPayment) {
  return {
    id: sale.id,
    receiptNumber: sale.receiptNumber,
    status: "Paid",
    subtotal: Number(sale.subtotal),
    tax: Number(sale.tax),
    discount: Number(sale.discount),
    serviceCharge: Number(sale.serviceCharge),
    total: Number(sale.total),
    paymentMethod: sale.payments[0]?.method
  };
}

/**
 * Turns known sale-processing errors into useful HTTP responses without exposing private server
 * details.
 */
function toErrorResponse(error: unknown) {
  if (error instanceof SaleError) {
    return {
      message: error.message,
      status: error.status
    };
  }

  return {
    message: error instanceof Error ? error.message : "Sale could not be completed.",
    status: 400
  };
}

/**
 * Converts submitted text into one of the payment methods supported by the POS.
 */
function toPaymentMethod(value: unknown) {
  const map: Record<string, PaymentMethod> = {
    Cash: PaymentMethod.CASH,
    "M-Pesa": PaymentMethod.MPESA,
    Card: PaymentMethod.CARD,
    Bank: PaymentMethod.BANK,
    Split: PaymentMethod.SPLIT
  };

  return typeof value === "string" ? map[value] : null;
}

/**
 * Converts submitted text into one of the order types supported by the POS.
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
 * Validates an optional sale table number and converts it into a database-ready value.
 */
function parseTableNumber(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/^Table\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

/**
 * Carries a safe staff-facing message and HTTP status when payment or sale processing cannot continue.
 */
class SaleError extends Error {
  /**
   * Creates a sale-processing error that the API can return without exposing private server details.
   */
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
