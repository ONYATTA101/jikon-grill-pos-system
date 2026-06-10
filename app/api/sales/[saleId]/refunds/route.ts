import { NextResponse } from "next/server";
import { ApprovalStatus, PaymentStatus } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "CASHIER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to request refunds." }, { status: 403 });
  }

  const { saleId } = await params;
  const body = (await request.json().catch(() => ({}))) as { amount?: number | string; reason?: string };
  const amount = Number(body.amount);
  const reason = body.reason?.trim() ?? "";

  if (!Number.isFinite(amount) || amount <= 0 || !reason) {
    return NextResponse.json({ error: "Refund amount and reason are required." }, { status: 400 });
  }

  try {
    const refund = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: {
          id: saleId
        },
        include: {
          refunds: {
            where: {
              status: {
                in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED]
              }
            }
          }
        }
      });

      if (!sale) {
        throw new RefundError("Sale was not found.", 404);
      }

      if (sale.paymentStatus === PaymentStatus.VOIDED || sale.voidedAt) {
        throw new RefundError("Voided sales cannot be refunded.", 400);
      }

      if (sale.paymentStatus === PaymentStatus.REFUNDED) {
        throw new RefundError("Sale has already been fully refunded.", 400);
      }

      if (sale.paymentStatus !== PaymentStatus.PAID) {
        throw new RefundError("Only paid sales can be refunded.", 400);
      }

      const alreadyRequested = sale.refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
      const refundable = Number(sale.total) - alreadyRequested;
      if (amount > refundable) {
        throw new RefundError(`Refund amount cannot exceed KSh ${refundable.toLocaleString("en-KE")}.`, 400);
      }

      const refund = await tx.refund.create({
        data: {
          saleId: sale.id,
          amount,
          reason,
          requestedById: session.userId
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "REFUND_REQUESTED",
          entity: "Refund",
          entityId: refund.id,
          description: `Refund requested for ${sale.receiptNumber}: KSh ${amount.toLocaleString("en-KE")}`,
          metadata: {
            saleId: sale.id,
            receiptNumber: sale.receiptNumber,
            amount,
            reason
          }
        }
      });

      return refund;
    });

    return NextResponse.json({ data: { id: refund.id, status: refund.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Refund request could not be created." }, { status: 400 });
  }
}

class RefundError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
