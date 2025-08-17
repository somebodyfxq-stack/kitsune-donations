-- CreateTable
CREATE TABLE "MonobankSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT,
    "jarId" TEXT,
    "webhookUrl" TEXT,
    CONSTRAINT "MonobankSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
