-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_documentType_businessDate_key" ON "document_sequences"("documentType", "businessDate");
