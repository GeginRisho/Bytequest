-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_studentId_fkey";
ALTER TABLE "StudentAchievement" DROP CONSTRAINT "StudentAchievement_studentId_fkey";
ALTER TABLE "StudentAchievement" DROP CONSTRAINT "StudentAchievement_achievementId_fkey";
ALTER TABLE "StudentMissionProgress" DROP CONSTRAINT "StudentMissionProgress_studentId_fkey";
ALTER TABLE "StudentMissionProgress" DROP CONSTRAINT "StudentMissionProgress_missionId_fkey";
ALTER TABLE "TournamentPlayer" DROP CONSTRAINT "TournamentPlayer_tournamentId_fkey";
ALTER TABLE "TournamentPlayer" DROP CONSTRAINT "TournamentPlayer_studentId_fkey";
ALTER TABLE "StudentAnalytics" DROP CONSTRAINT "StudentAnalytics_studentId_fkey";
ALTER TABLE "Friendship" DROP CONSTRAINT "Friendship_senderId_fkey";
ALTER TABLE "Friendship" DROP CONSTRAINT "Friendship_receiverId_fkey";
ALTER TABLE "GameInvite" DROP CONSTRAINT "GameInvite_sessionId_fkey";
ALTER TABLE "GameInvite" DROP CONSTRAINT "GameInvite_senderId_fkey";
ALTER TABLE "GameInvite" DROP CONSTRAINT "GameInvite_receiverId_fkey";
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropTable
DROP TABLE "InventoryItem";
DROP TABLE "Achievement";
DROP TABLE "StudentAchievement";
DROP TABLE "Mission";
DROP TABLE "StudentMissionProgress";
DROP TABLE "Tournament";
DROP TABLE "TournamentPlayer";
DROP TABLE "StudentAnalytics";
DROP TABLE "Friendship";
DROP TABLE "GameInvite";
DROP TABLE "Notification";
DROP TABLE "EventLog";
DROP TABLE "AuditLog";
DROP TABLE "AdminProfile";

-- AlterTable StudentProfile
ALTER TABLE "StudentProfile" DROP COLUMN "diamonds";
ALTER TABLE "StudentProfile" DROP COLUMN "energy";
ALTER TABLE "StudentProfile" DROP COLUMN "lives";
ALTER TABLE "StudentProfile" DROP COLUMN "rank";
ALTER TABLE "StudentProfile" DROP COLUMN "title";
ALTER TABLE "StudentProfile" DROP COLUMN "activeFrame";
ALTER TABLE "StudentProfile" DROP COLUMN "activeAvatar";
ALTER TABLE "StudentProfile" DROP COLUMN "activePet";
ALTER TABLE "StudentProfile" DROP COLUMN "activeDiceSkin";
ALTER TABLE "StudentProfile" DROP COLUMN "battlePassXp";
ALTER TABLE "StudentProfile" DROP COLUMN "battlePassTier";

-- AlterTable MapWorld
ALTER TABLE "MapWorld" DROP COLUMN "coinCost";
ALTER TABLE "MapWorld" DROP COLUMN "unlockedByDefault";

-- CreateTable StudentBadge
CREATE TABLE "StudentBadge" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable TeamMember
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable SessionResult
CREATE TABLE "SessionResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT,
    "studentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SessionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentBadge_studentId_badgeId_key" ON "StudentBadge"("studentId", "badgeId");
CREATE UNIQUE INDEX "TeamMember_teamId_studentId_key" ON "TeamMember"("teamId", "studentId");
CREATE UNIQUE INDEX "SessionResult_sessionId_teamId_key" ON "SessionResult"("sessionId", "teamId");
CREATE UNIQUE INDEX "SessionResult_sessionId_studentId_key" ON "SessionResult"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionResult" ADD CONSTRAINT "SessionResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionResult" ADD CONSTRAINT "SessionResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionResult" ADD CONSTRAINT "SessionResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
