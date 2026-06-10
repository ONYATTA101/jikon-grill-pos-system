import { NextResponse } from "next/server";
import { ApprovalStatus, PaymentStatus } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ refundId: string }> }) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to approve refunds." }, { status: 403 });
  }

  const { refundId } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const nextStatus = toApprovalStatus(body.status);
  if (!nextStatus) {
    return NextResponse.json({ error: "Refund status must be APPROVED or REJECTED." }, { status: 400 });
  }

  try {
    const refund = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: {
          id: refundId
        },
        include: {
          sale: {
            include: {
              refunds: true
            }
          }
        }
      });

      if (!refund) {
        throw new RefundApprovalError("Refund was not found.", 404);
      }

      if (refund.status !== ApprovalStatus.PENDING) {
        throw new RefundApprovalError("Only pending refunds can be updated.", 400);
      }

      if (refund.sale.paymentStatus === PaymentStatus.VOIDED || refund.sale.voidedAt) {
        throw new RefundApprovalError("Refunds cannot be approved for voided sales.", 400);
      }

      const updatedRefund = await tx.refund.update({
        where: {
          id: refund.id
        },
        data: {
          status: nextStatus,
          approvedById: session.userId
        }
      });

      if (nextStatus === ApprovalStatus.APPROVED) {
        const approvedTotal =
          refund.sale.refunds
            .filter((item) => item.id !== refund.id && item.status === ApprovalStatus.APPROVED)
            .reduce((sum, item) => sum + Number(item.amount), 0) + Number(refund.amount);

        if (approvedTotal >= Number(refund.sale.total)) {
          await tx.sale.update({
            where: {
              id: refund.saleId
            },
            data: {
              paymentStatus: PaymentStatus.REFUNDED
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: nextStatus === ApprovalStatus.APPROVED ? "REFUND_APPROVED" : "REFUND_REJECTED",
          entity: "Refund",
          entityId: refund.id,
          description: `${nextStatus === ApprovalStatus.APPROVED ? "Approved" : "Rejected"} refund for ${refund.sale.receiptNumber}: KSh ${Number(refund.amount).toLocaleString("en-KE")}`,
          metadata: {
            saleId: refund.saleId,
            receiptNumber: refund.sale.receiptNumber,
            amount: Number(refund.amount),
            reason: refund.reason,
            status: nextStatus
          }
        }
      });

      return updatedRefund;
    });

    return NextResponse.json({ data: { id: refund.id, status: refund.status } });
  } catch (error) {
    if (error instanceof RefundApprovalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Refund could not be updated." }, { status: 400 });
  }
}

function toApprovalStatus(value: unknown) {
  if (value === ApprovalStatus.APPROVED || value === ApprovalStatus.REJECTED) {
    return value;
  }

  return null;
}

class RefundApprovalError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
