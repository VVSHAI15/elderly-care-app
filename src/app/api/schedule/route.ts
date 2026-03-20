import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

// GET /api/schedule - List scheduled shifts
// Query params: patientId, caregiverId, from, to, status
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const patientId = searchParams.get("patientId");
  const caregiverId = searchParams.get("caregiverId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  const role = session.user.role;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (role === "CAREGIVER") {
    // Caregivers only see their own shifts — no overrides allowed
    where.caregiverId = session.user.id;
  } else if (role === "PATIENT") {
    const patient = await prisma.patient.findFirst({
      where: { userId: session.user.id },
    });
    if (patient) where.patientId = patient.id;
  } else if (role === "ADMIN") {
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (!admin?.organizationId) {
      return NextResponse.json({ error: "Admin not associated with an organization" }, { status: 403 });
    }

    // Always scope to admin's org
    where.patient = { organizationId: admin.organizationId };

    // Additional filters — validate each belongs to admin's org before applying
    if (patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, organizationId: admin.organizationId },
      });
      if (!patient) {
        return NextResponse.json({ error: "Patient not found in your organization" }, { status: 403 });
      }
      where.patientId = patientId;
    }

    if (caregiverId) {
      const caregiver = await prisma.user.findFirst({
        where: { id: caregiverId, organizationId: admin.organizationId },
      });
      if (!caregiver) {
        return NextResponse.json({ error: "Caregiver not found in your organization" }, { status: 403 });
      }
      where.caregiverId = caregiverId;
    }
  }

  if (from || to) {
    where.startTime = {};
    if (from) where.startTime.gte = new Date(from);
    if (to) where.startTime.lte = new Date(to);
  }
  if (status) where.status = status;

  const shifts = await prisma.scheduledShift.findMany({
    where,
    include: {
      caregiver: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(shifts);
}

// POST /api/schedule - Create a scheduled shift (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.organizationId) {
    return NextResponse.json({ error: "Admin not associated with an organization" }, { status: 403 });
  }

  const body = await request.json();
  const { caregiverId, patientId, startTime, endTime, notes } = body;

  if (!caregiverId || !patientId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "caregiverId, patientId, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  // Validate patient belongs to admin's org
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: session.user.organizationId },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found in your organization" }, { status: 403 });
  }

  // Validate caregiver belongs to admin's org
  const caregiver = await prisma.user.findFirst({
    where: { id: caregiverId, organizationId: session.user.organizationId },
  });
  if (!caregiver) {
    return NextResponse.json({ error: "Caregiver not found in your organization" }, { status: 403 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
  }

  // Check caregiver overlap
  const caregiverConflict = await prisma.scheduledShift.findFirst({
    where: {
      caregiverId,
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      patient: { select: { user: { select: { name: true } } } },
    },
  });

  if (caregiverConflict) {
    return NextResponse.json(
      {
        error: `Caregiver already has a scheduled shift from ${caregiverConflict.startTime.toISOString()} to ${caregiverConflict.endTime.toISOString()} for patient ${caregiverConflict.patient.user.name}`,
      },
      { status: 409 }
    );
  }

  // Check patient overlap
  const patientConflict = await prisma.scheduledShift.findFirst({
    where: {
      patientId,
      status: { not: "CANCELLED" },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      caregiver: { select: { name: true } },
    },
  });

  if (patientConflict) {
    return NextResponse.json(
      {
        error: `Patient already has a caregiver (${patientConflict.caregiver.name}) scheduled from ${patientConflict.startTime.toISOString()} to ${patientConflict.endTime.toISOString()}`,
      },
      { status: 409 }
    );
  }

  const shift = await prisma.scheduledShift.create({
    data: {
      caregiverId,
      patientId,
      startTime: start,
      endTime: end,
      notes,
      createdById: session.user.id,
    },
    include: {
      caregiver: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  await auditLog({
    userId: session.user.id,
    action: "schedule.shift_created",
    resourceId: shift.id,
    resourceType: "scheduled_shift",
    request,
    metadata: { patientId, caregiverId },
  });

  return NextResponse.json(shift, { status: 201 });
}
