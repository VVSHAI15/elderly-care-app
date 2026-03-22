import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import OpenAI from "openai";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Tool definitions ─────────────────────────────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_schedule",
      description:
        "Get scheduled shifts for the organization within a date range. Use this for any scheduling questions.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date YYYY-MM-DD" },
          endDate: { type: "string", description: "End date YYYY-MM-DD" },
          caregiverId: { type: "string", description: "Filter by caregiver ID (optional)" },
          patientId: { type: "string", description: "Filter by patient ID (optional)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_open_shifts",
      description: "Get shifts that need coverage — missed or marked as needing a replacement.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_caregivers",
      description: "List all caregivers in the organization with their current working status.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_patients",
      description: "List patients in the organization with assigned caregivers.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_available_caregivers",
      description:
        "Find caregivers who have no scheduled shifts during a given time window — i.e. who is free at a certain time.",
      parameters: {
        type: "object",
        properties: {
          startTime: { type: "string", description: "Window start as ISO datetime, e.g. 2026-03-22T09:00:00" },
          endTime: { type: "string", description: "Window end as ISO datetime, e.g. 2026-03-22T13:00:00" },
        },
        required: ["startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_tasks",
      description: "Get today's tasks for a specific patient or all assigned patients.",
      parameters: {
        type: "object",
        properties: {
          patientId: {
            type: "string",
            description: "Patient ID — omit for all patients you can access",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_shift",
      description:
        "Move a scheduled shift to a new date/time. Optionally reassign it to a different caregiver at the same time.",
      parameters: {
        type: "object",
        properties: {
          shiftId: { type: "string", description: "The shift ID to reschedule" },
          newStartTime: { type: "string", description: "New start time as ISO datetime" },
          newEndTime: { type: "string", description: "New end time as ISO datetime" },
          newCaregiverId: {
            type: "string",
            description: "Reassign to a different caregiver ID (optional — keep same caregiver if omitted)",
          },
        },
        required: ["shiftId", "newStartTime", "newEndTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reassign_shift",
      description: "Assign an existing shift to a different caregiver without changing the time.",
      parameters: {
        type: "object",
        properties: {
          shiftId: { type: "string", description: "The shift ID to reassign" },
          caregiverId: { type: "string", description: "The new caregiver's user ID" },
        },
        required: ["shiftId", "caregiverId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_callout",
      description:
        "Caregiver reports they cannot make a scheduled shift. Notifies admin and marks shift as needing coverage.",
      parameters: {
        type: "object",
        properties: {
          shiftId: { type: "string", description: "Shift ID (optional — will auto-detect next shift)" },
          reason: {
            type: "string",
            description: "Reason for callout (e.g. illness, transportation, family emergency)",
          },
          canArriveLate: {
            type: "boolean",
            description: "Whether caregiver can arrive late instead of missing entirely",
          },
          lateArrivalTime: {
            type: "string",
            description: "Estimated late arrival time if arriving late (e.g. '10:30 AM')",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_patient",
      description: "Create a new patient record in the organization. Only admins can do this. Ask for name and email if not provided.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Patient's full name" },
          email: { type: "string", description: "Patient's email address" },
          dateOfBirth: { type: "string", description: "Date of birth YYYY-MM-DD (optional)" },
          medicalNotes: { type: "string", description: "Any initial medical notes (optional)" },
          emergencyContact: { type: "string", description: "Emergency contact info (optional)" },
        },
        required: ["name", "email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_caregiver",
      description: "Create a new caregiver account in the organization. Only admins can do this. Ask for name and email if not provided.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Caregiver's full name" },
          email: { type: "string", description: "Caregiver's email address" },
        },
        required: ["name", "email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_caregiver_to_patient",
      description: "Assign a caregiver to a patient. Use get_caregivers and get_patients to find IDs first if needed.",
      parameters: {
        type: "object",
        properties: {
          caregiverId: { type: "string", description: "The caregiver's user ID" },
          patientId: { type: "string", description: "The patient's ID" },
        },
        required: ["caregiverId", "patientId"],
      },
    },
  },
];

// ── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
  orgId: string | null,
  role: string
): Promise<unknown> {
  switch (name) {
    case "get_schedule": {
      const start = new Date(args.startDate as string);
      const end = new Date(args.endDate as string);
      end.setHours(23, 59, 59, 999);

      const where: Record<string, unknown> = { startTime: { gte: start, lte: end } };
      if (orgId) where.patient = { organizationId: orgId };
      if (args.caregiverId) where.caregiverId = args.caregiverId;
      if (args.patientId) where.patientId = args.patientId;
      if (role === "CAREGIVER") where.caregiverId = userId;

      const shifts = await prisma.scheduledShift.findMany({
        where,
        include: {
          caregiver: { select: { id: true, name: true } },
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startTime: "asc" },
        take: 50,
      });

      return shifts.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        caregiver: s.caregiver?.name ?? "Unassigned",
        caregiverId: s.caregiver?.id ?? null,
        patient: s.patient?.user?.name ?? "Unknown",
        notes: s.notes,
      }));
    }

    case "get_open_shifts": {
      const shifts = await prisma.scheduledShift.findMany({
        where: {
          status: { in: ["MISSED", "NEEDS_COVERAGE"] },
          ...(orgId ? { patient: { organizationId: orgId } } : {}),
          startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        include: {
          caregiver: { select: { name: true } },
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startTime: "asc" },
        take: 20,
      });

      return shifts.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        status: s.status,
        caregiver: s.caregiver?.name ?? "Unassigned",
        patient: s.patient?.user?.name ?? "Unknown",
        notes: s.notes,
      }));
    }

    case "get_caregivers": {
      if (!orgId) return { error: "No organization found" };
      const caregivers = await prisma.user.findMany({
        where: { organizationId: orgId, role: "CAREGIVER" },
        select: {
          id: true,
          name: true,
          email: true,
          caregiverShifts: {
            where: { clockOut: null },
            select: { id: true, clockIn: true },
            take: 1,
          },
        },
      });
      return caregivers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        currentlyWorking: c.caregiverShifts.length > 0,
      }));
    }

    case "get_patients": {
      if (!orgId) return { error: "No organization found" };
      const patients = await prisma.patient.findMany({
        where: { organizationId: orgId },
        include: {
          user: { select: { name: true, email: true } },
          familyMembers: { where: { role: "CAREGIVER" }, select: { id: true, name: true } },
        },
        take: 30,
      });
      return patients.map((p) => ({
        id: p.id,
        name: p.user.name,
        assignedCaregivers: p.familyMembers.map((c) => ({ id: c.id, name: c.name })),
      }));
    }

    case "get_available_caregivers": {
      if (!orgId) return { error: "No organization found" };
      const windowStart = new Date(args.startTime as string);
      const windowEnd = new Date(args.endTime as string);

      // Find caregivers with a conflicting scheduled shift in this window
      const busyCaregiverIds = await prisma.scheduledShift.findMany({
        where: {
          patient: { organizationId: orgId },
          status: { notIn: ["MISSED", "CANCELLED"] },
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart },
          caregiverId: { not: null },
        },
        select: { caregiverId: true },
      });

      const busyIds = new Set(busyCaregiverIds.map((s) => s.caregiverId).filter(Boolean));

      const allCaregivers = await prisma.user.findMany({
        where: { organizationId: orgId, role: "CAREGIVER" },
        select: { id: true, name: true, email: true },
      });

      const available = allCaregivers.filter((c) => !busyIds.has(c.id));
      const busy = allCaregivers.filter((c) => busyIds.has(c.id));

      return {
        windowStart,
        windowEnd,
        available: available.map((c) => ({ id: c.id, name: c.name })),
        busy: busy.map((c) => ({ id: c.id, name: c.name })),
        summary: `${available.length} caregiver(s) free, ${busy.length} caregiver(s) busy during this window.`,
      };
    }

    case "get_today_tasks": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: Record<string, unknown> = { dueDate: { gte: today, lt: tomorrow } };

      if (args.patientId) {
        where.patientId = args.patientId;
      } else if (role === "CAREGIVER") {
        const caregiver = await prisma.user.findUnique({
          where: { id: userId },
          select: { familyOf: { select: { id: true } } },
        });
        where.patientId = { in: caregiver?.familyOf.map((p) => p.id) ?? [] };
      } else if (orgId) {
        where.patient = { organizationId: orgId };
      }

      const tasks = await prisma.task.findMany({
        where,
        include: { patient: { include: { user: { select: { name: true } } } } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 50,
      });

      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        patient: t.patient?.user?.name ?? "Unknown",
        category: t.category,
        dueDate: t.dueDate,
      }));
    }

    case "reschedule_shift": {
      if (role !== "ADMIN") return { error: "Only admins can reschedule shifts." };

      const shift = await prisma.scheduledShift.findUnique({
        where: { id: args.shiftId as string },
        include: {
          caregiver: { select: { name: true } },
          patient: { include: { user: { select: { name: true } } } },
        },
      });
      if (!shift) return { error: "Shift not found." };
      if (shift.patient?.organizationId !== orgId) return { error: "Shift is not in your organization." };

      const updateData: Record<string, unknown> = {
        startTime: new Date(args.newStartTime as string),
        endTime: new Date(args.newEndTime as string),
      };
      if (args.newCaregiverId) updateData.caregiverId = args.newCaregiverId;

      const updated = await prisma.scheduledShift.update({
        where: { id: args.shiftId as string },
        data: updateData,
        include: {
          caregiver: { select: { name: true } },
          patient: { include: { user: { select: { name: true } } } },
        },
      });

      return {
        success: true,
        shiftId: updated.id,
        message: `Shift for ${updated.patient?.user?.name ?? "patient"} moved to ${updated.startTime.toLocaleString()} – ${updated.endTime?.toLocaleString() ?? ""}. Assigned to: ${updated.caregiver?.name ?? "Unassigned"}.`,
      };
    }

    case "reassign_shift": {
      if (role !== "ADMIN") return { error: "Only admins can reassign shifts." };

      const shift = await prisma.scheduledShift.findUnique({
        where: { id: args.shiftId as string },
        include: { patient: { select: { organizationId: true } } },
      });
      if (!shift) return { error: "Shift not found." };
      if (shift.patient?.organizationId !== orgId) return { error: "Shift is not in your organization." };

      const caregiver = await prisma.user.findUnique({
        where: { id: args.caregiverId as string },
        select: { name: true, role: true, organizationId: true },
      });
      if (!caregiver || caregiver.role !== "CAREGIVER") return { error: "Caregiver not found." };
      if (caregiver.organizationId !== orgId) return { error: "Caregiver is not in your organization." };

      await prisma.scheduledShift.update({
        where: { id: args.shiftId as string },
        data: { caregiverId: args.caregiverId as string, status: "SCHEDULED" },
      });

      return {
        success: true,
        message: `Shift reassigned to ${caregiver.name}.`,
      };
    }

    case "report_callout": {
      if (role !== "CAREGIVER") return { error: "Only caregivers can report callouts." };

      let shiftId = args.shiftId as string | undefined;
      if (!shiftId) {
        const next = await prisma.scheduledShift.findFirst({
          where: { caregiverId: userId, startTime: { gte: new Date() }, status: "SCHEDULED" },
          orderBy: { startTime: "asc" },
        });
        shiftId = next?.id;
      }

      if (!shiftId) return { error: "No upcoming scheduled shift found to report a callout for." };

      const reason = args.reason as string;
      const canArriveLate = args.canArriveLate as boolean | undefined;
      const lateTime = args.lateArrivalTime as string | undefined;
      const noteText = `Callout: ${reason}${canArriveLate ? ` (can arrive late at ${lateTime ?? "unspecified time"})` : ""}`;

      await prisma.scheduledShift.update({
        where: { id: shiftId },
        data: { status: "NEEDS_COVERAGE", notes: noteText },
      });

      if (orgId) {
        const admins = await prisma.user.findMany({
          where: { organizationId: orgId, role: "ADMIN" },
          select: { id: true },
        });
        const caregiver = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.id,
                title: "Shift Needs Coverage",
                message: `${caregiver?.name ?? "A caregiver"} reported a callout. Reason: ${reason}. Please arrange coverage.`,
                type: "SHIFT_REQUEST",
              },
            })
          )
        );
      }

      return {
        success: true,
        shiftId,
        message: "Your callout has been recorded and the office has been notified. They will arrange coverage.",
      };
    }

    case "create_patient": {
      if (role !== "ADMIN") return { error: "Only admins can create patients." };
      if (!orgId) return { error: "No organization found." };
      const existingP = await prisma.user.findUnique({ where: { email: args.email as string } });
      if (existingP) return { error: `A user with email ${args.email} already exists.` };
      const tempPassP = Math.random().toString(36).slice(-10);
      const hashedP = await bcrypt.hash(tempPassP, 12);
      const resultP = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: args.email as string, password: hashedP, name: args.name as string, role: "PATIENT" },
        });
        const patient = await tx.patient.create({
          data: {
            userId: user.id,
            organizationId: orgId,
            dateOfBirth: args.dateOfBirth ? new Date(args.dateOfBirth as string) : null,
            medicalNotes: (args.medicalNotes as string) ?? null,
            emergencyContact: (args.emergencyContact as string) ?? null,
          },
        });
        return { user, patient };
      });
      return {
        success: true,
        patientId: resultP.patient.id,
        name: resultP.user.name,
        email: resultP.user.email,
        temporaryPassword: tempPassP,
        message: `Patient ${resultP.user.name} created. Temporary login password: ${tempPassP}`,
      };
    }

    case "create_caregiver": {
      if (role !== "ADMIN") return { error: "Only admins can create caregivers." };
      if (!orgId) return { error: "No organization found." };
      const existingC = await prisma.user.findUnique({ where: { email: args.email as string } });
      if (existingC) return { error: `A user with email ${args.email} already exists.` };
      const tempPassC = Math.random().toString(36).slice(-10);
      const hashedC = await bcrypt.hash(tempPassC, 12);
      const caregiver = await prisma.user.create({
        data: {
          email: args.email as string,
          password: hashedC,
          name: args.name as string,
          role: "CAREGIVER",
          organizationId: orgId,
        },
      });
      return {
        success: true,
        caregiverId: caregiver.id,
        name: caregiver.name,
        email: caregiver.email,
        temporaryPassword: tempPassC,
        message: `Caregiver ${caregiver.name} created. Temporary login password: ${tempPassC}`,
      };
    }

    case "assign_caregiver_to_patient": {
      if (role !== "ADMIN") return { error: "Only admins can assign caregivers." };
      const patientA = await prisma.patient.findUnique({
        where: { id: args.patientId as string },
        select: { organizationId: true, familyMembers: { select: { id: true } } },
      });
      if (!patientA) return { error: "Patient not found." };
      if (patientA.organizationId !== orgId) return { error: "Patient is not in your organization." };
      const caregiverA = await prisma.user.findUnique({
        where: { id: args.caregiverId as string },
        select: { organizationId: true, name: true, role: true },
      });
      if (!caregiverA || caregiverA.role !== "CAREGIVER") return { error: "Caregiver not found." };
      if (caregiverA.organizationId !== orgId) return { error: "Caregiver is not in your organization." };
      if (patientA.familyMembers.some((m) => m.id === args.caregiverId)) {
        return { error: `${caregiverA.name} is already assigned to this patient.` };
      }
      await prisma.patient.update({
        where: { id: args.patientId as string },
        data: { familyMembers: { connect: { id: args.caregiverId as string } } },
      });
      return { success: true, message: `${caregiverA.name} has been assigned to the patient.` };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages are required" }, { status: 400 });
  }

  const { id: userId, role, organizationId: orgId, name } = session.user;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleLabel =
    role === "ADMIN" ? "admin/coordinator"
    : role === "CAREGIVER" ? "caregiver"
    : role === "FAMILY_MEMBER" ? "family member"
    : "patient";

  const systemPrompt = `You are Guardian AI, a scheduling and operations assistant for a home care agency. You help staff manage shifts, coverage, and care tasks.

Today is ${today}.
You are speaking with ${name ?? "a user"}, who is a ${roleLabel}.

Guidelines:
- Never share one patient's data with another patient or unauthorized user.
- For caregivers: only show their own shifts and assigned patients' tasks.
- For admins: you can show org-wide scheduling data and take actions.
- Keep responses concise and action-oriented. Use bullet points for lists.
- If asked about medical advice, say you cannot provide that and suggest they contact the care team.
- When asked who is free or available at a time, use get_available_caregivers.
- When asked to move or reschedule a shift, use reschedule_shift. Look up the shift ID via get_schedule first if needed.
- When asked to reassign a shift to someone else, use reassign_shift.
- When a caregiver reports they cannot make a shift, use report_callout.
- Always confirm before taking any write action (reschedule, reassign, callout).`;

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  // Agentic loop — resolve tool calls until the model is done
  for (let step = 0; step < 6; step++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    chatMessages.push(choice.message);

    if (choice.finish_reason !== "tool_calls") {
      return NextResponse.json({ reply: choice.message.content });
    }

    const toolResults = await Promise.all(
      (choice.message.tool_calls ?? []).map(async (tc) => {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await executeTool(tc.function.name, args, userId, orgId ?? null, role ?? "");
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
      })
    );

    chatMessages.push(...toolResults);
  }

  return NextResponse.json({ reply: "I was unable to complete that request. Please try again." });
}
