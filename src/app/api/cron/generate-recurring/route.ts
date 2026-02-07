import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  try {
    // Find all recurring tasks that have been completed
    const completedRecurring = await prisma.task.findMany({
      where: {
        isRecurring: true,
        status: "COMPLETED",
        ...(patientId && { patientId }),
      },
    });

    let createdCount = 0;

    for (const task of completedRecurring) {
      // Check if recurrence is due
      const shouldGenerate = checkRecurrenceDue(task.recurrence, task.completedAt, now);
      if (!shouldGenerate) continue;

      // Check if a PENDING task with same title already exists for today
      const existing = await prisma.task.findFirst({
        where: {
          patientId: task.patientId,
          title: task.title,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { gte: todayStart, lte: todayEnd },
        },
      });

      if (existing) continue;

      // Also check for tasks with no due date but same title that are pending
      const existingNoDue = await prisma.task.findFirst({
        where: {
          patientId: task.patientId,
          title: task.title,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: null,
        },
      });

      if (existingNoDue) continue;

      // Create new task instance
      await prisma.task.create({
        data: {
          patientId: task.patientId,
          title: task.title,
          description: task.description,
          dueDate: now,
          dueTime: task.dueTime,
          isRecurring: true,
          recurrence: task.recurrence,
          priority: task.priority,
          category: task.category,
          medicationId: task.medicationId,
          assignedToId: task.assignedToId,
        },
      });

      createdCount++;
    }

    return NextResponse.json({
      generated: createdCount,
      checked: completedRecurring.length,
    });
  } catch (error) {
    console.error("Error generating recurring tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate recurring tasks" },
      { status: 500 }
    );
  }
}

function checkRecurrenceDue(
  recurrence: string | null,
  completedAt: Date | null,
  now: Date
): boolean {
  if (!completedAt) return false;

  const diffMs = now.getTime() - completedAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  switch (recurrence) {
    case "daily":
      return diffHours >= 12; // At least 12 hours since last completion
    case "weekly":
      return diffHours >= 144; // At least 6 days
    case "monthly":
      return diffHours >= 672; // At least 28 days
    default:
      return diffHours >= 12; // Default to daily
  }
}
