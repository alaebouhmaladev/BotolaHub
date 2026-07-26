-- AlterTable
ALTER TABLE "IngestionRun" ADD COLUMN     "failedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "insertedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skippedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProviderEntityMapping" ADD COLUMN     "clubId" TEXT,
ADD COLUMN     "competitionId" TEXT,
ADD COLUMN     "gameweekId" TEXT,
ADD COLUMN     "seasonId" TEXT;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "deductionPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "incomingPlayerSeasonId" TEXT,
ADD COLUMN     "outgoingPlayerSeasonId" TEXT,
ADD COLUMN     "transferGroupKey" TEXT;

-- CreateTable
CREATE TABLE "ScoringRun" (
    "id" TEXT NOT NULL,
    "gameweekId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "playerScoresCalculated" INTEGER NOT NULL DEFAULT 0,
    "teamScoresCalculated" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ScoringRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionItemFailure" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "errorReason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionItemFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoringRun_gameweekId_status_idx" ON "ScoringRun"("gameweekId", "status");

-- CreateIndex
CREATE INDEX "IngestionItemFailure_ingestionRunId_idx" ON "IngestionItemFailure"("ingestionRunId");

-- CreateIndex
CREATE INDEX "IngestionRun_jobType_startedAt_idx" ON "IngestionRun"("jobType", "startedAt");

-- CreateIndex
CREATE INDEX "Transfer_transferGroupKey_idx" ON "Transfer"("transferGroupKey");

-- AddForeignKey
ALTER TABLE "ScoringRun" ADD CONSTRAINT "ScoringRun_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEntityMapping" ADD CONSTRAINT "ProviderEntityMapping_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEntityMapping" ADD CONSTRAINT "ProviderEntityMapping_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEntityMapping" ADD CONSTRAINT "ProviderEntityMapping_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEntityMapping" ADD CONSTRAINT "ProviderEntityMapping_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionItemFailure" ADD CONSTRAINT "IngestionItemFailure_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
