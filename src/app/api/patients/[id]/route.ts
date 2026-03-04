import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { updatePatientCareProfile } from "@/lib/care-profile-update";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if user has access to this patient
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        familyMembers: { select: { id: true } },
        medications: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        tasks: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Check if user is the patient, a connected family/caregiver member, or an org admin/caregiver
    const isOwner = patient.userId === session.user.id;
    const isConnected = patient.familyMembers.some((f) => f.id === session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    // Org caregiver/admin can access patients in their org
    const isOrgMember =
      (session.user.role === "CAREGIVER" || session.user.role === "ADMIN") &&
      session.user.organizationId &&
      (patient as unknown as { organizationId?: string | null }).organizationId === session.user.organizationId;

    if (!isOwner && !isConnected && !isAdmin && !isOrgMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { familyMembers: { select: { id: true } } },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const isOwner = patient.userId === session.user.id;
    const isConnected = patient.familyMembers.some((f) => f.id === session.user.id);
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isConnected && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (body.careProfile !== undefined) {
      const cp = body.careProfile as Record<string, unknown>;
      const updateData: Record<string, unknown> = {};
      const fields = ["dischargeInfo", "exerciseGuidelines", "dietRestrictions", "warningSigns",
        "careContacts", "followUpAppointments", "allergies", "conditions", "healthHistory", "illnessHistory"];
      for (const field of fields) {
        if (cp[field] !== undefined) updateData[field] = cp[field];
      }
      await updatePatientCareProfile(id, updateData);
      return NextResponse.json({ message: "Care profile updated" });
    }

    return NextResponse.json({ error: "No valid update" }, { status: 400 });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}
