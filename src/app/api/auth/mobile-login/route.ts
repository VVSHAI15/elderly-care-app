import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import prisma from "@/lib/db";

// Mobile-only auth endpoint.
// Validates credentials and returns a NextAuth-compatible JWT that the iOS app
// sends as Cookie: next-auth.session-token=<token> on subsequent requests.
// This lets all existing getServerSession() routes work without modification.
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create a NextAuth-compatible JWT (same format as the session cookie)
    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId ?? null,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // If the user is a PATIENT, include their patientId for convenience
    let patientId: string | null = null;
    if (user.role === "PATIENT") {
      const patient = await prisma.patient.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      patientId = patient?.id ?? null;
    }

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      patientId,
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
