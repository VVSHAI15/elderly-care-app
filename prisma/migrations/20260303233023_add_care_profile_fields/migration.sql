-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "careContacts" JSONB;
ALTER TABLE "Patient" ADD COLUMN "dietRestrictions" JSONB;
ALTER TABLE "Patient" ADD COLUMN "dischargeInfo" JSONB;
ALTER TABLE "Patient" ADD COLUMN "exerciseGuidelines" JSONB;
ALTER TABLE "Patient" ADD COLUMN "followUpAppointments" JSONB;
ALTER TABLE "Patient" ADD COLUMN "warningSigns" JSONB;
