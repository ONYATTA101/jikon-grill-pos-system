import { prisma } from "../lib/prisma";

/**
 * Runs the remove interview reviewer maintenance task from start to finish and reports any failure
 * before the script exits.
 */
async function main() {
  if (process.argv[2] !== "REMOVE") {
    throw new Error("Removing interview access requires the REMOVE confirmation argument.");
  }

  const email = "reviewer@jikongrill.com";
  const reviewer = await prisma.user.findUnique({ where: { email } });

  if (!reviewer) {
    console.log("No temporary reviewer account exists.");
    return;
  }

  await prisma.user.update({
    where: { id: reviewer.id },
    data: { status: "SUSPENDED" }
  });

  console.log("Temporary reviewer account suspended.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
