import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notifyFamilyOfTaskOverdue } from "@/lib/notifications";
import { pusherServer, getPatientChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const now = new Date();

  // Find all PENDING or IN_PROGRESS tasks that are past their due date
  const overdueTasks = await prisma.task.findMany({
    where: {
      patientId,
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
      patientId,
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

  // Filter today's tasks by time
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const overdueToday = todayTasks.filter(
    (task) => task.dueTime && task.dueTime < currentTime
  );

  const allOverdue = [...overdueTasks, ...overdueToday];

  // Deduplicate by id
  const uniqueOverdue = allOverdue.filter(
    (task, index, self) => self.findIndex((t) => t.id === task.id) === index
  );

  // Update status and send notifications for newly overdue tasks
  const updatedTasks = await Promise.all(
    uniqueOverdue.map(async (task) => {
      // Only update if not already OVERDUE
      if (task.status !== "OVERDUE") {
        const updated = await prisma.task.update({
          where: { id: task.id },
          data: { status: "OVERDUE" },
        });

        // Send notifications
        await notifyFamilyOfTaskOverdue({
          patientId: task.patientId,
          taskId: task.id,
          taskTitle: task.title,
          dueDate: task.dueDate!,
          dueTime: task.dueTime || undefined,
          patientName: task.patient.user.name || "Your loved one",
        });

        // Pusher real-time update
        await pusherServer.trigger(
          getPatientChannel(task.patientId),
          PUSHER_EVENTS.TASK_UPDATED,
          updated
        );

        return updated;
      }
      return task;
    })
  );

  return NextResponse.json({
    overdueCount: updatedTasks.length,
    tasks: updatedTasks,
  });
}
