import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { randomBytes } from "crypto";

// Generate a new invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the patient profile
    const patient = await prisma.patient.findUnique({
      where: { userId: session.user.id },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Only patients can generate invite codes" },
        { status: 403 }
      );
    }

    // Generate a simple 6-character code
    const code = randomBytes(3).toString("hex").toUpperCase();

    // Create invite code (expires in 7 days)
    const invite = await prisma.inviteCode.create({
      data: {
        code,
        patientId: patient.id,
        createdBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      code: invite.code,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error generating invite:", error);
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}

// Get active invite codes for the patient
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: session.user.id },
    });

    if (!patient) {
      return NextResponse.json({ invites: [] });
    }

    const invites = await prisma.inviteCode.findMany({
      where: {
        patientId: patient.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invite codes" },
      { status: 500 }
    );
  }
}
