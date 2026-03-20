import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import OpenAI from "openai";
import prisma from "@/lib/db";

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
      description:
        "Get shifts that need coverage — missed or marked as needing a replacement.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_caregivers",
      description: "List caregivers in the organization with their current working status.",
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
        assignedCaregivers: p.familyMembers.map((c) => c.name),
      }));
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
        message:
          "Your callout has been recorded and the office has been notified. They will arrange coverage.",
      };
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

  const systemPrompt = `You are Guardian AI, a scheduling and support assistant for a home care agency. You help agency staff manage shifts, tasks, and care operations.

Today is ${today}.
You are speaking with ${name ?? "a user"}, who is a ${roleLabel}.

Guidelines:
- Never share one patient's data with another patient or unauthorized user.
- For caregivers: only show their own shifts and assigned patients' tasks.
- For admins: you can show org-wide scheduling data.
- Family members and patients: you have limited scheduling tools — focus on support.
- Keep responses concise and action-oriented. Use bullet points for lists.
- If asked about medical advice, say you cannot provide that and suggest they contact the care team.
- If a caregiver reports they cannot make a shift, use the report_callout tool.
- Always confirm before taking any action (like reporting a callout).`;

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  // Agentic loop — resolve tool calls until the model is done
  for (let step = 0; step < 5; step++) {
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

    // Execute all tool calls in parallel
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
