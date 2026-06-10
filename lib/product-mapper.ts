import type { Product as PrismaProduct, Category, Station, StockTrackingType } from "@prisma/client";
import type { Product } from "@/lib/types";

const stationLabels: Record<Station, Product["station"]> = {
  NONE: "None",
  KITCHEN: "Kitchen",
  BAR: "Bar"
};

const stockTrackingLabels: Record<StockTrackingType, Product["stockTrackingType"]> = {
  NONE: "none",
  DIRECT: "direct",
  RECIPE: "recipe"
};

export type ProductWithCategory = PrismaProduct & {
  category: Pick<Category, "name">;
};

/**
 * Converts a database product record into the simpler product shape used by the POS interface.
 */
export function toProductView(product: ProductWithCategory): Product {
  return {
    id: product.id,
    name: product.name,
    category: product.category.name,
    price: Number(product.sellingPrice),
    cost: Number(product.costPrice),
    station: stationLabels[product.station],
    stockTrackingType: stockTrackingLabels[product.stockTrackingType],
    active: product.isActive
  };
}
