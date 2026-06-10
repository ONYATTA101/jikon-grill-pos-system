import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { RequestRefundButton } from "@/components/request-refund-button";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const paymentLabels: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  SPLIT: "Split"
};

export default async function ReceiptPage({ params }: { params: Promise<{ receiptNumber: string }> }) {
  const { receiptNumber } = await params;
  const settings = await getRestaurantSettings();
  const sale = await prisma.sale.findUnique({
    where: {
      receiptNumber
    },
    include: {
      saleItems: true,
      payments: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!sale) {
    notFound();
  }

  const payment = sale.payments[0];

  return (
    <AppShell role="CASHIER">
      <PageHeader
        eyebrow="Receipt"
        title={receiptNumber}
        description="Receipt preview for thermal printer or digital sending."
        actions={
          <div className="flex gap-2">
            <Link href="/pos" className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              POS
            </Link>
            <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
            {sale.paymentStatus === "PAID" ? <RequestRefundButton saleId={sale.id} receipt={sale.receiptNumber} total={Number(sale.total)} /> : null}
          </div>
        }
      />

      <section className="mx-auto mt-5 max-w-md rounded-md border border-zinc-200 bg-white p-5 font-mono shadow-panel">
        <div className="text-center">
          <p className="text-lg font-black uppercase">{settings.restaurantName}</p>
          <p className="mt-1 text-xs text-zinc-500">{settings.receiptSubtitle}</p>
          {settings.address ? <p className="mt-1 text-xs text-zinc-500">{settings.address}</p> : null}
          {settings.phone ? <p className="mt-1 text-xs text-zinc-500">{settings.phone}</p> : null}
          <p className="mt-1 text-xs text-zinc-500">Receipt: {receiptNumber}</p>
          <p className="mt-1 text-xs text-zinc-500">{sale.createdAt.toLocaleString("en-KE")}</p>
        </div>

        <div className="mt-5 border-y border-dashed border-zinc-300 py-3">
          {sale.saleItems.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 py-1 text-sm">
              <span>
                {Number(item.quantity)} x {item.productName}
              </span>
              <span>{money(Number(item.total))}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(Number(sale.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{money(Number(sale.discount))}</span>
          </div>
          <div className="flex justify-between">
            <span>Service</span>
            <span>{money(Number(sale.serviceCharge))}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT/Tax</span>
            <span>{money(Number(sale.tax))}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-black">
            <span>Total</span>
            <span>{money(Number(sale.total))}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span>{payment ? paymentLabels[payment.method] : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span>{sale.paymentStatus}</span>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-500">{settings.receiptFooter}</p>
      </section>
    </AppShell>
  );
}
