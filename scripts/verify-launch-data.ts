import { prisma } from "../lib/prisma";

const expectedInventory = {
  Chicken: 18,
  Potatoes: 38,
  "Sauce Portions": 160,
  Tusker: 96,
  Guinness: 44,
  Soda: 72,
  "Cooking Oil": 9,
  Serviettes: 16
} as const;

const requiredStaff = [
  "owner@jikongrill.com",
  "manager@jikongrill.com",
  "cashier@jikongrill.com",
  "waiter@jikongrill.com",
  "kitchen@jikongrill.com",
  "bar@jikongrill.com"
];

async function main() {
  const [
    sales,
    orders,
    refunds,
    expenses,
    closings,
    stockMovements,
    suppliers,
    tables,
    users,
    products,
    inventory,
    launchAudit
  ] = await Promise.all([
    prisma.sale.count(),
    prisma.order.count(),
    prisma.refund.count(),
    prisma.expense.count(),
    prisma.dailyClosingReport.count(),
    prisma.stockMovement.count(),
    prisma.supplier.count(),
    prisma.restaurantTable.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({ where: { email: { in: requiredStaff } }, select: { email: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.inventoryItem.findMany({ select: { name: true, currentStock: true } }),
    prisma.auditLog.count({ where: { action: "LAUNCH_DATA_PREPARED" } })
  ]);

  const failures: string[] = [];
  const emptyCounts = { sales, orders, refunds, expenses, closings, stockMovements, suppliers };

  for (const [name, count] of Object.entries(emptyCounts)) {
    if (count !== 0) failures.push(`${name} should be 0, found ${count}`);
  }

  if (
    tables.length !== 12 ||
    tables.some((table, index) => table.number !== index + 1 || table.seats !== 4 || table.status !== "available")
  ) {
    failures.push("tables should be numbered 1-12 with four seats and available status");
  }

  if (users.length !== requiredStaff.length) {
    failures.push(`required staff should be ${requiredStaff.length}, found ${users.length}`);
  }

  if (products < 5) {
    failures.push(`active products should be at least 5, found ${products}`);
  }

  const stockByName = new Map(inventory.map((item) => [item.name, Number(item.currentStock)]));
  for (const [name, expectedStock] of Object.entries(expectedInventory)) {
    if (stockByName.get(name) !== expectedStock) {
      failures.push(`${name} stock should be ${expectedStock}, found ${stockByName.get(name) ?? "missing"}`);
    }
  }

  if (launchAudit !== 1) {
    failures.push(`launch preparation audit count should be 1, found ${launchAudit}`);
  }

  console.log(
    JSON.stringify(
      {
        operationalCounts: emptyCounts,
        tables: tables.length,
        requiredStaff: users.length,
        activeProducts: products,
        inventoryItems: inventory.length,
        launchAudit
      },
      null,
      2
    )
  );

  if (failures.length > 0) {
    throw new Error(`Launch data verification failed:\n- ${failures.join("\n- ")}`);
  }

  console.log("Launch data verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
