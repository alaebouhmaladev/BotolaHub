-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "familyId" TEXT NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "replacedBy" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_familyId_idx" ON "UserSession"("familyId");
