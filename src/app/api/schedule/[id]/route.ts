import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// PATCH /api/schedule/[id] - Update a scheduled shift (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { caregiverId, patientId, startTime, endTime, status, notes } = body;

  const existing = await prisma.scheduledShift.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const newStart = startTime ? new Date(startTime) : existing.startTime;
  const newEnd = endTime ? new Date(endTime) : existing.endTime;
  const newCaregiver = caregiverId ?? existing.caregiverId;
  const newPatient = patientId ?? existing.patientId;

  if (newEnd <= newStart) {
    return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
  }

  // Overlap checks (exclude current shift)
  if (startTime || endTime || caregiverId) {
    const caregiverConflict = await prisma.scheduledShift.findFirst({
      where: {
        id: { not: id },
        caregiverId: newCaregiver,
        status: { not: "CANCELLED" },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });
    if (caregiverConflict) {
      return NextResponse.json(
        { error: "Caregiver already has a shift during this time" },
        { status: 409 }
      );
    }
  }

  if (startTime || endTime || patientId) {
    const patientConflict = await prisma.scheduledShift.findFirst({
      where: {
        id: { not: id },
        patientId: newPatient,
        status: { not: "CANCELLED" },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });
    if (patientConflict) {
      return NextResponse.json(
        { error: "Patient already has a caregiver scheduled during this time" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.scheduledShift.update({
    where: { id },
    data: {
      ...(caregiverId && { caregiverId }),
      ...(patientId && { patientId }),
      ...(startTime && { startTime: newStart }),
      ...(endTime && { endTime: newEnd }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      caregiver: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/schedule/[id] - Cancel/delete a scheduled shift (admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.scheduledShift.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // Soft-cancel rather than hard-delete to preserve request history
  const cancelled = await prisma.scheduledShift.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(cancelled);
}
