import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const medications = await prisma.medication.findMany({
    where: { patientId },
    include: {
      document: {
        select: {
          id: true,
          fileName: true,
          documentType: true,
          uploadedAt: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(medications);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: "Medication ID is required" }, { status: 400 });
  }

  const medication = await prisma.medication.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(medication);
}
