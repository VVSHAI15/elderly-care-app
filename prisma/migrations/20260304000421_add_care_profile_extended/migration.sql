-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "allergies" JSONB;
ALTER TABLE "Patient" ADD COLUMN "conditions" JSONB;
ALTER TABLE "Patient" ADD COLUMN "healthHistory" JSONB;
ALTER TABLE "Patient" ADD COLUMN "illnessHistory" JSONB;
