import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

async function main() {
  const email = process.env.INTERVIEW_REVIEW_EMAIL?.trim().toLowerCase();
  const password = process.env.INTERVIEW_REVIEW_PASSWORD;

  if (!email || !password || password.length < 8) {
    throw new Error("Set INTERVIEW_REVIEW_EMAIL and an INTERVIEW_REVIEW_PASSWORD of at least 8 characters.");
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: "OWNER" } });
  const reviewer = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Project Reviewer",
      passwordHash: await hashPassword(password),
      roleId: ownerRole.id,
      status: "ACTIVE"
    },
    create: {
      name: "Project Reviewer",
      email,
      passwordHash: await hashPassword(password),
      roleId: ownerRole.id,
      status: "ACTIVE"
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: reviewer.id,
      action: "TEMP_REVIEWER_ACCESS_CREATED",
      entity: "User",
      entityId: reviewer.id,
      description: "Created temporary Owner-level interview review account"
    }
  });

  console.log(`Temporary reviewer account is active: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
