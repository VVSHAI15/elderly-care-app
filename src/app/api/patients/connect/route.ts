import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// Accept an invite code to connect with a patient
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Find the invite code
    const invite = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "This invite code has already been used" },
        { status: 400 }
      );
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invite code has expired" },
        { status: 400 }
      );
    }

    // Check if user is already connected to this patient
    const existingConnection = await prisma.patient.findFirst({
      where: {
        id: invite.patientId,
        familyMembers: { some: { id: session.user.id } },
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: "You are already connected to this patient" },
        { status: 400 }
      );
    }

    // Check if user is the patient themselves
    if (invite.patient.userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot connect to yourself" },
        { status: 400 }
      );
    }

    // Connect the user to the patient and mark invite as used
    await prisma.$transaction([
      prisma.patient.update({
        where: { id: invite.patientId },
        data: {
          familyMembers: {
            connect: { id: session.user.id },
          },
        },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: {
          usedBy: session.user.id,
          usedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      patientName: invite.patient.user.name,
      patientId: invite.patientId,
    });
  } catch (error) {
    console.error("Error connecting to patient:", error);
    return NextResponse.json(
      { error: "Failed to connect to patient" },
      { status: 500 }
    );
  }
}
