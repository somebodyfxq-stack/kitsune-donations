-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MonobankSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT,
    "jarId" TEXT,
    "jarTitle" TEXT,
    "jarGoal" INTEGER,
    "webhookId" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "obsWidgetToken" TEXT,
    "donationsPaused" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MonobankSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MonobankSettings" ("jarGoal", "jarId", "jarTitle", "obsWidgetToken", "token", "userId", "webhookId", "webhookSecret", "webhookUrl") SELECT "jarGoal", "jarId", "jarTitle", "obsWidgetToken", "token", "userId", "webhookId", "webhookSecret", "webhookUrl" FROM "MonobankSettings";
DROP TABLE "MonobankSettings";
ALTER TABLE "new_MonobankSettings" RENAME TO "MonobankSettings";
CREATE UNIQUE INDEX "MonobankSettings_webhookId_key" ON "MonobankSettings"("webhookId");
CREATE UNIQUE INDEX "MonobankSettings_obsWidgetToken_key" ON "MonobankSettings"("obsWidgetToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
