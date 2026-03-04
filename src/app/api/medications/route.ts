import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

async function canAccessPatient(patientId: string, userId: string, role: string, orgId?: string | null) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { familyMembers: { select: { id: true } } },
  });
  if (!patient) return false;
  const isOwner = patient.userId === userId;
  const isConnected = patient.familyMembers.some((f) => f.id === userId);
  const isAdmin = role === "ADMIN";
  const isOrgMember =
    (role === "CAREGIVER" || role === "ADMIN") &&
    orgId &&
    (patient as unknown as { organizationId?: string | null }).organizationId === orgId;
  return isOwner || isConnected || isAdmin || isOrgMember;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const allowed = await canAccessPatient(patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const medications = await prisma.medication.findMany({
    where: { patientId },
    include: {
      document: {
        select: {
          id: true,
          fileName: true,
          documentType: true,
          uploadedAt: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(medications);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Medication ID is required" }, { status: 400 });
  }

  // Verify the medication belongs to a patient the user can access
  const medication = await prisma.medication.findUnique({
    where: { id },
    select: { patientId: true },
  });
  if (!medication) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const allowed = await canAccessPatient(medication.patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const updated = await prisma.medication.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
