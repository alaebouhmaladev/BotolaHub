-- AlterTable
ALTER TABLE "UserSession" ALTER COLUMN "familyId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "GameweekLineupPlayer" ADD CONSTRAINT "GameweekLineupPlayer_playerSeasonId_fkey" FOREIGN KEY ("playerSeasonId") REFERENCES "PlayerSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
