import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

// GET /api/shifts - Get active shift or recent shifts for current caregiver
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const patientId = searchParams.get("patientId");

  // Get active (open) shift — always scoped to the session caregiver
  const activeShift = await prisma.shift.findFirst({
    where: {
      caregiverId: session.user.id,
      clockOut: null,
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  // Get last 10 completed shifts for this caregiver/patient
  const recentShifts = await prisma.shift.findMany({
    where: {
      caregiverId: session.user.id,
      clockOut: { not: null },
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: { clockIn: "desc" },
    take: 10,
  });

  return NextResponse.json({ activeShift, recentShifts });
}

// POST /api/shifts - Clock in
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientId } = await request.json();
  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  // Verify caregiver is authorized to work with this patient (same org)
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      ...(session.user.organizationId
        ? { organizationId: session.user.organizationId }
        : { userId: session.user.id }),
    },
  });
  if (!patient) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Prevent double clock-in for same patient
  const existingActive = await prisma.shift.findFirst({
    where: { caregiverId: session.user.id, patientId, clockOut: null },
  });
  if (existingActive) {
    return NextResponse.json({ error: "You are already clocked in for this patient" }, { status: 400 });
  }

  const shift = await prisma.shift.create({
    data: {
      caregiverId: session.user.id,
      patientId,
      clockIn: new Date(),
    },
    include: {
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  await auditLog({
    userId: session.user.id,
    action: "shift.clock_in",
    resourceId: shift.id,
    resourceType: "shift",
    request,
    metadata: { patientId },
  });

  return NextResponse.json(shift);
}

// PATCH /api/shifts - Clock out
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shiftId, notes } = await request.json();
  if (!shiftId) {
    return NextResponse.json({ error: "Shift ID is required" }, { status: 400 });
  }

  // Verify the shift belongs to this caregiver and is still open
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, caregiverId: session.user.id, clockOut: null },
  });
  if (!shift) {
    return NextResponse.json({ error: "Active shift not found" }, { status: 404 });
  }

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: { clockOut: new Date(), notes },
  });

  await auditLog({
    userId: session.user.id,
    action: "shift.clock_out",
    resourceId: shiftId,
    resourceType: "shift",
    request,
    metadata: { patientId: shift.patientId },
  });

  return NextResponse.json(updated);
}
