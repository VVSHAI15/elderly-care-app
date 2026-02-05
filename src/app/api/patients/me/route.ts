import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First try to find a patient profile for this user (if they are a patient)
    let patient = await prisma.patient.findUnique({
      where: { userId: session.user.id },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        tasks: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    // If user is a patient but doesn't have a profile yet, create one
    if (!patient && session.user.role === "PATIENT") {
      patient = await prisma.patient.create({
        data: {
          userId: session.user.id,
        },
        include: {
          medications: true,
          tasks: true,
        },
      });
    }

    // If user is not a patient, try to find patients they're connected to as family
    if (!patient) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          familyOf: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      });

      if (user?.familyOf && user.familyOf.length > 0) {
        // Return the first connected patient for now
        // TODO: Let user select which patient to view
        const connectedPatient = await prisma.patient.findUnique({
          where: { id: user.familyOf[0].id },
          include: {
            medications: {
              where: { isActive: true },
              orderBy: { name: "asc" },
            },
            tasks: {
              where: { status: { not: "COMPLETED" } },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });
        return NextResponse.json(connectedPatient);
      }

      return NextResponse.json(null);
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient data" },
      { status: 500 }
    );
  }
}
