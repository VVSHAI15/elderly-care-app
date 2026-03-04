import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password = "password123", role = "PATIENT", orgName } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (role === "ADMIN" && !orgName) {
      return NextResponse.json({ error: "Organization name is required for ADMIN users" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Resolve organization if needed
    let organizationId: string | null = null;
    if (orgName && (role === "ADMIN" || role === "CAREGIVER")) {
      let org = await prisma.organization.findFirst({ where: { name: orgName } });
      if (!org) {
        org = await prisma.organization.create({ data: { name: orgName } });
      }
      organizationId = org.id;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
        role: role as never,
        ...(organizationId && { organizationId }),
        ...(role === "PATIENT" && {
          patient: {
            create: {
              dateOfBirth: new Date("1950-01-01"),
              emergencyContact: "",
            },
          },
        }),
      },
      include: { patient: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId ?? null,
      patientId: user.patient?.id ?? null,
    }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Delete related data first
    const patient = await prisma.patient.findUnique({ where: { userId: id } });
    if (patient) {
      await prisma.notification.deleteMany({ where: { userId: id } });
      await prisma.task.deleteMany({ where: { patientId: patient.id } });
      await prisma.medication.deleteMany({ where: { patientId: patient.id } });
      await prisma.document.deleteMany({ where: { patientId: patient.id } });
      await prisma.inviteCode.deleteMany({ where: { patientId: patient.id } });
      await prisma.patient.delete({ where: { id: patient.id } });
    } else {
      await prisma.notification.deleteMany({ where: { userId: id } });
    }

    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.account.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
