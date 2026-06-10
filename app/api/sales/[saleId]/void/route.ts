import { NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, StockMovementType } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

/**
 * Voids an eligible sale, restores its stock, and records the reason and staff member in the audit
 * log.
 */
export async function POST(request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to void sales." }, { status: 403 });
  }

  const { saleId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason?.trim() || "Sale voided";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id: saleId
        },
        include: {
          stockMovements: {
            where: {
              movementType: StockMovementType.SALE_DEDUCTION
            }
          }
        }
      });

      if (!sale) {
        throw new VoidSaleError("Sale was not found.", 404);
      }

      if (sale.paymentStatus === PaymentStatus.VOIDED || sale.voidedAt) {
        throw new VoidSaleError("Sale has already been voided.", 400);
      }

      if (sale.paymentStatus !== PaymentStatus.PAID) {
        throw new VoidSaleError("Only paid sales can be voided.", 400);
      }

      const voidedSale = await tx.sale.update({
        where: {
          id: sale.id
        },
        data: {
          paymentStatus: PaymentStatus.VOIDED,
          voidedAt: new Date()
        }
      });

      if (sale.orderId) {
        await tx.order.update({
          where: {
            id: sale.orderId
          },
          data: {
            status: OrderStatus.VOIDED
          }
        });
      }

      if (sale.tableId) {
        await tx.restaurantTable.update({
          where: {
            id: sale.tableId
          },
          data: {
            status: "available"
          }
        });
      }

      const reversals: Array<{ inventoryItemId: string; quantity: number }> = [];
      for (const movement of sale.stockMovements) {
        const reversalQuantity = Math.abs(Number(movement.quantity));
        if (reversalQuantity <= 0) continue;

        await tx.inventoryItem.update({
          where: {
            id: movement.inventoryItemId
          },
          data: {
            currentStock: {
              increment: reversalQuantity
            }
          }
        });

        await tx.stockMovement.create({
          data: {
            inventoryItemId: movement.inventoryItemId,
            movementType: StockMovementType.RETURN,
            quantity: reversalQuantity,
            reason: `Void ${sale.receiptNumber} - ${reason}`,
            saleId: sale.id,
            createdById: session.userId
          }
        });

        reversals.push({
          inventoryItemId: movement.inventoryItemId,
          quantity: reversalQuantity
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "SALE_VOIDED",
          entity: "Sale",
          entityId: sale.id,
          description: `Receipt ${sale.receiptNumber} voided: ${reason}`,
          metadata: {
            receiptNumber: sale.receiptNumber,
            reason,
            reversedStock: reversals
          }
        }
      });

      return voidedSale;
    });

    return NextResponse.json({
      data: {
        id: result.id,
        receiptNumber: result.receiptNumber,
        status: result.paymentStatus
      }
    });
  } catch (error) {
    if (error instanceof VoidSaleError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Sale could not be voided." }, { status: 400 });
  }
}

/**
 * Carries a safe staff-facing message and HTTP status when a sale cannot be voided.
 */
class VoidSaleError extends Error {
  /**
   * Creates a void-sale error that the API can return without exposing private server details.
   */
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
