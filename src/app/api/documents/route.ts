import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: { patientId },
    include: {
      medications: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    patientId,
    fileName,
    fileType,
    documentType = "OTHER",
    rawText,
    confidence,
    medications = [],
  } = body;

  if (!patientId || !fileName) {
    return NextResponse.json(
      { error: "Patient ID and file name are required" },
      { status: 400 }
    );
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      patientId,
      fileName,
      fileUrl: "", // In production, store actual file URL
      fileType: fileType || "image/unknown",
      rawText: rawText || "",
      processedData: { confidence, medications } as never,
      documentType: documentType as never,
      processedAt: new Date(),
    },
  });

  // Create medication records from extracted data
  const medicationPromises = medications.map((med: { name: string; dosage: string; frequency: string; instructions?: string }) =>
    prisma.medication.create({
      data: {
        patientId,
        documentId: document.id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        instructions: med.instructions,
        startDate: new Date(),
      },
    })
  );

  const createdMedications = await Promise.all(medicationPromises);

  // Create tasks for each medication
  const taskPromises = createdMedications.map((med) =>
    prisma.task.create({
      data: {
        patientId,
        medicationId: med.id,
        title: `Take ${med.name}`,
        description: `${med.dosage} - ${med.frequency}${med.instructions ? `. ${med.instructions}` : ""}`,
        category: "MEDICATION",
        isRecurring: true,
        recurrence: "daily",
        priority: "HIGH",
      },
    })
  );

  await Promise.all(taskPromises);

  return NextResponse.json({
    document,
    medications: createdMedications,
    ocrConfidence: confidence,
  }, { status: 201 });
}
