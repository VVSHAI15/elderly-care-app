import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// GET /api/family/dashboard?patientId=X
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const patientId = searchParams.get("patientId");

  // Find connected patients for this user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      familyOf: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!user || user.familyOf.length === 0) {
    return NextResponse.json({ error: "No connected patients found" }, { status: 404 });
  }

  // If a specific patientId is requested, verify the user is actually connected to it
  // Return 403 — do not silently fall back to another patient
  let patient;
  if (patientId) {
    patient = user.familyOf.find((p) => p.id === patientId);
    if (!patient) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else {
    patient = user.familyOf[0];
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Task completion trend (30 days) — respect visibility
  let taskCompletionTrend: { date: string; completed: number; total: number; completionRate: number }[] = [];
  if (patient.familyCanViewTasks) {
    const tasks = await prisma.task.findMany({
      where: { patientId: patient.id, dueDate: { gte: thirtyDaysAgo } },
      select: { dueDate: true, status: true },
    });

    const trendMap: Record<string, { completed: number; total: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendMap[d.toISOString().split("T")[0]] = { completed: 0, total: 0 };
    }
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const key = new Date(t.dueDate).toISOString().split("T")[0];
      if (!trendMap[key]) continue;
      trendMap[key].total++;
      if (t.status === "COMPLETED") trendMap[key].completed++;
    }
    taskCompletionTrend = Object.entries(trendMap).map(([date, v]) => ({
      date,
      completed: v.completed,
      total: v.total,
      completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }));
  }

  // Medication adherence (last 30 days)
  let medicationAdherence: { name: string; taken: number; total: number; rate: number }[] = [];
  if (patient.familyCanViewMeds) {
    const medTasks = await prisma.task.findMany({
      where: {
        patientId: patient.id,
        category: "MEDICATION",
        dueDate: { gte: thirtyDaysAgo },
        medicationId: { not: null },
      },
      include: { medication: { select: { name: true } } },
    });

    const medMap: Record<string, { name: string; taken: number; total: number }> = {};
    for (const t of medTasks) {
      const medName = t.medication?.name || "Unknown";
      if (!medMap[medName]) medMap[medName] = { name: medName, taken: 0, total: 0 };
      medMap[medName].total++;
      if (t.status === "COMPLETED") medMap[medName].taken++;
    }
    medicationAdherence = Object.values(medMap).map((m) => ({
      ...m,
      rate: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0,
    }));
  }

  // Health metrics (last 90 days, grouped by type)
  let healthMetrics: Record<string, { date: string; value: string; unit: string | null; notes: string | null }[]> = {};
  if (patient.familyCanViewMetrics) {
    const metrics = await prisma.healthMetric.findMany({
      where: { patientId: patient.id, recordedAt: { gte: ninetyDaysAgo } },
      orderBy: { recordedAt: "asc" },
      select: { type: true, value: true, unit: true, recordedAt: true, notes: true },
    });

    for (const m of metrics) {
      if (!healthMetrics[m.type]) healthMetrics[m.type] = [];
      healthMetrics[m.type].push({
        date: m.recordedAt.toISOString(),
        value: m.value,
        unit: m.unit,
        notes: m.notes,
      });
    }
  }

  // Caregiver visits (last 30 days)
  let visits: { date: string; caregiverName: string | null; durationMinutes: number | null; notes: string | null }[] = [];
  if (patient.familyCanViewShifts) {
    const shifts = await prisma.shift.findMany({
      where: { patientId: patient.id, clockIn: { gte: thirtyDaysAgo } },
      include: { caregiver: { select: { name: true } } },
      orderBy: { clockIn: "desc" },
    });

    visits = shifts.map((s) => ({
      date: s.clockIn.toISOString(),
      caregiverName: s.caregiver.name,
      durationMinutes: s.clockOut
        ? Math.round((s.clockOut.getTime() - s.clockIn.getTime()) / 60000)
        : null,
      notes: s.notes,
    }));
  }

  // Recent activity feed (last 20 events)
  const recentTasks = await prisma.task.findMany({
    where: {
      patientId: patient.id,
      status: "COMPLETED",
      completedAt: { gte: thirtyDaysAgo },
    },
    select: { title: true, completedAt: true, category: true },
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  const recentDocs = await prisma.document.findMany({
    where: { patientId: patient.id, uploadedAt: { gte: thirtyDaysAgo } },
    select: { fileName: true, documentType: true, uploadedAt: true },
    orderBy: { uploadedAt: "desc" },
    take: 5,
  });

  const activityFeed = [
    ...recentTasks.map((t) => ({
      type: "task_completed" as const,
      label: `Completed: ${t.title}`,
      date: t.completedAt?.toISOString() || "",
      category: t.category,
    })),
    ...recentDocs.map((d) => ({
      type: "document_uploaded" as const,
      label: `Document uploaded: ${d.fileName}`,
      date: d.uploadedAt.toISOString(),
      category: d.documentType,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);

  // Overview stats (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [recentTasksCount, recentVisitsCount, activeMedsCount] = await Promise.all([
    prisma.task.count({ where: { patientId: patient.id, status: "COMPLETED", completedAt: { gte: sevenDaysAgo } } }),
    prisma.shift.count({ where: { patientId: patient.id, clockIn: { gte: sevenDaysAgo } } }),
    prisma.medication.count({ where: { patientId: patient.id, isActive: true } }),
  ]);

  return NextResponse.json({
    patient: {
      id: patient.id,
      name: patient.user.name,
      email: patient.user.email,
    },
    visibility: {
      tasks: patient.familyCanViewTasks,
      meds: patient.familyCanViewMeds,
      metrics: patient.familyCanViewMetrics,
      shifts: patient.familyCanViewShifts,
    },
    overview: {
      tasksCompletedLast7Days: recentTasksCount,
      visitsLast7Days: recentVisitsCount,
      activeMedications: activeMedsCount,
    },
    taskCompletionTrend,
    medicationAdherence,
    healthMetrics,
    visits,
    activityFeed,
  });
}
