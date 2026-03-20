import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auditLog } from "@/lib/audit";

// GET /api/admin/patients - List all org patients with summary
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  const patients = await prisma.patient.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      familyMembers: { select: { id: true, name: true, role: true } },
      tasks: {
        where: {
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        select: { status: true },
      },
      medications: { where: { isActive: true }, select: { id: true } },
      _count: { select: { tasks: true, documents: true, healthMetrics: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = patients.map((p) => ({
    patientId: p.id,
    userId: p.user.id,
    name: p.user.name,
    email: p.user.email,
    dateOfBirth: p.dateOfBirth,
    medicalNotes: p.medicalNotes,
    emergencyContact: p.emergencyContact,
    assignedCaregivers: p.familyMembers
      .filter((m) => m.role === "CAREGIVER")
      .map((m) => ({ id: m.id, name: m.name })),
    familyMembers: p.familyMembers
      .filter((m) => m.role === "FAMILY_MEMBER")
      .map((m) => ({ id: m.id, name: m.name })),
    todayTasks: {
      total: p.tasks.length,
      completed: p.tasks.filter((t) => t.status === "COMPLETED").length,
      pending: p.tasks.filter((t) => ["PENDING", "IN_PROGRESS"].includes(t.status)).length,
      overdue: p.tasks.filter((t) => t.status === "OVERDUE").length,
    },
    activeMedications: p.medications.length,
    totalTasks: p._count.tasks,
    totalDocuments: p._count.documents,
    totalMetrics: p._count.healthMetrics,
    visibility: {
      tasks: p.familyCanViewTasks,
      meds: p.familyCanViewMeds,
      metrics: p.familyCanViewMetrics,
      shifts: p.familyCanViewShifts,
    },
  }));

  return NextResponse.json({ patients: result });
}

// POST /api/admin/patients - Create a new patient profile
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN" || !session.user.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, dateOfBirth, medicalNotes, emergencyContact, temporaryPassword } =
    await request.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
  }

  const tempPass = temporaryPassword || Math.random().toString(36).slice(-8);
  const hashedPassword = await bcrypt.hash(tempPass, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, password: hashedPassword, name, role: "PATIENT" },
    });
    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        organizationId: session.user.organizationId!,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        medicalNotes,
        emergencyContact,
      },
    });
    return { user, patient };
  });

  await auditLog({
    userId: session.user.id,
    action: "PATIENT_CREATED",
    resourceType: "Patient",
    resourceId: result.patient.id,
    request,
    metadata: { patientEmail: email, patientName: name, organizationId: session.user.organizationId },
  });

  return NextResponse.json({
    patientId: result.patient.id,
    userId: result.user.id,
    name: result.user.name,
    email: result.user.email,
    temporaryPassword: tempPass,
  });
}
