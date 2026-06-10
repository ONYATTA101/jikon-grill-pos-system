import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  SPLIT: "Split"
};

export async function getClosingPreview() {
  const now = new Date();
  const businessDate = getBusinessDate(now);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [sales, existingClosing] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        paymentStatus: PaymentStatus.PAID
      },
      include: {
        payments: true
      }
    }),
    prisma.dailyClosingReport.findUnique({
      where: {
        businessDate
      },
      include: {
        closedBy: {
          select: {
            name: true
          }
        }
      }
    })
  ]);

  const paymentBreakdown = Object.fromEntries(Object.values(PaymentMethod).map((method) => [paymentLabels[method], 0]));
  let totalSales = 0;

  for (const sale of sales) {
    totalSales += Number(sale.total);
    for (const payment of sale.payments) {
      paymentBreakdown[paymentLabels[payment.method]] += Number(payment.amount);
    }
  }

  const expectedCash = paymentBreakdown.Cash ?? 0;

  return {
    businessDate,
    businessDateLabel: businessDate.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
    totalSales,
    totalBills: sales.length,
    expectedCash,
    paymentBreakdown,
    existingClosing: existingClosing
      ? {
          id: existingClosing.id,
          closedBy: existingClosing.closedBy?.name ?? "Manager",
          actualCash: Number(existingClosing.actualCash),
          cashVariance: Number(existingClosing.cashVariance),
          notes: existingClosing.notes ?? ""
        }
      : null
  };
}

export function getBusinessDate(value = new Date()) {
  const businessDate = new Date(value);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}
