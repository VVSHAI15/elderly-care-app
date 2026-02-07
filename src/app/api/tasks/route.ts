import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { notifyFamilyOfTaskCompletion, sendNotification } from "@/lib/notifications";
import { pusherServer, getPatientChannel, PUSHER_EVENTS } from "@/lib/pusher";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      patientId,
      ...(status && { status: status as never }),
      ...(category && { category: category as never }),
    },
    include: {
      medication: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const task = await prisma.task.create({
    data: {
      patientId: body.patientId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      dueTime: body.dueTime,
      isRecurring: body.isRecurring || false,
      recurrence: body.recurrence,
      priority: body.priority || "MEDIUM",
      category: body.category || "OTHER",
      medicationId: body.medicationId,
      assignedToId: body.assignedToId || null,
    },
    include: {
      medication: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  // Notify via Pusher
  await pusherServer.trigger(getPatientChannel(body.patientId), PUSHER_EVENTS.TASK_CREATED, task);

  // Notify the assigned user
  if (body.assignedToId) {
    await sendNotification({
      userId: body.assignedToId,
      taskId: task.id,
      type: "TASK_REMINDER",
      title: "New task assigned to you",
      message: `"${task.title}" has been assigned to you.${task.dueTime ? ` Due at ${task.dueTime}.` : ""}`,
    });
  }

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  // Handle dueDate conversion
  if (updateData.dueDate) {
    updateData.dueDate = new Date(updateData.dueDate);
  }

  // Handle task completion
  if (updateData.status === "COMPLETED") {
    updateData.completedAt = new Date();
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      medication: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      patient: {
        include: {
          user: true,
        },
      },
    },
  });

  // Notify family members if task was completed
  if (updateData.status === "COMPLETED") {
    await notifyFamilyOfTaskCompletion({
      patientId: task.patientId,
      taskId: task.id,
      taskTitle: task.title,
      completedAt: task.completedAt!,
      patientName: task.patient.user.name || "Your loved one",
    });
  }

  // Notify via Pusher
  await pusherServer.trigger(getPatientChannel(task.patientId), PUSHER_EVENTS.TASK_UPDATED, task);

  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  await prisma.task.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
