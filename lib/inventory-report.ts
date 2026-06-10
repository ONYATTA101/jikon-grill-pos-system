import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InventoryItem } from "@/lib/types";

export async function getInventoryReport(): Promise<InventoryItem[]> {
  const inventoryItems = await prisma.inventoryItem.findMany({
    include: {
      stockMovements: {
        where: {
          movementType: StockMovementType.SALE_DEDUCTION
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return inventoryItems.map((item) => {
    const sold = Math.abs(item.stockMovements.reduce((sum, movement) => sum + Number(movement.quantity), 0));
    const currentStock = Number(item.currentStock);

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      openingStock: currentStock + sold,
      sold,
      expected: currentStock,
      actual: currentStock,
      currentStock,
      minimumStock: Number(item.minimumStock),
      costPerUnit: Number(item.costPerUnit)
    };
  });
}
