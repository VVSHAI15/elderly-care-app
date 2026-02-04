import { Resend } from "resend";
import { pusherServer, getFamilyChannel, PUSHER_EVENTS } from "./pusher";
import prisma from "./db";

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface NotificationPayload {
  userId: string;
  taskId?: string;
  type: "TASK_REMINDER" | "TASK_COMPLETED" | "TASK_OVERDUE" | "MEDICATION_REFILL" | "APPOINTMENT_REMINDER" | "SYSTEM";
  title: string;
  message: string;
}

interface TaskCompletedPayload {
  patientId: string;
  taskId: string;
  taskTitle: string;
  completedAt: Date;
  patientName: string;
}

export async function sendNotification(payload: NotificationPayload) {
  const { userId, taskId, type, title, message } = payload;

  // Create notification record in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      taskId,
      type,
      title,
      message,
    },
    include: {
      user: true,
    },
  });

  // Send real-time notification via Pusher
  await pusherServer.trigger(`user-${userId}`, PUSHER_EVENTS.NOTIFICATION, {
    id: notification.id,
    type,
    title,
    message,
    sentAt: notification.sentAt,
  });

  // Send email notification
  const emailClient = getResendClient();
  if (notification.user.email && emailClient) {
    try {
      await emailClient.emails.send({
        from: "CareCheck <notifications@carecheck.app>",
        to: notification.user.email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${title}</h2>
            <p style="color: #374151; font-size: 16px;">${message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 14px;">
              This notification was sent from CareCheck.
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">View Dashboard</a>
            </p>
          </div>
        `,
      });

      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  return notification;
}

export async function notifyFamilyOfTaskCompletion(payload: TaskCompletedPayload) {
  const { patientId, taskId, taskTitle, completedAt, patientName } = payload;

  // Get all family members for this patient
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      familyMembers: true,
    },
  });

  if (!patient) return;

  // Send real-time notification to family channel
  await pusherServer.trigger(getFamilyChannel(patientId), PUSHER_EVENTS.TASK_COMPLETED, {
    taskId,
    taskTitle,
    completedAt: completedAt.toISOString(),
    patientName,
  });

  // Send individual notifications to each family member
  const notificationPromises = patient.familyMembers.map((member) =>
    sendNotification({
      userId: member.id,
      taskId,
      type: "TASK_COMPLETED",
      title: `${patientName} completed a task`,
      message: `"${taskTitle}" was completed at ${completedAt.toLocaleTimeString()}.`,
    })
  );

  await Promise.all(notificationPromises);
}

export async function sendTaskReminder(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!task) return;

  await sendNotification({
    userId: task.patient.userId,
    taskId: task.id,
    type: "TASK_REMINDER",
    title: "Task Reminder",
    message: `Don't forget: "${task.title}" is due ${task.dueTime ? `at ${task.dueTime}` : "today"}.`,
  });
}
