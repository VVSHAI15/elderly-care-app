import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

// Returns summary data for all patients a caretaker is connected to
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        familyOf: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tasks: {
              where: {
                dueDate: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lt: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
              select: {
                id: true,
                status: true,
                priority: true,
              },
            },
            medications: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                refillDate: true,
              },
            },
            _count: {
              select: {
                tasks: true,
                documents: true,
                familyMembers: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const patients = user.familyOf.map((patient) => {
      const todayTasks = patient.tasks;
      const completedToday = todayTasks.filter((t) => t.status === "COMPLETED").length;
      const pendingToday = todayTasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;
      const overdueToday = todayTasks.filter((t) => t.status === "OVERDUE").length;
      const urgentTasks = todayTasks.filter((t) => t.priority === "URGENT" && t.status !== "COMPLETED").length;

      const upcomingRefills = patient.medications.filter((m) => {
        if (!m.refillDate) return false;
        const daysUntilRefill = Math.ceil(
          (new Date(m.refillDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilRefill <= 7 && daysUntilRefill >= 0;
      });

      return {
        patientId: patient.id,
        userId: patient.user.id,
        name: patient.user.name,
        email: patient.user.email,
        todayTasks: {
          total: todayTasks.length,
          completed: completedToday,
          pending: pendingToday,
          overdue: overdueToday,
          urgent: urgentTasks,
        },
        activeMedications: patient.medications.length,
        upcomingRefills: upcomingRefills.length,
        totalTasks: patient._count.tasks,
        totalDocuments: patient._count.documents,
        careTeamSize: patient._count.familyMembers,
      };
    });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
