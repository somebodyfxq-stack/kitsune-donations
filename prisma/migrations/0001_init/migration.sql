-- CreateTable
CREATE TABLE "DonationIntent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DonationEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "identifier" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "monoComment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DonationEvent_identifier_fkey" FOREIGN KEY ("identifier") REFERENCES "DonationIntent" ("identifier") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DonationIntent_identifier_key" ON "DonationIntent"("identifier");

-- CreateIndex
CREATE INDEX "DonationEvent_identifier_idx" ON "DonationEvent"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "DonationEvent_identifier_createdAt_key" ON "DonationEvent"("identifier", "createdAt");

