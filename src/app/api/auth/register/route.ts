import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role, orgInviteCode, familyInviteCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Handle org caregiver invite flow
    if (orgInviteCode) {
      const invite = await prisma.inviteCode.findUnique({
        where: { code: orgInviteCode },
      });

      if (!invite || invite.inviteType !== "CAREGIVER_ORG") {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
      }
      if (invite.usedAt || invite.usedBy) {
        return NextResponse.json({ error: "Invite code has already been used" }, { status: 400 });
      }
      if (new Date() > invite.expiresAt) {
        return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
      }
      if (invite.targetEmail && invite.targetEmail !== email) {
        return NextResponse.json(
          { error: "This invite was sent to a different email address" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: "CAREGIVER",
            organizationId: invite.organizationId,
          },
        });
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { usedBy: newUser.id, usedAt: new Date() },
        });
        return newUser;
      });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      });
    }

    // Handle family member invite flow
    if (familyInviteCode) {
      const invite = await prisma.inviteCode.findUnique({
        where: { code: familyInviteCode },
        include: { patient: { select: { id: true } } },
      });

      if (!invite || invite.inviteType !== "FAMILY" || !invite.patientId) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
      }
      if (invite.usedAt || invite.usedBy) {
        return NextResponse.json({ error: "Invite code has already been used" }, { status: 400 });
      }
      if (new Date() > invite.expiresAt) {
        return NextResponse.json({ error: "Invite code has expired" }, { status: 400 });
      }
      if (invite.targetEmail && invite.targetEmail !== email) {
        return NextResponse.json(
          { error: "This invite was sent to a different email address" },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email, password: hashedPassword, name, role: "FAMILY_MEMBER" },
        });
        await tx.patient.update({
          where: { id: invite.patientId! },
          data: { familyMembers: { connect: { id: newUser.id } } },
        });
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { usedBy: newUser.id, usedAt: new Date() },
        });
        return newUser;
      });

      return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    }

    // Standard registration flow
    const validRoles = ["PATIENT", "FAMILY_MEMBER", "CAREGIVER"];
    const userRole = validRoles.includes(role) ? role : "FAMILY_MEMBER";

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
      },
    });

    if (userRole === "PATIENT") {
      await prisma.patient.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
