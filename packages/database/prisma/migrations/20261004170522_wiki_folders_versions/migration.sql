-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "folder" TEXT;

-- CreateTable
CREATE TABLE "EntityVersion" (
    "id" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "EntityVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityVersion_entityId_idx" ON "EntityVersion"("entityId");

-- AddForeignKey
ALTER TABLE "EntityVersion" ADD CONSTRAINT "EntityVersion_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
