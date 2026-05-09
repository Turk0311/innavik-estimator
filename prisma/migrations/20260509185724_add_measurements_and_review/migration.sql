-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "reviewNotes" TEXT;

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "tradeType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
