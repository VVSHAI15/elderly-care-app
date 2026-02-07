import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notifyFamilyOfTaskOverdue } from "@/lib/notifications";
import { pusherServer, getPatientChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  const now = new Date();

  try {
    // Find all PENDING or IN_PROGRESS tasks past their due date
    const overdueTasks = await prisma.task.findMany({
      where: {
        ...(patientId && { patientId }),
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { lt: now },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    // Also check tasks due today but past their due time
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayTasks = await prisma.task.findMany({
      where: {
        ...(patientId && { patientId }),
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueDate: { gte: todayStart, lte: todayEnd },
        dueTime: { not: null },
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const overdueToday = todayTasks.filter(
      (task) => task.dueTime && task.dueTime < currentTime
    );

    // Combine and deduplicate
    const allOverdue = [...overdueTasks, ...overdueToday];
    const uniqueOverdue = allOverdue.filter(
      (task, index, self) => self.findIndex((t) => t.id === task.id) === index
    );

    let updatedCount = 0;

    for (const task of uniqueOverdue) {
      if (task.status !== "OVERDUE") {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: "OVERDUE" },
        });

        await notifyFamilyOfTaskOverdue({
          patientId: task.patientId,
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate!,
          dueTime: task.dueTime || undefined,
          patientName: task.patient.user.name || "Your loved one",
        });

        await pusherServer.trigger(
          getPatientChannel(task.patientId),
          PUSHER_EVENTS.TASK_UPDATED,
          { id: task.id, status: "OVERDUE" }
        );

        updatedCount++;
      }
    }

    return NextResponse.json({
      overdueCount: uniqueOverdue.length,
      newlyOverdue: updatedCount,
    });
  } catch (error) {
    console.error("Error checking overdue tasks:", error);
    return NextResponse.json(
      { error: "Failed to check overdue tasks" },
      { status: 500 }
    );
  }
}
