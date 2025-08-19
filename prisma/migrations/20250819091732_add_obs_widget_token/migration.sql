/*
  Warnings:

  - A unique constraint covering the columns `[obsWidgetToken]` on the table `MonobankSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MonobankSettings" ADD COLUMN "obsWidgetToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MonobankSettings_obsWidgetToken_key" ON "MonobankSettings"("obsWidgetToken");
