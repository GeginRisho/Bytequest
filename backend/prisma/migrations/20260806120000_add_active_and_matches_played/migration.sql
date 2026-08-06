-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "subject" TEXT,
ADD COLUMN "mobileNumber" TEXT;

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN "matchesPlayed" INTEGER NOT NULL DEFAULT 0;
