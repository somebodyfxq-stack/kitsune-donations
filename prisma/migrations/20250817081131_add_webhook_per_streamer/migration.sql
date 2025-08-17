/*
  Warnings:

  - Added the required column `streamerId` to the `DonationIntent` table without a default value. This is not possible if the table is not empty.

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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
