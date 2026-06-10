import {
  PrismaClient,
  Station,
  StockTrackingType
} from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../lib/password";

const seedDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(seedDatabaseUrl ? { datasources: { db: { url: seedDatabaseUrl } } } : undefined);

async function main() {
  const roleSeeds = [
    {
      name: "OWNER",
      permissions: ["reports:all", "sales:read", "inventory:read", "users:manage", "audit:read"]
    },
    {
      name: "MANAGER",
      permissions: ["reports:daily", "sales:read", "inventory:manage", "refunds:approve", "users:manage"]
    },
    {
      name: "CASHIER",
      permissions: ["sales:create", "payments:create", "receipts:print"]
    },
    {
      name: "WAITER",
      permissions: ["orders:create", "tables:manage"]
    },
    {
      name: "KITCHEN",
      permissions: ["orders:kitchen"]
    },
    {
      name: "BARTENDER",
      permissions: ["orders:bar"]
    },
    {
      name: "ADMIN",
      permissions: ["system:setup", "users:manage"]
    }
  ];

  const roles = await Promise.all(
    roleSeeds.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: role
      })
    )
  );
  const roleByName = Object.fromEntries(roles.map((role) => [role.name, role]));

  const users = [
    ["owner@jikongrill.com", "Amina Owner", "OWNER"],
    ["manager@jikongrill.com", "Daniel Manager", "MANAGER"],
    ["cashier@jikongrill.com", "Mary Cashier", "CASHIER"],
    ["waiter@jikongrill.com", "Kevin Waiter", "WAITER"],
    ["kitchen@jikongrill.com", "Chef Otieno", "KITCHEN"],
    ["bar@jikongrill.com", "Brian Bar", "BARTENDER"]
  ] as const;
  const lockedPasswordHash = await hashPassword(randomBytes(32).toString("base64url"));

  await Promise.all(
    users.map(([email, name, roleName]) =>
      prisma.user.upsert({
        where: { email },
        update: { name, roleId: roleByName[roleName].id },
        create: {
          email,
          name,
          phone: "+254700000000",
          passwordHash: lockedPasswordHash,
          roleId: roleByName[roleName].id
        }
      })
    )
  );

  const demoReviewPassword = process.env.DEMO_REVIEW_PASSWORD;
  if (demoReviewPassword) {
    if (demoReviewPassword.length < 8) {
      throw new Error("DEMO_REVIEW_PASSWORD must contain at least 8 characters.");
    }

    await prisma.user.upsert({
      where: { email: "reviewer" },
      update: {
        name: "Project Reviewer",
        passwordHash: await hashPassword(demoReviewPassword),
        roleId: roleByName.OWNER.id,
        status: "ACTIVE"
      },
      create: {
        email: "reviewer",
        name: "Project Reviewer",
        passwordHash: await hashPassword(demoReviewPassword),
        roleId: roleByName.OWNER.id,
        status: "ACTIVE"
      }
    });

    await prisma.user.updateMany({
      where: {
        email: {
          in: ["reviewer@jikongrill.com", "demo-reviewer@jikongrill.com"]
        }
      },
      data: { status: "SUSPENDED" }
    });
  }

  const demoStaffPassword = process.env.DEMO_STAFF_PASSWORD;
  if (demoStaffPassword) {
    if (demoStaffPassword.length < 8) {
      throw new Error("DEMO_STAFF_PASSWORD must contain at least 8 characters.");
    }

    const demoPasswordHash = await hashPassword(demoStaffPassword);
    const demoAccounts = [
      ["owner", "Demo Owner", "OWNER"],
      ["manager", "Demo Manager", "MANAGER"],
      ["cashier", "Demo Cashier", "CASHIER"],
      ["waiter", "Demo Waiter", "WAITER"],
      ["kitchen", "Demo Kitchen", "KITCHEN"],
      ["bartender", "Demo Bartender", "BARTENDER"],
      ["admin", "Demo Admin", "ADMIN"]
    ] as const;

    await Promise.all(
      demoAccounts.map(([email, name, roleName]) =>
        prisma.user.upsert({
          where: { email },
          update: {
            name,
            passwordHash: demoPasswordHash,
            roleId: roleByName[roleName].id,
            status: "ACTIVE"
          },
          create: {
            email,
            name,
            passwordHash: demoPasswordHash,
            roleId: roleByName[roleName].id,
            status: "ACTIVE"
          }
        })
      )
    );

    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "demo-owner@jikongrill.com",
            "demo-manager@jikongrill.com",
            "demo-cashier@jikongrill.com",
            "demo-waiter@jikongrill.com",
            "demo-kitchen@jikongrill.com",
            "demo-bar@jikongrill.com",
            "demo-admin@jikongrill.com"
          ]
        }
      },
      data: { status: "SUSPENDED" }
    });
  }

  const categorySeeds = [
    ["Grill", 1],
    ["Sides", 2],
    ["Beer", 3],
    ["Soft Drinks", 4],
    ["Spirits", 5]
  ] as const;

  const categories = await Promise.all(
    categorySeeds.map(([name, sortOrder]) =>
      prisma.category.upsert({
        where: { name },
        update: { sortOrder },
        create: { name, sortOrder }
      })
    )
  );
  const categoryByName = Object.fromEntries(categories.map((category) => [category.name, category]));

  const productSeeds = [
    {
      sku: "JG-GRILL-CHICKEN",
      name: "Grilled Chicken",
      category: "Grill",
      station: Station.KITCHEN,
      sellingPrice: 850,
      costPrice: 430,
      stockTrackingType: StockTrackingType.RECIPE
    },
    {
      sku: "JG-CHIPS",
      name: "Chips",
      category: "Sides",
      station: Station.KITCHEN,
      sellingPrice: 250,
      costPrice: 95,
      stockTrackingType: StockTrackingType.RECIPE
    },
    {
      sku: "JG-TUSKER",
      name: "Tusker",
      category: "Beer",
      station: Station.BAR,
      sellingPrice: 300,
      costPrice: 185,
      stockTrackingType: StockTrackingType.DIRECT
    },
    {
      sku: "JG-GUINNESS",
      name: "Guinness",
      category: "Beer",
      station: Station.BAR,
      sellingPrice: 350,
      costPrice: 220,
      stockTrackingType: StockTrackingType.DIRECT
    },
    {
      sku: "JG-SODA",
      name: "Soda",
      category: "Soft Drinks",
      station: Station.BAR,
      sellingPrice: 120,
      costPrice: 55,
      stockTrackingType: StockTrackingType.DIRECT
    }
  ];

  const products = await Promise.all(
    productSeeds.map((product) =>
      prisma.product.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          categoryId: categoryByName[product.category].id,
          station: product.station,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          stockTrackingType: product.stockTrackingType
        },
        create: {
          sku: product.sku,
          name: product.name,
          categoryId: categoryByName[product.category].id,
          station: product.station,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          stockTrackingType: product.stockTrackingType
        }
      })
    )
  );
  const productBySku = Object.fromEntries(products.map((product) => [product.sku, product]));

  const inventorySeeds = [
    ["Chicken", "kg", 18, 6, 1720],
    ["Potatoes", "kg", 38, 12, 180],
    ["Sauce Portions", "portion", 160, 40, 25],
    ["Tusker", "bottle", 96, 24, 185],
    ["Guinness", "bottle", 44, 18, 220],
    ["Soda", "bottle", 72, 24, 55],
    ["Cooking Oil", "litre", 9, 5, 330],
    ["Serviettes", "packet", 16, 8, 120]
  ] as const;

  const inventoryItems = await Promise.all(
    inventorySeeds.map(([name, unit, currentStock, minimumStock, costPerUnit]) =>
      prisma.inventoryItem.upsert({
        where: { name },
        update: { unit, minimumStock, costPerUnit },
        create: { name, unit, currentStock, minimumStock, costPerUnit }
      })
    )
  );
  const inventoryByName = Object.fromEntries(inventoryItems.map((item) => [item.name, item]));

  const recipeSeeds = [
    ["JG-GRILL-CHICKEN", "Chicken", 0.25, "kg"],
    ["JG-GRILL-CHICKEN", "Potatoes", 0.2, "kg"],
    ["JG-GRILL-CHICKEN", "Sauce Portions", 1, "portion"],
    ["JG-CHIPS", "Potatoes", 0.3, "kg"],
    ["JG-CHIPS", "Cooking Oil", 0.05, "litre"]
  ] as const;

  await Promise.all(
    recipeSeeds.map(([sku, inventoryName, quantity, unit]) =>
      prisma.recipe.upsert({
        where: {
          productId_inventoryItemId: {
            productId: productBySku[sku].id,
            inventoryItemId: inventoryByName[inventoryName].id
          }
        },
        update: { quantity, unit },
        create: {
          productId: productBySku[sku].id,
          inventoryItemId: inventoryByName[inventoryName].id,
          quantity,
          unit
        }
      })
    )
  );

  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      prisma.restaurantTable.upsert({
        where: { number: index + 1 },
        update: { seats: 4 },
        create: { number: index + 1, seats: 4, status: "available" }
      })
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
