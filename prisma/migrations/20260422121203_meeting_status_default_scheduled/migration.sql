-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MODERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "ORGANIZATIONS" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ORGANIZATIONS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "USERS" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MODERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "USERS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MEETINGS" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT,
    "timeline_resolution_ms" INTEGER NOT NULL DEFAULT 2000,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "ai_summary" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "MEETINGS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TIMELINE_DATA" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "offset_ms" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "TIMELINE_DATA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MEETING_ALERTS" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MEETING_ALERTS_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "USERS_email_key" ON "USERS"("email");

-- CreateIndex
CREATE INDEX "TIMELINE_DATA_meeting_id_offset_ms_idx" ON "TIMELINE_DATA"("meeting_id", "offset_ms");

-- CreateIndex
CREATE INDEX "MEETING_ALERTS_meeting_id_idx" ON "MEETING_ALERTS"("meeting_id");

-- AddForeignKey
ALTER TABLE "USERS" ADD CONSTRAINT "USERS_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "ORGANIZATIONS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MEETINGS" ADD CONSTRAINT "MEETINGS_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "ORGANIZATIONS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MEETINGS" ADD CONSTRAINT "MEETINGS_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "USERS"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TIMELINE_DATA" ADD CONSTRAINT "TIMELINE_DATA_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "MEETINGS"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MEETING_ALERTS" ADD CONSTRAINT "MEETING_ALERTS_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "MEETINGS"("id") ON DELETE CASCADE ON UPDATE CASCADE;
