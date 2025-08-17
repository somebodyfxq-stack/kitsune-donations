/*
  Warnings:

  - Added the required column `streamerId` to the `DonationIntent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamerId` to the `DonationEvent` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DonationIntent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamerId" TEXT NOT NULL,
    CONSTRAINT "DonationIntent_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DonationIntent" ("amount", "createdAt", "id", "identifier", "message", "nickname") SELECT "amount", "createdAt", "id", "identifier", "message", "nickname" FROM "DonationIntent";
DROP TABLE "DonationIntent";
ALTER TABLE "new_DonationIntent" RENAME TO "DonationIntent";
CREATE UNIQUE INDEX "DonationIntent_identifier_key" ON "DonationIntent"("identifier");
CREATE TABLE "new_DonationEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "monoComment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamerId" TEXT NOT NULL,
    CONSTRAINT "DonationEvent_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DonationEvent_identifier_fkey" FOREIGN KEY ("identifier") REFERENCES "DonationIntent" ("identifier") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DonationEvent" ("amount", "createdAt", "id", "identifier", "message", "monoComment", "nickname") SELECT "amount", "createdAt", "id", "identifier", "message", "monoComment", "nickname" FROM "DonationEvent";
DROP TABLE "DonationEvent";
ALTER TABLE "new_DonationEvent" RENAME TO "DonationEvent";
CREATE INDEX "DonationEvent_identifier_idx" ON "DonationEvent"("identifier");
CREATE UNIQUE INDEX "DonationEvent_identifier_createdAt_key" ON "DonationEvent"("identifier", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
