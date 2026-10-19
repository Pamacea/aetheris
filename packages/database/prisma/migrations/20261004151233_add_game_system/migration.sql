-- CreateTable
CREATE TABLE "GameSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL DEFAULT '{}',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSystem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSystem_authorId_idx" ON "GameSystem"("authorId");

-- AddForeignKey
ALTER TABLE "GameSystem" ADD CONSTRAINT "GameSystem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
