import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Only available in development
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const [users, patients, inviteCodes, tasks, medications, documents] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          patient: { select: { id: true } },
          familyOf: { select: { id: true, user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.patient.findMany({
        include: {
          user: { select: { name: true, email: true } },
          familyMembers: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true, medications: true, documents: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.inviteCode.findMany({
        include: {
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.findMany({
        include: {
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.medication.findMany({
        include: {
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.document.findMany({
        include: {
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { uploadedAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      users,
      patients,
      inviteCodes,
      tasks,
      medications,
      documents,
      stats: {
        totalUsers: users.length,
        totalPatients: patients.length,
        totalTasks: tasks.length,
        totalMedications: medications.length,
        totalDocuments: documents.length,
        activeInvites: inviteCodes.filter((i) => !i.usedAt && i.expiresAt > new Date()).length,
      },
    });
  } catch (error) {
    console.error("Error fetching dev data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
