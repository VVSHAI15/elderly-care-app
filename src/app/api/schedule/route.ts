import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

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

  // Build where clause based on role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (role === "CAREGIVER") {
    // Caregivers can only see their own shifts (or their org's open shifts)
    where.caregiverId = session.user.id;
  } else if (role === "PATIENT") {
    // Patients see shifts for their own patient record
    const patient = await prisma.patient.findFirst({
      where: { userId: session.user.id },
    });
    if (patient) where.patientId = patient.id;
  } else if (role === "ADMIN") {
    // Admins see all shifts in their org
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    if (admin?.organizationId) {
      where.patient = { organizationId: admin.organizationId };
    }
    // Allow further filtering
    if (patientId) where.patientId = patientId;
    if (caregiverId) where.caregiverId = caregiverId;
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

  const body = await request.json();
  const { caregiverId, patientId, startTime, endTime, notes } = body;

  if (!caregiverId || !patientId || !startTime || !endTime) {
    return NextResponse.json(
      { error: "caregiverId, patientId, startTime, and endTime are required" },
      { status: 400 }
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
  }

  // Check caregiver overlap - same caregiver can't have two overlapping scheduled shifts
  const caregiverConflict = await prisma.scheduledShift.findFirst({
    where: {
      caregiverId,
      status: { not: "CANCELLED" },
      // Overlap: existing.start < new.end AND existing.end > new.start
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

  // Check patient overlap - same patient can't have two caregivers at the same time
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

  return NextResponse.json(shift, { status: 201 });
}
