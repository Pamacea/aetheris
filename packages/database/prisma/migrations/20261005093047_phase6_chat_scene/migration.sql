-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VttScene" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VttScene_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_campaignId_sentAt_idx" ON "ChatMessage"("campaignId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "VttScene_campaignId_key" ON "VttScene"("campaignId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VttScene" ADD CONSTRAINT "VttScene_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
