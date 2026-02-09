import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    patientId,
    fileName,
    fileType,
    medications = [],
    pharmacy,
    prescriber,
    summary,
    rawText,
    uploadedById,
    documentType = "PRESCRIPTION",
    medicalTerms = [],
  } = body;

  if (!patientId || !fileName) {
    return NextResponse.json(
      { error: "Patient ID and file name are required" },
      { status: 400 }
    );
  }

  try {
    // Save document to database
    const document = await prisma.document.create({
      data: {
        patientId,
        fileName,
        fileUrl: "",
        fileType: fileType || "image/unknown",
        rawText: rawText || "",
        summary: summary || "",
        processedData: { medications, pharmacy, prescriber, medicalTerms } as never,
        documentType: documentType as never,
        uploadedById: uploadedById || null,
        processedAt: new Date(),
      },
    });

    // Create medication records
    const createdMedications = await Promise.all(
      medications.map((med: { name: string; dosage: string; frequency: string; instructions?: string }) =>
        prisma.medication.create({
          data: {
            patientId,
            documentId: document.id,
            name: med.name,
            dosage: med.dosage || "as prescribed",
            frequency: med.frequency || "as directed",
            instructions: med.instructions,
            prescriber: prescriber,
            pharmacy: pharmacy,
            startDate: new Date(),
          },
        })
      )
    );

    // Create tasks for each medication
    await Promise.all(
      createdMedications.map((med) =>
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
      )
    );

    return NextResponse.json({
      document,
      medications: createdMedications,
    }, { status: 201 });
  } catch (error) {
    console.error("Error confirming document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
