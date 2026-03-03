import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// GET /api/admin/analytics - Company-wide analytics
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all org patients
  const orgPatients = await prisma.patient.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const patientIds = orgPatients.map((p) => p.id);

  if (patientIds.length === 0) {
    return NextResponse.json({
      totals: { patients: 0, caregivers: 0, tasksToday: 0, completedToday: 0, shiftsThisWeek: 0 },
      taskCompletionTrend: [],
      visitsPerWeek: [],
      topPatientsNeedingAttention: [],
    });
  }

  // Totals
  const [caregiverCount, todayTasks, weekShifts] = await Promise.all([
    prisma.user.count({ where: { organizationId: orgId, role: "CAREGIVER" } }),
    prisma.task.findMany({
      where: {
        patientId: { in: patientIds },
        dueDate: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      select: { status: true, patientId: true, priority: true },
    }),
    prisma.shift.findMany({
      where: {
        patientId: { in: patientIds },
        clockIn: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, clockIn: true, clockOut: true },
    }),
  ]);

  // 30-day task completion trend (daily)
  const allTasks30d = await prisma.task.findMany({
    where: {
      patientId: { in: patientIds },
      dueDate: { gte: thirtyDaysAgo },
    },
    select: { dueDate: true, status: true },
  });

  const trendMap: Record<string, { completed: number; total: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    trendMap[key] = { completed: 0, total: 0 };
  }
  for (const task of allTasks30d) {
    if (!task.dueDate) continue;
    const key = new Date(task.dueDate).toISOString().split("T")[0];
    if (!trendMap[key]) continue;
    trendMap[key].total++;
    if (task.status === "COMPLETED") trendMap[key].completed++;
  }
  const taskCompletionTrend = Object.entries(trendMap).map(([date, v]) => ({
    date,
    completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    completed: v.completed,
    total: v.total,
  }));

  // Visits per week (last 4 weeks)
  const visitsPerWeek = [];
  for (let week = 3; week >= 0; week--) {
    const weekStart = new Date(now.getTime() - (week + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    const count = await prisma.shift.count({
      where: {
        patientId: { in: patientIds },
        clockIn: { gte: weekStart, lt: weekEnd },
      },
    });
    visitsPerWeek.push({
      week: `Week ${4 - week}`,
      visits: count,
    });
  }

  // Top patients needing attention (overdue tasks)
  const overdueTasks = todayTasks.filter((t) => t.status === "OVERDUE" || t.priority === "URGENT");
  const patientAttention: Record<string, number> = {};
  for (const t of overdueTasks) {
    patientAttention[t.patientId] = (patientAttention[t.patientId] || 0) + 1;
  }
  const attentionPatientIds = Object.entries(patientAttention)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const attentionPatients = await prisma.patient.findMany({
    where: { id: { in: attentionPatientIds } },
    include: { user: { select: { name: true } } },
  });

  const topPatientsNeedingAttention = attentionPatients.map((p) => ({
    patientId: p.id,
    name: p.user.name,
    urgentCount: patientAttention[p.id] || 0,
  }));

  return NextResponse.json({
    totals: {
      patients: patientIds.length,
      caregivers: caregiverCount,
      tasksToday: todayTasks.length,
      completedToday: todayTasks.filter((t) => t.status === "COMPLETED").length,
      shiftsThisWeek: weekShifts.length,
      totalHoursThisWeek: Math.round(
        weekShifts.reduce((sum, s) => {
          if (!s.clockOut) return sum;
          return sum + (new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 3600000;
        }, 0) * 10
      ) / 10,
    },
    taskCompletionTrend,
    visitsPerWeek,
    topPatientsNeedingAttention,
  });
}
