-- AlterTable
ALTER TABLE "DonationEvent" ADD COLUMN "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "DonationIntent" ADD COLUMN "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "YouTubeSettings" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "maxDurationMinutes" INTEGER NOT NULL DEFAULT 5,
    "volume" INTEGER NOT NULL DEFAULT 50,
    "showClipTitle" BOOLEAN NOT NULL DEFAULT true,
    "showDonorName" BOOLEAN NOT NULL DEFAULT true,
    "minLikes" INTEGER NOT NULL DEFAULT 0,
    "minViews" INTEGER NOT NULL DEFAULT 0,
    "minComments" INTEGER NOT NULL DEFAULT 0,
    "showImmediately" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "YouTubeSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
