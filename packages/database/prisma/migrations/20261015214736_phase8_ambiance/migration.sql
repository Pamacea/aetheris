-- CreateTable
CREATE TABLE "AmbiancePlaylist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tracks" JSONB NOT NULL DEFAULT '[]',
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbiancePlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAmbiance" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAmbiance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AmbiancePlaylist_campaignId_idx" ON "AmbiancePlaylist"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAmbiance_campaignId_key" ON "CampaignAmbiance"("campaignId");

-- AddForeignKey
ALTER TABLE "AmbiancePlaylist" ADD CONSTRAINT "AmbiancePlaylist_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAmbiance" ADD CONSTRAINT "CampaignAmbiance_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
