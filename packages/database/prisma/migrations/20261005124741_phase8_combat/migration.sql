-- CreateTable
CREATE TABLE "CampaignEncounter" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEncounter_campaignId_key" ON "CampaignEncounter"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignEncounter" ADD CONSTRAINT "CampaignEncounter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
