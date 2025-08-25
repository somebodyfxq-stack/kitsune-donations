-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DonationEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "monoComment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamerId" TEXT NOT NULL,
    "jarTitle" TEXT,
    "youtubeUrl" TEXT,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DonationEvent_identifier_fkey" FOREIGN KEY ("identifier") REFERENCES "DonationIntent" ("identifier") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DonationEvent_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DonationEvent" ("amount", "createdAt", "id", "identifier", "jarTitle", "message", "monoComment", "nickname", "streamerId", "youtubeUrl") SELECT "amount", "createdAt", "id", "identifier", "jarTitle", "message", "monoComment", "nickname", "streamerId", "youtubeUrl" FROM "DonationEvent";
DROP TABLE "DonationEvent";
ALTER TABLE "new_DonationEvent" RENAME TO "DonationEvent";
CREATE INDEX "DonationEvent_identifier_idx" ON "DonationEvent"("identifier");
CREATE INDEX "DonationEvent_streamerId_createdAt_idx" ON "DonationEvent"("streamerId", "createdAt");
CREATE INDEX "DonationEvent_streamerId_idx" ON "DonationEvent"("streamerId");
CREATE UNIQUE INDEX "DonationEvent_identifier_createdAt_key" ON "DonationEvent"("identifier", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
