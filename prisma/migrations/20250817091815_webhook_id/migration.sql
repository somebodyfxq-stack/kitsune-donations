/*
  Warnings:

  - A unique constraint covering the columns `[webhookId]` on the table `MonobankSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MonobankSettings" ADD COLUMN "webhookId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MonobankSettings_webhookId_key" ON "MonobankSettings"("webhookId");
