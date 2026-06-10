import { NextResponse } from "next/server";
import { Station, StockTrackingType } from "@prisma/client";
import { getAuthorizedSession } from "@/lib/current-session";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/product-mapper";

export async function GET() {
  const session = await getAuthorizedSession(["OWNER", "MANAGER", "CASHIER", "WAITER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to view products." }, { status: 403 });
  }

  const products = await prisma.product.findMany({
    include: {
      category: {
        select: {
          name: true
        }
      }
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }]
  });

  return NextResponse.json({ data: products.map(toProductView) });
}

export async function POST(request: Request) {
  const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
  if (!session) {
    return NextResponse.json({ error: "You are not allowed to create products." }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const categoryName = String(body.category ?? "").trim();
  const sellingPrice = Number(body.price);
  const costPrice = Number(body.cost ?? 0);
  const station = String(body.station ?? "NONE").toUpperCase() as Station;
  const stockTrackingType = String(body.stockTrackingType ?? "NONE").toUpperCase() as StockTrackingType;

  if (!name || !sku || !categoryName || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
    return NextResponse.json({ error: "Name, SKU, category, and a valid price are required." }, { status: 400 });
  }

  if (!(station in Station) || !(stockTrackingType in StockTrackingType)) {
    return NextResponse.json({ error: "Invalid station or stock tracking type." }, { status: 400 });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const category = await tx.category.upsert({
        where: { name: categoryName },
        update: {},
        create: { name: categoryName }
      });

      const createdProduct = await tx.product.create({
        data: {
          name,
          sku,
          categoryId: category.id,
          sellingPrice,
          costPrice: Number.isFinite(costPrice) ? costPrice : 0,
          station,
          stockTrackingType,
          isActive: body.active ?? true
        },
        include: {
          category: {
            select: {
              name: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "PRODUCT_CREATED",
          entity: "Product",
          entityId: createdProduct.id,
          description: `Created product ${createdProduct.name}`,
          metadata: {
            sku: createdProduct.sku,
            category: category.name,
            sellingPrice,
            costPrice: Number.isFinite(costPrice) ? costPrice : 0,
            station,
            stockTrackingType
          }
        }
      });

      return createdProduct;
    });

    return NextResponse.json({ data: toProductView(product) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Product could not be created. Check that the SKU is unique." }, { status: 400 });
  }
}
