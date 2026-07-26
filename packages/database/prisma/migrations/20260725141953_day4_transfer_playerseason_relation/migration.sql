-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_playerSeasonId_fkey" FOREIGN KEY ("playerSeasonId") REFERENCES "PlayerSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
