/**
 * Utilities for auto-generating Tasks from care profile data
 * (exercise guidelines, follow-up appointments) and from condition protocols.
 */

import prisma from "@/lib/db";
import type { ConditionProtocol } from "@/lib/condition-protocols";

interface ExercisePhase {
  period: string;
  instructions: string;
}

interface ExerciseGuidelines {
  phases?: ExercisePhase[];
  restrictions?: string[];
}

interface FollowUpAppointment {
  priority: string;
  type: string;
  timeframe: string;
  physician?: string;
  reason?: string;
}

/**
 * Create tasks from exercise guidelines found in a care profile.
 * Creates one task per phase (recurring daily) and a reminder for restrictions.
 */
export async function createTasksFromExerciseGuidelines(
  patientId: string,
  exerciseGuidelines: ExerciseGuidelines
): Promise<number> {
  let count = 0;

  if (exerciseGuidelines.phases && exerciseGuidelines.phases.length > 0) {
    for (const phase of exerciseGuidelines.phases) {
      await prisma.task.create({
        data: {
          patientId,
          title: `Exercise — ${phase.period}`,
          description: phase.instructions,
          category: "EXERCISE",
          isRecurring: true,
          recurrence: "daily",
          priority: "MEDIUM",
        },
      });
      count++;
    }
  }

  if (exerciseGuidelines.restrictions && exerciseGuidelines.restrictions.length > 0) {
    await prisma.task.create({
      data: {
        patientId,
        title: "Review exercise restrictions",
        description: `Activity restrictions to follow:\n${exerciseGuidelines.restrictions.map((r) => `• ${r}`).join("\n")}`,
        category: "EXERCISE",
        isRecurring: false,
        priority: "HIGH",
      },
    });
    count++;
  }

  return count;
}

/**
 * Create tasks from follow-up appointments in a care profile.
 */
export async function createTasksFromFollowUpAppointments(
  patientId: string,
  followUpAppointments: FollowUpAppointment[]
): Promise<number> {
  let count = 0;

  const priorityMap: Record<string, "LOW" | "MEDIUM" | "HIGH" | "URGENT"> = {
    URGENT: "URGENT",
    REQUIRED: "HIGH",
    SCHEDULED: "MEDIUM",
    RECOMMENDED: "LOW",
  };

  for (const appt of followUpAppointments) {
    const priority = priorityMap[appt.priority] || "MEDIUM";
    const desc = [
      appt.timeframe && `Timeframe: ${appt.timeframe}`,
      appt.physician && `Provider: ${appt.physician}`,
      appt.reason && `Reason: ${appt.reason}`,
    ]
      .filter(Boolean)
      .join("\n");

    await prisma.task.create({
      data: {
        patientId,
        title: `Schedule: ${appt.type}`,
        description: desc || `Follow-up appointment: ${appt.type}`,
        category: "APPOINTMENT",
        isRecurring: false,
        priority,
      },
    });
    count++;
  }

  return count;
}

/**
 * Apply a condition protocol: creates all its tasks for the patient.
 * Skips tasks that have the same title as an existing task (deduplication).
 */
export async function createTasksFromProtocol(
  patientId: string,
  protocol: ConditionProtocol
): Promise<number> {
  // Load existing task titles to avoid duplicates
  const existingTasks = await prisma.task.findMany({
    where: { patientId, status: { not: "COMPLETED" } },
    select: { title: true },
  });
  const existingTitles = new Set(existingTasks.map((t) => t.title.toLowerCase()));

  let count = 0;
  for (const task of protocol.tasks) {
    const titleLower = task.title.toLowerCase();
    if (existingTitles.has(titleLower)) continue;

    await prisma.task.create({
      data: {
        patientId,
        title: task.title,
        description: task.description,
        category: task.category,
        isRecurring: task.isRecurring,
        recurrence: task.recurrence || null,
        priority: task.priority,
      },
    });
    existingTitles.add(titleLower);
    count++;
  }

  return count;
}

/**
 * Auto-create tasks when a care profile is saved from a document scan.
 * Runs exercise + appointment task creation if data is present.
 * Returns summary of tasks created.
 */
export async function createTasksFromCareProfile(
  patientId: string,
  careProfile: Record<string, unknown>
): Promise<{ exerciseTasks: number; appointmentTasks: number }> {
  let exerciseTasks = 0;
  let appointmentTasks = 0;

  if (careProfile.exerciseGuidelines && typeof careProfile.exerciseGuidelines === "object") {
    try {
      exerciseTasks = await createTasksFromExerciseGuidelines(
        patientId,
        careProfile.exerciseGuidelines as ExerciseGuidelines
      );
    } catch (err) {
      console.error("Failed to create exercise tasks:", err);
    }
  }

  if (Array.isArray(careProfile.followUpAppointments) && careProfile.followUpAppointments.length > 0) {
    try {
      appointmentTasks = await createTasksFromFollowUpAppointments(
        patientId,
        careProfile.followUpAppointments as FollowUpAppointment[]
      );
    } catch (err) {
      console.error("Failed to create appointment tasks:", err);
    }
  }

  return { exerciseTasks, appointmentTasks };
}
