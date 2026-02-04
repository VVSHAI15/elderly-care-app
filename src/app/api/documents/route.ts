import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processDocument } from "@/lib/ocr";

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
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const patientId = formData.get("patientId") as string;
  const documentType = formData.get("documentType") as string || "OTHER";

  if (!file || !patientId) {
    return NextResponse.json(
      { error: "File and patient ID are required" },
      { status: 400 }
    );
  }

  // Convert file to base64 for OCR processing
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

  // Process document with OCR
  const ocrResult = await processDocument(base64);

  // Store the file (in production, upload to S3/GCS/etc.)
  // For now, we'll store the base64 temporarily
  const fileUrl = base64; // Replace with actual file storage URL in production

  // Create document record
  const document = await prisma.document.create({
    data: {
      patientId,
      fileName: file.name,
      fileUrl,
      fileType: file.type,
      rawText: ocrResult.rawText,
      processedData: ocrResult as never,
      documentType: documentType as never,
      processedAt: new Date(),
    },
  });

  // Create medication records from extracted data
  const medicationPromises = ocrResult.medications.map((med) =>
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

  const medications = await Promise.all(medicationPromises);

  // Create tasks for each medication
  const taskPromises = medications.map((med) =>
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
    medications,
    ocrConfidence: ocrResult.confidence,
  }, { status: 201 });
}
