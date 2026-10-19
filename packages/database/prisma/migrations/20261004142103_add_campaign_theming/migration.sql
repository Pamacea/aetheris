-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "customThemeScript" TEXT,
ADD COLUMN     "gameSystem" TEXT NOT NULL DEFAULT 'custom',
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'pandemonium';
