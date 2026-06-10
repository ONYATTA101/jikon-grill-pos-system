import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  SPLIT: "Split"
};

const statusLabels: Record<PaymentStatus, "Paid" | "Unpaid" | "Refunded" | "Voided"> = {
  UNPAID: "Unpaid",
  PARTIAL: "Unpaid",
  PAID: "Paid",
  REFUNDED: "Refunded",
  VOIDED: "Voided"
};

/**
 * Loads completed sales with their payments and staff details for sales-history screens and exports.
 */
export async function getSalesHistory() {
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
          createdAt: "asc"
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return sales.map((sale) => ({
    id: sale.id,
    receipt: sale.receiptNumber,
    time: sale.createdAt.toLocaleString("en-KE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }),
    table: sale.table ? `Table ${sale.table.number}` : "Takeaway",
    cashier: sale.cashier?.name ?? "Cashier",
    paymentMethod: sale.payments[0] ? paymentLabels[sale.payments[0].method] : "-",
    total: Number(sale.total),
    status: statusLabels[sale.paymentStatus]
  }));
}

/**
 * Calculates revenue, estimated cost, and profit figures for the owner's profit report.
 */
export async function getProfitRows() {
  const saleItems = await prisma.saleItem.findMany({
    include: {
      product: {
        select: {
          sellingPrice: true,
          costPrice: true
        }
      },
      sale: {
        select: {
          paymentStatus: true
        }
      }
    }
  });

  const rows = new Map<
    string,
    {
      name: string;
      sellingPrice: number;
      cost: number;
      quantitySold: number;
      revenue: number;
      totalCost: number;
    }
  >();

  for (const item of saleItems) {
    if (item.sale.paymentStatus !== PaymentStatus.PAID) continue;

    const quantity = Number(item.quantity);
    const sellingPrice = Number(item.unitPrice);
    const cost = Number(item.product.costPrice);
    const current = rows.get(item.productName) ?? {
      name: item.productName,
      sellingPrice,
      cost,
      quantitySold: 0,
      revenue: 0,
      totalCost: 0
    };

    rows.set(item.productName, {
      ...current,
      quantitySold: current.quantitySold + quantity,
      revenue: current.revenue + Number(item.total),
      totalCost: current.totalCost + cost * quantity
    });
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      grossProfit: row.sellingPrice - row.cost,
      totalProfit: row.revenue - row.totalCost
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}
