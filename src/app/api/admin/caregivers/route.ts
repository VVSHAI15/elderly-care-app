import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// GET /api/admin/caregivers - List all caregivers in the org
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  const caregivers = await prisma.user.findMany({
    where: { organizationId: orgId, role: "CAREGIVER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      caregiverShifts: {
        select: { id: true, clockIn: true, clockOut: true, patientId: true },
        orderBy: { clockIn: "desc" },
        take: 50,
      },
      familyOf: {
        select: { id: true, user: { select: { name: true } } },
      },
    },
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const result = caregivers.map((c) => {
    const weekShifts = c.caregiverShifts.filter((s) => new Date(s.clockIn) >= weekAgo);
    const totalMinutes = weekShifts.reduce((sum, s) => {
      if (!s.clockOut) return sum;
      return sum + (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000;
    }, 0);
    const activeShift = c.caregiverShifts.find((s) => !s.clockOut) ?? null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      joinedAt: c.createdAt,
      patientsAssigned: c.familyOf.length,
      hoursThisWeek: Math.round(totalMinutes / 60 * 10) / 10,
      shiftsThisWeek: weekShifts.length,
      activeShift,
    };
  });

  // Also include pending invites
  const pendingInvites = await prisma.inviteCode.findMany({
    where: {
      organizationId: orgId,
      inviteType: "CAREGIVER_ORG",
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, targetEmail: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({ caregivers: result, pendingInvites });
}
