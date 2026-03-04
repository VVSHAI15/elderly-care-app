import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { notifyFamilyOfTaskCompletion, sendNotification } from "@/lib/notifications";
import { pusherServer, getPatientChannel, PUSHER_EVENTS } from "@/lib/pusher";

async function canAccessPatient(patientId: string, userId: string, role: string, orgId?: string | null) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { familyMembers: { select: { id: true } } },
  });
  if (!patient) return false;
  const isOwner = patient.userId === userId;
  const isConnected = patient.familyMembers.some((f) => f.id === userId);
  const isAdmin = role === "ADMIN";
  const isOrgMember =
    (role === "CAREGIVER" || role === "ADMIN") &&
    orgId &&
    (patient as unknown as { organizationId?: string | null }).organizationId === orgId;
  return isOwner || isConnected || isAdmin || isOrgMember;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const allowed = await canAccessPatient(patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: {
      patientId,
      ...(status && {
        status: status === "PENDING"
          ? { in: ["PENDING", "OVERDUE"] as never }
          : (status as never),
      }),
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const allowed = await canAccessPatient(body.patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  // Verify the task belongs to a patient the user can access
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { patientId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const allowed = await canAccessPatient(existing.patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  // Verify access before deleting
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { patientId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const allowed = await canAccessPatient(existing.patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
