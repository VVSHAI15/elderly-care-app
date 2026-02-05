import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

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

    // Check if user is the patient or a connected family member
    const isOwner = patient.userId === session.user.id;
    const isConnected = patient.familyMembers.some((f) => f.id === session.user.id);

    if (!isOwner && !isConnected) {
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
