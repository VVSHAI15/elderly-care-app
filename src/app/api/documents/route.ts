import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";

/** Returns true if the current session user is allowed to access this patient's data. */
async function canAccessPatient(patientId: string, userId: string, role: string, orgId?: string | null) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { familyMembers: { select: { id: true } } },
  });
  if (!patient) return false;
  const isOwner = patient.userId === userId;
  const isConnected = patient.familyMembers.some((f) => f.id === userId);
  const isAdmin = role === "ADMIN";
  const isOrgMember =
    (role === "CAREGIVER" || role === "ADMIN") &&
    orgId &&
    (patient as unknown as { organizationId?: string | null }).organizationId === orgId;
  return isOwner || isConnected || isAdmin || isOrgMember;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
  }

  const allowed = await canAccessPatient(patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const allowed = await canAccessPatient(patientId, session.user.id, session.user.role ?? "", session.user.organizationId);
  if (!allowed) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Create document record
  const document = await prisma.document.create({
    data: {
      patientId,
      fileName,
      fileUrl: "",
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
