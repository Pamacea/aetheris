-- Baseline 0.6.0 : aligne l'historique de migrations sur le schéma Prisma courant.
-- Les bases existantes ont été modifiées par `db push` ; cette migration est destinée
-- à l'historique de migrations (base vierge) et doit être marquée comme appliquée sur Neon.

-- Sauvegarde additive des données legacy GameSystem avant suppression de la colonne `schema`.
CREATE SCHEMA IF NOT EXISTS "legacy_backup";
CREATE TABLE "legacy_backup"."GameSystem_20261101" AS SELECT * FROM "GameSystem";

-- DropForeignKey
ALTER TABLE "GameSystem" DROP CONSTRAINT "GameSystem_authorId_fkey";

-- DropIndex
DROP INDEX "GameSystem_authorId_idx";

-- AlterTable (GameSystem) : `authorId` est renommé en `ownerId` pour conserver les données.
ALTER TABLE "GameSystem" RENAME COLUMN "authorId" TO "ownerId";
ALTER TABLE "GameSystem" ALTER COLUMN "ownerId" DROP NOT NULL;
ALTER TABLE "GameSystem" DROP COLUMN "schema";
ALTER TABLE "GameSystem" ADD COLUMN     "defaultAssets" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "defaultLore" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "defaultTemplates" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "genre" TEXT NOT NULL DEFAULT 'autre',
ADD COLUMN     "isPreset" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "description" TEXT,
ADD COLUMN     "gameSystemId" TEXT,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'private';

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "shareSlug" TEXT;

-- AlterTable
ALTER TABLE "JsonTemplate" ADD COLUMN     "customCss" TEXT;

-- AlterTable
ALTER TABLE "Novel" ADD COLUMN     "genre" TEXT,
ADD COLUMN     "shareMode" TEXT,
ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "EntityAssignee" (
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EntityAssignee_pkey" PRIMARY KEY ("entityId","userId")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerChoice" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedOption" INTEGER,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceVote" (
    "id" TEXT NOT NULL,
    "optionIndex" INTEGER NOT NULL,
    "comment" TEXT,
    "choiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChoiceVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovelCollaborator" (
    "novelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NovelCollaborator_pkey" PRIMARY KEY ("novelId","userId")
);

-- CreateIndex
CREATE INDEX "EntityAssignee_userId_idx" ON "EntityAssignee"("userId");

-- CreateIndex
CREATE INDEX "EntityLink_fromEntityId_idx" ON "EntityLink"("fromEntityId");

-- CreateIndex
CREATE INDEX "EntityLink_toEntityId_idx" ON "EntityLink"("toEntityId");

-- CreateIndex
CREATE INDEX "PlayerChoice_campaignId_createdAt_idx" ON "PlayerChoice"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ChoiceVote_choiceId_idx" ON "ChoiceVote"("choiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoiceVote_choiceId_userId_key" ON "ChoiceVote"("choiceId", "userId");

-- CreateIndex
CREATE INDEX "NovelCollaborator_userId_idx" ON "NovelCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_shareSlug_key" ON "Entity"("shareSlug");

-- CreateIndex
CREATE INDEX "GameSystem_ownerId_idx" ON "GameSystem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Novel_shareToken_key" ON "Novel"("shareToken");

-- CreateIndex
CREATE INDEX "Novel_status_updatedAt_idx" ON "Novel"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Novel_genre_idx" ON "Novel"("genre");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAssignee" ADD CONSTRAINT "EntityAssignee_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAssignee" ADD CONSTRAINT "EntityAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLink" ADD CONSTRAINT "EntityLink_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerChoice" ADD CONSTRAINT "PlayerChoice_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceVote" ADD CONSTRAINT "ChoiceVote_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "PlayerChoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSystem" ADD CONSTRAINT "GameSystem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovelCollaborator" ADD CONSTRAINT "NovelCollaborator_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovelCollaborator" ADD CONSTRAINT "NovelCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
