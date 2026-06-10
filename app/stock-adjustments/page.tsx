import { Save } from "lucide-react";
import { StockMovementType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const movementLabels: Record<StockMovementType, string> = {
  PURCHASE: "Purchase",
  SALE_DEDUCTION: "Sale deduction",
  WASTAGE: "Wastage",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
  RETURN: "Return"
};
const feedbackPath = (status: "success" | "error", message: string) => `/stock-adjustments?status=${status}&message=${encodeURIComponent(message)}`;

export default async function StockAdjustmentsPage({
  searchParams
}: {
  searchParams?: { status?: string; message?: string };
}) {
  async function saveMovement(formData: FormData) {
    "use server";

    const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
    if (!session) redirect(feedbackPath("error", "You are not allowed to save stock movements."));

    const inventoryItemId = String(formData.get("inventoryItemId") ?? "");
    const movementType = String(formData.get("movementType") ?? "") as StockMovementType;
    const quantityInput = Number(formData.get("quantity") ?? 0);
    const reason = String(formData.get("reason") ?? "").trim();

    if (!inventoryItemId || !(movementType in StockMovementType) || !Number.isFinite(quantityInput) || quantityInput === 0 || !reason) {
      redirect(feedbackPath("error", "Choose an item, movement type, quantity, and reason."));
    }

    const quantity = normalizeMovementQuantity(movementType, quantityInput);

    try {
      await prisma.$transaction(async (tx) => {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: {
            id: inventoryItemId
          }
        });

        if (!inventoryItem) {
          throw new Error("Inventory item not found.");
        }

        const nextStock = Number(inventoryItem.currentStock) + quantity;
        if (nextStock < 0) {
          throw new Error(`Not enough stock for ${inventoryItem.name}.`);
        }

        await tx.inventoryItem.update({
          where: {
            id: inventoryItemId
          },
          data: {
            currentStock: {
              increment: quantity
            }
          }
        });

        const movement = await tx.stockMovement.create({
          data: {
            inventoryItemId,
            movementType,
            quantity,
            reason,
            createdById: session.userId
          }
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: "STOCK_MOVEMENT_CREATED",
            entity: "StockMovement",
            entityId: movement.id,
            description: `${movementLabels[movementType]} ${quantity} ${inventoryItem.unit} for ${inventoryItem.name}: ${reason}`,
            metadata: {
              inventoryItemId,
              inventoryItem: inventoryItem.name,
              movementType,
              quantity,
              reason,
              resultingStock: nextStock
            }
          }
        });
      });
    } catch (error) {
      redirect(feedbackPath("error", error instanceof Error ? error.message : "Stock movement could not be saved."));
    }

    revalidatePath("/inventory");
    revalidatePath("/owner/inventory");
    revalidatePath("/stock-adjustments");
    revalidatePath("/owner/audit-logs");
    redirect(feedbackPath("success", "Stock movement saved successfully."));
  }

  const inventoryItems = await prisma.inventoryItem.findMany({
    orderBy: {
      name: "asc"
    }
  });
  const stockMovements = await prisma.stockMovement.findMany({
    include: {
      inventoryItem: {
        select: {
          name: true,
          unit: true
        }
      },
      createdBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 25
  });

  return (
    <AppShell role="MANAGER">
      <PageHeader eyebrow="Inventory" title="Stock Adjustments" description="Record purchases, wastage, stock corrections, returns, and sale deductions." />
      <FeedbackBanner status={searchParams?.status === "error" ? "error" : "success"} message={searchParams?.message} className="mt-5" />

      <div className="mt-5 grid gap-4 xl:grid-cols-[380px_1fr]">
        <Panel title="New movement">
          <form action={saveMovement} className="space-y-3">
            <label className="block text-sm font-bold text-zinc-800">
              Inventory item
              <select name="inventoryItemId" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600">
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Movement type
              <select name="movementType" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600">
                {Object.entries(movementLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Quantity
              <input name="quantity" type="number" step="0.001" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Reason
              <input name="reason" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save movement
            </button>
          </form>
        </Panel>

        <Panel title="Recent movements">
          <div className="space-y-3">
            {stockMovements.map((movement) => (
              <div key={movement.id} className="grid gap-3 rounded-md border border-zinc-200 p-3 text-sm sm:grid-cols-[72px_1fr_140px]">
                <span className="font-bold text-zinc-500">
                  {movement.createdAt.toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                <span>
                  <span className="block font-black text-zinc-950">{movement.inventoryItem.name}</span>
                  <span className="block text-zinc-500">
                    {movementLabels[movement.movementType]} - {movement.reason}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-zinc-400">By {movement.createdBy?.name ?? "System"}</span>
                </span>
                <span className="font-black text-zinc-950">
                  {Number(movement.quantity)} {movement.inventoryItem.unit}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function normalizeMovementQuantity(movementType: StockMovementType, quantity: number) {
  const absoluteQuantity = Math.abs(quantity);

  if (movementType === StockMovementType.PURCHASE || movementType === StockMovementType.RETURN) {
    return absoluteQuantity;
  }

  if (movementType === StockMovementType.SALE_DEDUCTION || movementType === StockMovementType.WASTAGE || movementType === StockMovementType.TRANSFER) {
    return -absoluteQuantity;
  }

  return quantity;
}
