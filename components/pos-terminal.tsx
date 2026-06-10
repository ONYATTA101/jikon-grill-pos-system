"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  Landmark,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Table2,
  Trash2,
  Truck,
  Utensils
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FeedbackBanner } from "@/components/feedback-banner";
import { StatusPill } from "@/components/status-pill";
import { money } from "@/lib/format";
import type { CartLine, PaymentMethod, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const paymentMethods: Array<{ label: PaymentMethod; icon: LucideIcon }> = [
  { label: "Cash", icon: Banknote },
  { label: "M-Pesa", icon: Smartphone },
  { label: "Card", icon: CreditCard },
  { label: "Bank", icon: Landmark },
  { label: "Split", icon: CreditCard }
];

const orderTypes: Array<{ label: "Table" | "Takeaway" | "Delivery"; icon: LucideIcon }> = [
  { label: "Table", icon: Table2 },
  { label: "Takeaway", icon: ShoppingBag },
  { label: "Delivery", icon: Truck }
];

/**
 * Chooses the visual color treatment used to identify a product's preparation station.
 */
function stationTone(station: Product["station"]) {
  if (station === "Kitchen") {
    return {
      tile: "from-white via-white to-amber-50",
      chip: "bg-amber-100 text-amber-900",
      rail: "bg-ember-600"
    };
  }

  if (station === "Bar") {
    return {
      tile: "from-white via-white to-sky-50",
      chip: "bg-sky-100 text-sky-900",
      rail: "bg-sky-600"
    };
  }

  return {
    tile: "from-white via-white to-zinc-50",
    chip: "bg-zinc-100 text-zinc-600",
    rail: "bg-zinc-400"
  };
}

/**
 * Renders the reusable pos terminal section of the user interface from the information supplied by its
 * parent screen.
 */
export function PosTerminal({
  categories,
  products,
  taxRate = 16,
  defaultServiceCharge = 0,
  canPay = true,
  canDiscount = false
}: {
  categories: string[];
  products: Product[];
  taxRate?: number;
  defaultServiceCharge?: number;
  canPay?: boolean;
  canDiscount?: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [table, setTable] = useState("Table 1");
  const [orderType, setOrderType] = useState<"Table" | "Takeaway" | "Delivery">("Table");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("M-Pesa");
  const [discount, setDiscount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(defaultServiceCharge);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [billStatus, setBillStatus] = useState<"Unpaid" | "Paid">("Unpaid");
  const [lastAction, setLastAction] = useState("Ready for service");
  const [actionStatus, setActionStatus] = useState<"success" | "error" | "info">("info");
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const visibleProducts = products.filter(
    (product) =>
      product.active &&
      (category === "All" || product.category === category) &&
      product.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      if (!product.active) return;
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    });
    return counts;
  }, [products]);
  const selectedProductIds = useMemo(() => new Set(cart.map((line) => line.productId)), [cart]);
  const lines = cart
    .map((line) => ({ ...line, product: productById.get(line.productId) }))
    .filter((line): line is CartLine & { product: Product } => Boolean(line.product));

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const tax = taxEnabled ? Math.round(subtotal * (taxRate / 100)) : 0;
  const total = Math.max(subtotal - discount + serviceCharge + tax, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const activeProductCount = products.filter((product) => product.active).length;
  const isPaid = billStatus === "Paid";

  /**
   * Adds a selected product to the current bill, or increases its quantity when it is already present.
   */
  function addProduct(productId: string) {
    if (isPaid) {
      setLastAction("This bill is paid. Start a new bill to continue.");
      setActionStatus("info");
      return;
    }

    if (orderId) {
      setLastAction("Order already sent. Pay it or start a new bill.");
      setActionStatus("info");
      return;
    }

    setBillStatus("Unpaid");
    setReceiptNumber(null);
    setLastAction("Item added to bill");
    setActionStatus("info");
    setCart((current) => {
      const exists = current.find((line) => line.productId === productId);
      if (exists) {
        return current.map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { productId, quantity: 1 }];
    });
  }

  /**
   * Changes an item's quantity on the current bill while preventing invalid quantities.
   */
  function updateQuantity(productId: string, delta: number) {
    if (isPaid) {
      setLastAction("This bill is paid. Start a new bill to continue.");
      setActionStatus("info");
      return;
    }

    if (orderId) {
      setLastAction("Order already sent. Pay it or start a new bill.");
      setActionStatus("info");
      return;
    }

    setBillStatus("Unpaid");
    setReceiptNumber(null);
    setActionStatus("info");
    setCart((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, quantity: Math.max(line.quantity + delta, 0) } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  /**
   * Removes one product completely from the current bill.
   */
  function removeProduct(productId: string) {
    if (isPaid) {
      setLastAction("This bill is paid. Start a new bill to continue.");
      setActionStatus("info");
      return;
    }

    if (orderId) {
      setLastAction("Order already sent. Pay it or start a new bill.");
      setActionStatus("info");
      return;
    }

    setBillStatus("Unpaid");
    setReceiptNumber(null);
    setActionStatus("info");
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  /**
   * Clears the current bill and restores the POS controls to their starting state.
   */
  function resetBill() {
    setCart([]);
    setDiscount(0);
    setServiceCharge(defaultServiceCharge);
    setTaxEnabled(false);
    setBillStatus("Unpaid");
    setReceiptNumber(null);
    setOrderId(null);
    setLastAction("New bill started");
    setActionStatus("info");
  }

  /**
   * Sends the current bill to the sales API for payment, then opens the completed receipt.
   */
  async function payBill() {
    if (!lines.length || isPaying || isPaid || !canPay) return;

    setIsPaying(true);
    setLastAction("Recording payment...");
    setActionStatus("info");

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          table,
          orderType,
          paymentMethod,
          discount,
          serviceCharge,
          tax,
          orderId,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
          }))
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Payment could not be recorded.");
      }

      setBillStatus("Paid");
      setReceiptNumber(payload.data.receiptNumber);
      setLastAction(`${paymentMethod} payment recorded. Receipt ${payload.data.receiptNumber} is ready.`);
      setActionStatus("success");
      router.refresh();
    } catch (error) {
      setLastAction(error instanceof Error ? error.message : "Payment could not be recorded.");
      setActionStatus("error");
    } finally {
      setIsPaying(false);
    }
  }

  /**
   * Sends the current dine-in or takeaway bill to the preparation workflow without taking payment yet.
   */
  async function sendOrder() {
    if (!lines.length || isSending) return;

    setIsSending(true);
    setLastAction("Sending order...");
    setActionStatus("info");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          table,
          orderType,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity
          }))
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Order could not be sent.");
      }

      setOrderId(payload.data.id);
      setLastAction(`${payload.data.orderNo} sent to kitchen/bar successfully.`);
      setActionStatus("success");
      router.refresh();
    } catch (error) {
      setLastAction(error instanceof Error ? error.message : "Order could not be sent.");
      setActionStatus("error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section className="overflow-hidden rounded-md border border-zinc-200 bg-white/95 shadow-panel backdrop-blur">
        <div className="border-b border-zinc-200 bg-charcoal-900 p-4 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100">Service terminal</p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <h2 className="text-2xl font-black tracking-normal">Menu</h2>
                <span className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-bold text-zinc-200">
                  {activeProductCount} active items
                </span>
              </div>
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu"
                className="h-11 w-full rounded-md border border-white/15 bg-white pl-10 pr-3 text-sm font-semibold text-zinc-950 outline-none focus:border-amber-200"
              />
            </label>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "flex h-11 shrink-0 items-center rounded-md border px-3 text-sm font-bold transition",
                    category === item ? "border-charcoal-900 bg-charcoal-900 text-white shadow-lg shadow-zinc-950/15" : "border-zinc-200 bg-white text-zinc-700 hover:border-ember-600"
                  )}
                >
                  {item}
                  <span className={cn("ml-2 rounded-md px-1.5 py-0.5 text-xs", category === item ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500")}>
                    {item === "All" ? activeProductCount : categoryCounts.get(item) ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-1">
              {orderTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.label}
                    type="button"
                    onClick={() => setOrderType(type.label)}
                    disabled={Boolean(orderId) || isPaid}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                      orderType === type.label ? "bg-ember-600 text-white shadow-sm" : "text-zinc-700 hover:bg-white"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid auto-rows-[156px] gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {!visibleProducts.length ? (
              <div className="col-span-full grid min-h-40 place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                <div>
                  <Utensils className="mx-auto h-8 w-8 text-zinc-400" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-zinc-600">No active products found</p>
                </div>
              </div>
            ) : null}
            {visibleProducts.map((product) => {
              const tone = stationTone(product.station);
              const inBill = selectedProductIds.has(product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product.id)}
                  disabled={Boolean(orderId) || isPaid}
                  className={cn(
                    "group relative flex h-full flex-col justify-between overflow-hidden rounded-md border border-zinc-200 bg-gradient-to-br p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ember-600 hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-60",
                    tone.tile
                  )}
                >
                  <span className={cn("absolute inset-y-0 left-0 w-1", tone.rail)} aria-hidden="true" />
                  <span className="flex min-h-0 flex-col pl-1">
                    <span className="break-words text-base font-black leading-5 text-zinc-950">{product.name}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <span className={cn("rounded-md px-2 py-1 text-xs font-bold", tone.chip)}>{product.station}</span>
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-500">{product.category}</span>
                    </span>
                  </span>
                  <span className="flex items-end justify-between gap-3 pl-1">
                    <span>
                      {inBill ? <span className="block text-xs font-bold uppercase tracking-[0.12em] text-leaf-600">In bill</span> : null}
                      <span className="block text-xl font-black text-zinc-950">{money(product.price)}</span>
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-charcoal-900 text-white ring-1 ring-zinc-200 transition group-hover:bg-ember-600">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="rounded-md border border-zinc-200 bg-white/95 p-4 shadow-lift backdrop-blur xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-md bg-charcoal-900 p-4 text-white shadow-lg shadow-zinc-950/15">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">Current bill</p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-normal">{orderType === "Table" ? table : orderType}</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-300">
                {itemCount} item{itemCount === 1 ? "" : "s"} - {paymentMethod}
              </p>
            </div>
            <StatusPill status={billStatus} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Subtotal</span>
              <p className="mt-1 text-lg font-black">{money(subtotal)}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Total due</span>
              <p className="mt-1 text-3xl font-black tracking-normal">{money(total)}</p>
            </div>
          </div>
        </div>

        <FeedbackBanner status={actionStatus} message={lastAction} className="mt-4" />

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm font-semibold text-zinc-700" htmlFor="table-select">
            Table
            <select
              id="table-select"
              value={table}
              onChange={(event) => setTable(event.target.value)}
              disabled={Boolean(orderId) || isPaid || orderType !== "Table"}
              className="mt-2 h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none focus:border-ember-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              {Array.from({ length: 12 }, (_, index) => `Table ${index + 1}`).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={resetBill}
            title="Start new bill"
            aria-label="Start new bill"
            className="mt-7 grid h-11 w-11 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:border-ember-600 hover:text-ember-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 max-h-[330px] space-y-3 overflow-y-auto pr-1">
          {!lines.length ? (
            <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center">
              <div>
                <ReceiptText className="mx-auto h-7 w-7 text-zinc-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-bold text-zinc-600">No items</p>
              </div>
            </div>
          ) : null}
          {lines.map((line) => (
            <div key={line.productId} className="rounded-md border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-zinc-950">{line.product.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{money(line.product.price)} each</p>
                </div>
                <p className="shrink-0 text-sm font-black text-zinc-950">{money(line.product.price * line.quantity)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-white">
                  <button type="button" aria-label={`Reduce ${line.product.name}`} onClick={() => updateQuantity(line.productId, -1)} className="grid h-9 w-9 place-items-center text-zinc-600 hover:text-ember-700">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-9 text-center text-sm font-black">{line.quantity}</span>
                  <button type="button" aria-label={`Add ${line.product.name}`} onClick={() => updateQuantity(line.productId, 1)} className="grid h-9 w-9 place-items-center text-zinc-600 hover:text-ember-700">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => removeProduct(line.productId)} className="grid h-9 w-9 place-items-center rounded-md border border-zinc-200 text-zinc-500 hover:border-red-300 hover:text-red-600">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4">
          <label className="block text-sm font-semibold text-zinc-700">
            Discount
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(event) => setDiscount(Math.max(Number(event.target.value), 0))}
              disabled={isPaid || !canDiscount}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-ember-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-700">
            Service
            <input
              type="number"
              min={0}
              value={serviceCharge}
              onChange={(event) => setServiceCharge(Math.max(Number(event.target.value), 0))}
              disabled={isPaid}
              className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-bold outline-none focus:border-ember-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            />
          </label>
          <label className="col-span-2 flex h-10 items-center justify-between rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700">
            VAT {taxRate}%
            <input type="checkbox" checked={taxEnabled} onChange={(event) => setTaxEnabled(event.target.checked)} disabled={isPaid} className="h-4 w-4 accent-ember-600 disabled:cursor-not-allowed" />
          </label>
        </div>

        <div className="mt-4 space-y-2 rounded-md border border-zinc-200 bg-gradient-to-br from-smoke-50 to-ember-50 p-3">
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Discount</span>
            <span>-{money(discount)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Service</span>
            <span>{money(serviceCharge)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>VAT/Tax</span>
            <span>{money(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-black text-zinc-950">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.label}
                type="button"
                onClick={() => setPaymentMethod(method.label)}
                disabled={isPaid || !canPay}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
                  paymentMethod === method.label ? "border-charcoal-900 bg-charcoal-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-ember-600"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {method.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={sendOrder}
            disabled={!lines.length || isSending || Boolean(orderId) || isPaid}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white text-sm font-bold text-zinc-800 hover:border-ember-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {isSending ? "Sending..." : orderId ? "Order sent" : "Send order"}
          </button>
          <button
            type="button"
            onClick={payBill}
            disabled={!lines.length || isPaying || isPaid || !canPay}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white hover:bg-ember-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {isPaying ? "Saving..." : canPay ? "Pay bill" : "Manager payment"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 text-sm">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-zinc-600">
            <ReceiptText className="h-4 w-4 shrink-0 text-ember-700" aria-hidden="true" />
            <span className="truncate">{receiptNumber ? "Receipt is ready" : "Waiting for next action"}</span>
          </span>
          {receiptNumber ? (
            <Link href={`/receipt/${receiptNumber}`} className="shrink-0 font-bold text-ember-700 hover:text-ember-800">
              Receipt
            </Link>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
