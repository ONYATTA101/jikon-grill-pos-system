import { prisma } from "../lib/prisma";

const inventoryBaseline = {
  Chicken: 18,
  Potatoes: 38,
  "Sauce Portions": 160,
  Tusker: 96,
  Guinness: 44,
  Soda: 72,
  "Cooking Oil": 9,
  Serviettes: 16
} as const;

async function main() {
  if (process.argv[2] !== "CLEAN") {
    throw new Error("Launch data cleanup requires the CLEAN confirmation argument.");
  }

  await prisma.$transaction(
    async (tx) => {
      const owner = await tx.user.findUnique({
        where: { email: "owner@jikongrill.com" },
        select: { id: true }
      });

      if (!owner) {
        throw new Error("Required owner account was not found.");
      }

      await tx.refund.deleteMany();
      await tx.discount.deleteMany();
      await tx.payment.deleteMany();
      await tx.saleItem.deleteMany();
      await tx.stockMovement.deleteMany();
      await tx.sale.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.expense.deleteMany();
      await tx.dailyClosingReport.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.documentSequence.deleteMany();
      await tx.supplier.deleteMany();
      await tx.restaurantTable.deleteMany();

      await tx.restaurantTable.createMany({
        data: Array.from({ length: 12 }, (_, index) => ({
          number: index + 1,
          seats: 4,
          status: "available"
        }))
      });

      for (const [name, currentStock] of Object.entries(inventoryBaseline)) {
        const result = await tx.inventoryItem.updateMany({
          where: { name },
          data: { currentStock }
        });

        if (result.count !== 1) {
          throw new Error(`Expected one inventory item named "${name}", found ${result.count}.`);
        }
      }

      await tx.auditLog.create({
        data: {
          userId: owner.id,
          action: "LAUNCH_DATA_PREPARED",
          entity: "System",
          description: "Removed test transactions and prepared clean launch data"
        }
      });
    },
    { timeout: 30_000 }
  );

  console.log("Launch data prepared. Staff, menu, recipes, settings, and inventory definitions were preserved.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
