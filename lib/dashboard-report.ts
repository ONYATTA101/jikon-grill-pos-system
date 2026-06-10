import { PaymentMethod, PaymentStatus, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInventoryReport } from "@/lib/inventory-report";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  SPLIT: "Split"
};

export async function getDashboardReport() {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [sales, inventoryItems, refundsCount, discounts, stockAdjustmentsCount, latestClosing] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        cashier: {
          select: {
            name: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                costPrice: true
              }
            }
          }
        },
        payments: true
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    getInventoryReport(),
    prisma.refund.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }),
    prisma.discount.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }),
    prisma.stockMovement.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        movementType: {
          not: StockMovementType.SALE_DEDUCTION
        }
      }
    }),
    prisma.dailyClosingReport.findFirst({
      orderBy: {
        businessDate: "desc"
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

  const paidSales = sales.filter((sale) => sale.paymentStatus === PaymentStatus.PAID);
  const totalSales = paidSales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const bills = paidSales.length;
  const averageBill = bills ? Math.round(totalSales / bills) : 0;
  const discountsTotal = discounts.reduce((sum, discount) => sum + Number(discount.amount), 0);
  const lowStockItems = inventoryItems.filter((item) => item.currentStock <= item.minimumStock);

  const paymentTotals = new Map<PaymentMethod, number>();
  for (const method of Object.values(PaymentMethod)) {
    paymentTotals.set(method, 0);
  }
  for (const sale of paidSales) {
    for (const payment of sale.payments) {
      paymentTotals.set(payment.method, (paymentTotals.get(payment.method) ?? 0) + Number(payment.amount));
    }
  }

  const itemTotals = new Map<string, { quantity: number; revenue: number; profit: number }>();
  const cashierTotals = new Map<string, number>();
  for (const sale of paidSales) {
    cashierTotals.set(sale.cashier?.name ?? "Cashier", (cashierTotals.get(sale.cashier?.name ?? "Cashier") ?? 0) + Number(sale.total));

    for (const item of sale.saleItems) {
      const current = itemTotals.get(item.productName) ?? { quantity: 0, revenue: 0, profit: 0 };
      const quantity = Number(item.quantity);
      const revenue = Number(item.total);
      const cost = Number(item.product.costPrice) * quantity;
      itemTotals.set(item.productName, {
        quantity: current.quantity + quantity,
        revenue: current.revenue + revenue,
        profit: current.profit + (revenue - cost)
      });
    }
  }

  const topItems = Array.from(itemTotals.entries())
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const profitSignal = topItems.reduce((sum, item) => sum + item.profit, 0);
  const bestCashier = Array.from(cashierTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sales yet";

  return {
    businessDate: now.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
    salesSummary: {
      totalSales,
      bills,
      averageBill,
      bestCashier,
      refunds: refundsCount,
      voids: sales.filter((sale) => sale.paymentStatus === PaymentStatus.VOIDED).length,
      discounts: discountsTotal,
      stockAdjustments: stockAdjustmentsCount
    },
    paymentSummary: Array.from(paymentTotals.entries()).map(([method, amount]) => ({
      method: paymentLabels[method],
      amount
    })),
    topItems,
    lowStockItems,
    profitSignal,
    dailyClosing: latestClosing
      ? {
          closedBy: latestClosing.closedBy?.name ?? "Manager",
          expectedCash: Number(latestClosing.expectedCash),
          actualCash: Number(latestClosing.actualCash),
          variance: Number(latestClosing.cashVariance),
          notes: latestClosing.notes ?? "No closing notes."
        }
      : {
          closedBy: "Not closed",
          expectedCash: paymentTotals.get(PaymentMethod.CASH) ?? 0,
          actualCash: 0,
          variance: 0 - (paymentTotals.get(PaymentMethod.CASH) ?? 0),
          notes: "Daily closing has not been recorded yet."
        }
  };
}
