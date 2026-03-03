import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// GET /api/admin/shifts - List all org shifts
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const caregiverId = searchParams.get("caregiverId");
  const patientId = searchParams.get("patientId");
  const days = parseInt(searchParams.get("days") || "30");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const shifts = await prisma.shift.findMany({
    where: {
      caregiver: { organizationId: session.user.organizationId },
      clockIn: { gte: since },
      ...(caregiverId ? { caregiverId } : {}),
      ...(patientId ? { patientId } : {}),
    },
    include: {
      caregiver: { select: { id: true, name: true, email: true } },
      patient: { select: { id: true, user: { select: { name: true } } } },
    },
    orderBy: { clockIn: "desc" },
  });

  const result = shifts.map((s) => ({
    id: s.id,
    caregiver: s.caregiver,
    patientId: s.patientId,
    patientName: s.patient.user.name,
    clockIn: s.clockIn,
    clockOut: s.clockOut,
    notes: s.notes,
    durationMinutes: s.clockOut
      ? Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000)
      : null,
  }));

  return NextResponse.json({ shifts: result });
}
