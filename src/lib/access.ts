import prisma from "@/lib/db";

/**
 * Checks whether a user is authorized to access a patient's data.
 * - Patient can access their own record
 * - Family members can access patients they're connected to
 * - Caregivers and admins can access patients within their own organization only
 */
export async function canAccessPatient(
  patientId: string,
  userId: string,
  role: string,
  orgId?: string | null
): Promise<boolean> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      userId: true,
      organizationId: true,
      familyMembers: { select: { id: true } },
    },
  });

  if (!patient) return false;

  const isOwner = patient.userId === userId;
  const isConnected = patient.familyMembers.some((f) => f.id === userId);
  // Caregivers and admins must be in the same org as the patient
  const isOrgMember =
    (role === "CAREGIVER" || role === "ADMIN") &&
    !!orgId &&
    patient.organizationId === orgId;

  return isOwner || isConnected || isOrgMember;
}
