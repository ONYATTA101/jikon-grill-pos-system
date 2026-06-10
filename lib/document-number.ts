import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;
type DocumentType = "ORDER" | "RECEIPT";

const prefixes: Record<DocumentType, string> = {
  ORDER: "ORD",
  RECEIPT: "JG"
};

export async function getNextDocumentNumber(tx: TransactionClient, documentType: DocumentType, date = new Date()) {
  const businessDate = startOfBusinessDate(date);
  const sequence = await tx.documentSequence.upsert({
    where: {
      documentType_businessDate: {
        documentType,
        businessDate
      }
    },
    update: {
      nextNumber: {
        increment: 1
      }
    },
    create: {
      documentType,
      businessDate,
      nextNumber: 2
    }
  });

  const issuedNumber = sequence.nextNumber - 1;

  return `${prefixes[documentType]}-${formatBusinessDate(businessDate)}-${String(issuedNumber).padStart(4, "0")}`;
}

function startOfBusinessDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function formatBusinessDate(date: Date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}
