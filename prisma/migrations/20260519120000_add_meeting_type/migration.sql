-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('LIVE', 'RECORDED');

-- AlterTable
ALTER TABLE "MEETINGS" ADD COLUMN "meeting_type" "MeetingType" NOT NULL DEFAULT 'LIVE';
