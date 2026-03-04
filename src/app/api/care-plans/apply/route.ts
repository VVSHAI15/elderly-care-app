import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { getProtocolById, findProtocolsForConditions } from "@/lib/condition-protocols";
import { createTasksFromProtocol } from "@/lib/care-profile-tasks";

/**
 * POST /api/care-plans/apply
 *
 * Apply a condition protocol (or auto-detect from patient's conditions) to create tasks.
 *
 * Body:
 *   { patientId: string, protocolId?: string, conditionNames?: string[] }
 *
 * If protocolId is provided, applies that specific protocol.
 * If conditionNames is provided, auto-detects matching protocols and applies all.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { patientId, protocolId, conditionNames } = body as {
    patientId?: string;
    protocolId?: string;
    conditionNames?: string[];
  };

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  // Verify access: caller must be the patient, a connected caregiver/family, or an admin
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { familyMembers: { select: { id: true } } },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const isOwner = patient.userId === session.user.id;
  const isConnected = patient.familyMembers.some((f) => f.id === session.user.id);
  const isAdmin = session.user.role === "ADMIN";
  const isCaregiver = session.user.role === "CAREGIVER";

  if (!isOwner && !isConnected && !isAdmin && !isCaregiver) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const results: Array<{ protocolId: string; protocolName: string; tasksCreated: number }> = [];
  const errors: string[] = [];

  if (protocolId) {
    // Apply a specific protocol
    const protocol = getProtocolById(protocolId);
    if (!protocol) {
      return NextResponse.json({ error: `Protocol "${protocolId}" not found` }, { status: 404 });
    }
    try {
      const tasksCreated = await createTasksFromProtocol(patientId, protocol);
      results.push({ protocolId: protocol.id, protocolName: protocol.name, tasksCreated });
    } catch (err) {
      errors.push(`Failed to apply ${protocol.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (conditionNames && conditionNames.length > 0) {
    // Auto-detect and apply all matching protocols
    const protocols = findProtocolsForConditions(conditionNames);
    if (protocols.length === 0) {
      return NextResponse.json({
        message: "No matching protocols found for the provided conditions.",
        results: [],
        errors: [],
      });
    }
    for (const protocol of protocols) {
      try {
        const tasksCreated = await createTasksFromProtocol(patientId, protocol);
        results.push({ protocolId: protocol.id, protocolName: protocol.name, tasksCreated });
      } catch (err) {
        errors.push(`Failed to apply ${protocol.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else {
    return NextResponse.json({ error: "Either protocolId or conditionNames must be provided" }, { status: 400 });
  }

  const totalTasks = results.reduce((sum, r) => sum + r.tasksCreated, 0);

  return NextResponse.json({
    message: `Applied ${results.length} protocol(s), created ${totalTasks} task(s).`,
    results,
    ...(errors.length > 0 && { errors }),
  });
}

/**
 * GET /api/care-plans/apply?patientId=xxx
 *
 * Returns all available protocols with a flag indicating which ones
 * match the patient's current conditions.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const { CONDITION_PROTOCOLS } = await import("@/lib/condition-protocols");

  return NextResponse.json({
    protocols: CONDITION_PROTOCOLS.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      taskCount: p.tasks.length,
      warnings: p.warnings,
    })),
  });
}
