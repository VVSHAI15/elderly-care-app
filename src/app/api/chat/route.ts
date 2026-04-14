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
  {
    type: "function",
    function: {
      name: "get_my_patient_status",
      description:
        "For family members and patients: get a full status overview for their connected patient — today's tasks, upcoming visits, recent visit history, and active medications. Use this when they ask 'how is my mom', 'what happened today', 'any updates', etc.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_visits",
      description:
        "For family members and patients: see upcoming scheduled caregiver visits for their connected patient.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "How many days ahead to look (default 7)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medications",
      description:
        "Get the active medication list for a connected patient. Respects family visibility settings.",
      parameters: {
        type: "object",
        properties: {
          patientId: { type: "string", description: "Patient ID — auto-detected for family/patient if omitted" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_care_request",
      description:
        "Family member submits a request for additional caregiver coverage for their loved one on a specific date.",
      parameters: {
        type: "object",
        properties: {
          requestedDate: { type: "string", description: "Date of requested care YYYY-MM-DD" },
          startTime: { type: "string", description: "Start time e.g. '09:00 AM'" },
          endTime: { type: "string", description: "End time e.g. '01:00 PM'" },
          urgency: { type: "string", enum: ["NORMAL", "URGENT"], description: "Urgency level (default NORMAL)" },
          notes: { type: "string", description: "Any additional notes or reason for the request (optional)" },
        },
        required: ["requestedDate", "startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_care_requests",
      description:
        "Get submitted care requests. For family members: shows their own requests and status. For admins: shows all pending requests in the org.",
      parameters: { type: "object", properties: {} },
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
      // Family members and patients should use get_my_patient_status / get_upcoming_visits
      if (role === "FAMILY_MEMBER" || role === "PATIENT") {
        return { error: "Use get_upcoming_visits to see caregiver visits for your patient." };
      }

      const start = new Date(args.startDate as string);
      const end = new Date(args.endDate as string);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: "Invalid date range. Please use YYYY-MM-DD format, e.g. '2026-04-14'." };
      }
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
      if (role === "FAMILY_MEMBER" || role === "PATIENT") {
        return { error: "This information is only available to admins and caregivers." };
      }
      if (!orgId) return { error: "No organization found." };
      const shifts = await prisma.scheduledShift.findMany({
        where: {
          status: { in: ["MISSED", "NEEDS_COVERAGE"] },
          patient: { organizationId: orgId },
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
      if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime())) {
        return { error: "Invalid time range. Please specify a date and time, e.g. 'tomorrow 9am to 5pm'." };
      }

      // Find caregivers with a conflicting scheduled shift in this window
      const busyShifts = await prisma.scheduledShift.findMany({
        where: {
          patient: { organizationId: orgId },
          status: { notIn: ["CANCELLED"] },
          startTime: { lt: windowEnd },
          endTime: { gt: windowStart },
        },
        select: { caregiverId: true },
      });

      const busyIds = new Set(busyShifts.map((s) => s.caregiverId).filter(Boolean));

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

      if (role === "PATIENT") {
        // Patient can only see their own tasks
        const patientRecord = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
        if (!patientRecord) return { error: "No patient record found for your account." };
        where.patientId = patientRecord.id;
      } else if (role === "FAMILY_MEMBER") {
        // Family members see tasks for their connected patients only
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { familyOf: { select: { id: true } } },
        });
        const ids = u?.familyOf.map((p) => p.id) ?? [];
        if (ids.length === 0) return { error: "You are not connected to any patients." };
        // If a specific patientId was requested, validate ownership
        if (args.patientId) {
          if (!ids.includes(args.patientId as string)) return { error: "You do not have access to that patient." };
          where.patientId = args.patientId;
        } else {
          where.patientId = { in: ids };
        }
      } else if (role === "CAREGIVER") {
        // Caregivers see tasks for patients assigned to them via Patient.familyMembers
        const assignedPatients = await prisma.patient.findMany({
          where: { familyMembers: { some: { id: userId } } },
          select: { id: true },
        });
        const ids = assignedPatients.map((p) => p.id);
        if (ids.length === 0) return { tasks: [], message: "You have no assigned patients with tasks today." };
        if (args.patientId) {
          if (!ids.includes(args.patientId as string)) return { error: "That patient is not assigned to you." };
          where.patientId = args.patientId;
        } else {
          where.patientId = { in: ids };
        }
      } else if (role === "ADMIN") {
        // Admin can see all tasks in their org, or filter by a specific patient
        if (args.patientId) {
          where.patientId = args.patientId;
        } else if (orgId) {
          where.patient = { organizationId: orgId };
        }
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
      if (!shift.patient) return { error: "Shift has no associated patient." };
      if (shift.patient.organizationId !== orgId) return { error: "Shift is not in your organization." };

      const newStart = new Date(args.newStartTime as string);
      const newEnd = new Date(args.newEndTime as string);
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return { error: "Invalid date/time format. Please use ISO format, e.g. '2026-04-15T09:00:00'." };
      }

      const updateData: Record<string, unknown> = {
        startTime: newStart,
        endTime: newEnd,
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
      if (!shift.patient) return { error: "Shift has no associated patient." };
      if (shift.patient.organizationId !== orgId) return { error: "Shift is not in your organization." };

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

    case "get_my_patient_status": {
      // Works for FAMILY_MEMBER and PATIENT
      let patientIds: string[] = [];

      if (role === "PATIENT") {
        const p = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
        if (p) patientIds = [p.id];
      } else {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { familyOf: { select: { id: true } } },
        });
        patientIds = u?.familyOf.map((p) => p.id) ?? [];
      }

      if (patientIds.length === 0) return { error: "No connected patients found." };

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const weekOut = new Date(today); weekOut.setDate(weekOut.getDate() + 7);

      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        include: {
          user: { select: { name: true } },
          tasks: {
            where: { dueDate: { gte: today, lt: tomorrow } },
            select: { title: true, status: true, category: true, priority: true },
          },
          medications: {
            where: { isActive: true },
            select: { name: true, dosage: true, frequency: true },
          },
          scheduledShifts: {
            where: { startTime: { gte: today, lte: weekOut } },
            include: { caregiver: { select: { name: true } } },
            orderBy: { startTime: "asc" },
            take: 5,
          },
        },
      });

      return patients.map((p) => ({
        name: p.user.name,
        todayTasks: {
          total: p.tasks.length,
          completed: p.tasks.filter((t) => t.status === "COMPLETED").length,
          pending: p.tasks.filter((t) => ["PENDING", "IN_PROGRESS"].includes(t.status)).length,
          overdue: p.tasks.filter((t) => t.status === "OVERDUE").length,
          items: p.tasks,
        },
        activeMedications: p.medications.length,
        medications: p.medications,
        upcomingVisits: p.scheduledShifts.map((s) => ({
          date: s.startTime,
          endTime: s.endTime,
          caregiver: s.caregiver?.name ?? "TBD",
          status: s.status,
        })),
      }));
    }

    case "get_upcoming_visits": {
      let patientIds: string[] = [];
      if (role === "PATIENT") {
        const p = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
        if (p) patientIds = [p.id];
      } else if (role === "FAMILY_MEMBER") {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { familyOf: { select: { id: true } } },
        });
        patientIds = u?.familyOf.map((p) => p.id) ?? [];
      } else if (orgId) {
        // Admin/caregiver fall through to get_schedule instead
        return { error: "Use get_schedule for admin or caregiver shift queries." };
      }

      if (patientIds.length === 0) return { error: "No connected patients found." };

      const days = (args.days as number) ?? 7;
      const from = new Date();
      const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const visits = await prisma.scheduledShift.findMany({
        where: { patientId: { in: patientIds }, startTime: { gte: from, lte: to } },
        include: {
          caregiver: { select: { name: true } },
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startTime: "asc" },
        take: 20,
      });

      return visits.map((v) => ({
        id: v.id,
        patient: v.patient?.user?.name ?? "Unknown",
        caregiver: v.caregiver?.name ?? "TBD",
        startTime: v.startTime,
        endTime: v.endTime,
        status: v.status,
      }));
    }

    case "get_medications": {
      let patientId = args.patientId as string | undefined;

      if (!patientId) {
        if (role === "PATIENT") {
          const p = await prisma.patient.findUnique({ where: { userId }, select: { id: true } });
          patientId = p?.id;
        } else if (role === "FAMILY_MEMBER") {
          const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { familyOf: { select: { id: true } } },
          });
          patientId = u?.familyOf[0]?.id;
        }
      }

      if (!patientId) return { error: "No patient found." };

      // Check family visibility permission
      if (role === "FAMILY_MEMBER") {
        const patient = await prisma.patient.findUnique({
          where: { id: patientId },
          select: { familyCanViewMeds: true, familyMembers: { select: { id: true } } },
        });
        if (!patient) return { error: "Patient not found." };
        if (!patient.familyMembers.some((m) => m.id === userId)) return { error: "Access denied." };
        if (!patient.familyCanViewMeds) return { error: "Medication visibility is not enabled for family members. Please contact the agency." };
      }

      const meds = await prisma.medication.findMany({
        where: { patientId, isActive: true },
        select: { name: true, dosage: true, frequency: true, instructions: true, prescriber: true },
        orderBy: { name: "asc" },
      });

      return { medications: meds, count: meds.length };
    }

    case "submit_care_request": {
      if (role !== "FAMILY_MEMBER") return { error: "Only family members can submit care requests." };

      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { familyOf: { select: { id: true } } },
      });
      const patientId = u?.familyOf[0]?.id;
      if (!patientId) return { error: "No connected patient found." };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, familyMembers: { some: { id: userId } } },
        include: {
          user: { select: { name: true } },
          organization: {
            include: { members: { where: { role: "ADMIN" }, select: { id: true } } },
          },
        },
      });
      if (!patient) return { error: "Patient not found or not connected to you." };

      const careRequest = await prisma.careRequest.create({
        data: {
          id: crypto.randomUUID(),
          patientId,
          requestedById: userId,
          requestedDate: new Date(args.requestedDate as string),
          startTime: args.startTime as string,
          endTime: args.endTime as string,
          urgency: (args.urgency as string) ?? "NORMAL",
          notes: (args.notes as string) ?? null,
        },
      });

      // Notify admins
      const userName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name ?? "Family member";
      for (const admin of patient.organization?.members ?? []) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: args.urgency === "URGENT" ? `Urgent Care Request — ${patient.user.name}` : `Care Request — ${patient.user.name}`,
            message: `${userName} is requesting a caregiver for ${patient.user.name} on ${args.requestedDate} from ${args.startTime} to ${args.endTime}.${args.notes ? ` Note: ${args.notes}` : ""}`,
            type: "CARE_REQUEST",
          },
        });
      }

      return {
        success: true,
        requestId: careRequest.id,
        message: `Care request submitted for ${patient.user.name} on ${args.requestedDate} from ${args.startTime} to ${args.endTime}. The agency has been notified.`,
      };
    }

    case "get_care_requests": {
      if (role === "FAMILY_MEMBER") {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { familyOf: { select: { id: true } } },
        });
        const patientIds = u?.familyOf.map((p) => p.id) ?? [];
        const requests = await prisma.careRequest.findMany({
          where: { patientId: { in: patientIds }, requestedById: userId },
          include: { patient: { include: { user: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        return requests.map((r) => ({
          id: r.id,
          patient: r.patient?.user?.name,
          requestedDate: r.requestedDate,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          urgency: r.urgency,
          notes: r.notes,
        }));
      }

      if (role === "ADMIN") {
        if (!orgId) return { error: "No organization found." };
        const requests = await prisma.careRequest.findMany({
          where: { patient: { organizationId: orgId } },
          include: {
            patient: { include: { user: { select: { name: true } } } },
          },
          orderBy: [{ status: "asc" }, { requestedDate: "asc" }],
          take: 20,
        });
        return requests.map((r) => ({
          id: r.id,
          patient: r.patient?.user?.name,
          requestedDate: r.requestedDate,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          urgency: r.urgency,
          notes: r.notes,
        }));
      }

      return { error: "Care request viewing is available for family members and admins." };
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

// ── Mutating tools that require user confirmation ────────────────────────────

const MUTATING_TOOLS = new Set([
  "reschedule_shift",
  "reassign_shift",
  "report_callout",
  "create_patient",
  "create_caregiver",
  "assign_caregiver_to_patient",
  "submit_care_request",
]);

function buildActionSummary(tool: string, args: Record<string, unknown>): string {
  switch (tool) {
    case "reschedule_shift":
      return `Reschedule shift to ${args.newStartTime} – ${args.newEndTime}${args.newCaregiverId ? ", with a new caregiver" : ""}.`;
    case "reassign_shift":
      return `Reassign shift ${args.shiftId} to a different caregiver.`;
    case "report_callout":
      return `Report a callout for your upcoming shift. Reason: "${args.reason}"${args.canArriveLate ? ` (late arrival at ${args.lateArrivalTime ?? "unspecified"})` : ""}.`;
    case "create_patient":
      return `Create a new patient: ${args.name} (${args.email}).`;
    case "create_caregiver":
      return `Create a new caregiver: ${args.name} (${args.email}).`;
    case "assign_caregiver_to_patient":
      return `Assign caregiver to patient in the system.`;
    case "submit_care_request":
      return `Submit a care request for ${args.requestedDate} from ${args.startTime} to ${args.endTime}${args.urgency === "URGENT" ? " (URGENT)" : ""}.`;
    default:
      return `Perform action: ${tool}.`;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { messages, confirmedAction } = body as {
    messages: { role: string; content: string }[];
    confirmedAction?: { tool: string; args: Record<string, unknown> };
  };

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

  const systemPrompt = `You are Guardian AI, a care assistant for a home care agency. You help everyone involved in care — admins, caregivers, patients, and family members.

Today is ${today}.
You are speaking with ${name ?? "a user"}, who is a ${roleLabel}.

Role-specific behavior:

ADMIN:
- Full access to org scheduling, caregivers, patients, shifts, and care requests.
- Can reschedule, reassign, create patients/caregivers, assign caregivers to patients.
- Use get_available_caregivers to find who is free at a given time.
- Use get_schedule to look up shift IDs before rescheduling.

CAREGIVER:
- Can see their own shifts and assigned patients' tasks.
- Can report a callout if they cannot make a shift.

FAMILY_MEMBER:
- Use get_my_patient_status when they ask for updates, status, or "how is my loved one".
- Use get_upcoming_visits to show scheduled caregiver visits.
- Use get_medications to show active medications (only if visibility is enabled).
- Use submit_care_request when they want to request extra care on a date.
- Use get_care_requests to show their submitted requests and their status.

PATIENT:
- Use get_my_patient_status to show their own tasks and upcoming visits.
- Use get_medications to show their own medications.
- Use get_today_tasks to show today's tasks.

General:
- Never share one patient's data with an unauthorized user.
- Keep responses concise and warm. Use bullet points for lists.
- Do not provide medical advice — suggest contacting the care team.
- When taking any write action (reschedule, reassign, callout, create, submit), call the tool directly — the UI handles confirmation separately.`;

  // ── Confirmed action: skip AI, execute the tool, get a summary response ──
  if (confirmedAction) {
    const result = await executeTool(
      confirmedAction.tool,
      confirmedAction.args,
      userId,
      orgId ?? null,
      role ?? ""
    );

    const confirmMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [
          {
            id: "confirmed_tool_call",
            type: "function" as const,
            function: {
              name: confirmedAction.tool,
              arguments: JSON.stringify(confirmedAction.args),
            },
          },
        ],
      },
      {
        role: "tool" as const,
        tool_call_id: "confirmed_tool_call",
        content: JSON.stringify(result),
      },
    ];

    const finalResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: confirmMessages,
    });

    return NextResponse.json({ reply: finalResponse.choices[0].message.content });
  }

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[]),
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

    // Check if any of the tool calls are mutating — require confirmation before executing
    type FunctionToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
    const toolCalls = (choice.message.tool_calls ?? []) as FunctionToolCall[];
    const mutatingCall = toolCalls.find((tc) => MUTATING_TOOLS.has(tc.function.name));

    if (mutatingCall) {
      const args = JSON.parse(mutatingCall.function.arguments) as Record<string, unknown>;
      const summary = buildActionSummary(mutatingCall.function.name, args);
      const replyText =
        (choice.message.content as string | null) ??
        `I'm ready to ${summary.toLowerCase().replace(/\.$/, "")}. Please confirm below.`;

      return NextResponse.json({
        reply: replyText,
        pendingAction: {
          tool: mutatingCall.function.name,
          args,
          summary,
        },
      });
    }

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
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
  } catch (err) {
    console.error("[chat] unhandled error:", err);
    return NextResponse.json(
      { reply: "Something went wrong on my end. Please try again in a moment." },
      { status: 500 }
    );
  }
}
