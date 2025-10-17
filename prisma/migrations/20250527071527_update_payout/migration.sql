/*
  Warnings:

  - You are about to drop the column `month` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Payout` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Payout_lawyerId_month_year_key";

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "month",
DROP COLUMN "year";

-- CreateIndex
CREATE INDEX "Payout_lawyerId_status_idx" ON "Payout"("lawyerId", "status");
