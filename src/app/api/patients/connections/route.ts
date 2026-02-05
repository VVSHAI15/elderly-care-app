import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// Get all connections for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If user is a patient, get their connected family members
    const patient = await prisma.patient.findUnique({
      where: { userId: session.user.id },
      include: {
        familyMembers: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (patient) {
      return NextResponse.json({
        type: "patient",
        connections: patient.familyMembers,
      });
    }

    // If user is family/caregiver, get patients they're connected to
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyOf: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      type: "caregiver",
      connections: user?.familyOf.map((p) => ({
        patientId: p.id,
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
      })) || [],
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
