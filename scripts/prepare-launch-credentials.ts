import { randomBytes } from "crypto";
import { writeFile } from "fs/promises";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";

const accounts = [
  ["Owner", "owner@jikongrill.com"],
  ["Manager", "manager@jikongrill.com"],
  ["Cashier", "cashier@jikongrill.com"],
  ["Waiter", "waiter@jikongrill.com"],
  ["Kitchen", "kitchen@jikongrill.com"],
  ["Bartender", "bar@jikongrill.com"]
] as const;

async function main() {
  if (process.argv[2] !== "ROTATE") {
    throw new Error("Password rotation requires the ROTATE confirmation argument.");
  }

  const credentials: Array<{ role: string; email: string; password: string }> = [];

  for (const [role, email] of accounts) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`Required launch account was not found: ${email}`);
    }

    const password = `JG-${randomBytes(12).toString("base64url")}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) }
    });
    credentials.push({ role, email, password });
  }

  const lines = [
    "JIKON GRILL POS - PRIVATE LAUNCH CREDENTIALS",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Distribute each password privately. Change passwords from the Staff page after first sign-in.",
    "Delete this file after credentials have been distributed.",
    "",
    ...credentials.map(({ role, email, password }) => `${role} | ${email} | ${password}`),
    ""
  ];

  await writeFile(".launch-credentials.txt", lines.join("\r\n"), { encoding: "utf8" });
  console.log("Staff passwords rotated. Credentials saved to .launch-credentials.txt");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
