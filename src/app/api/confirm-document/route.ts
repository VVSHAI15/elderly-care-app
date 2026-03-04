import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { updatePatientCareProfile } from "@/lib/care-profile-update";

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
    careProfile = null,
    force = false,          // if true, skip duplicate check and save regardless
  } = body;

  if (!patientId || !fileName) {
    return NextResponse.json(
      { error: "Patient ID and file name are required" },
      { status: 400 }
    );
  }

  try {
    // Duplicate detection — only warn when NOT forcing
    if (!force) {
      const existing = await prisma.document.findFirst({
        where: { patientId, fileName },
        select: { id: true, uploadedAt: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            duplicate: true,
            existingDocumentId: existing.id,
            existingDocumentDate: existing.uploadedAt,
            message: `A document named "${fileName}" was already uploaded for this patient.`,
          },
          { status: 409 }
        );
      }
    }

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

    // ── Save care profile fields ────────────────────────────────────────────
    let careProfileSavedFields = 0;
    let careProfileError: string | null = null;

    if (careProfile && typeof careProfile === "object" && Object.keys(careProfile).length > 0) {
      try {
        /**
         * GPT sometimes returns arrays directly (e.g. allergies: [{...}])
         * instead of the wrapped format ({ items: [{...}] }).
         * Normalise to { items: [...] } in both cases.
         */
        const normalizeItems = (val: unknown): { items: unknown[] } | null => {
          if (!val) return null;
          if (Array.isArray(val)) {
            return val.length > 0 ? { items: val } : null;
          }
          if (typeof val === "object") {
            const wrapped = val as { items?: unknown[] };
            if (Array.isArray(wrapped.items) && wrapped.items.length > 0) return val as { items: unknown[] };
          }
          return null;
        };

        const cp = careProfile as Record<string, unknown>;
        const updateData: Record<string, unknown> = {};

        // Simple object fields (always include if non-null)
        if (cp.dischargeInfo   && typeof cp.dischargeInfo   === "object") updateData.dischargeInfo   = cp.dischargeInfo;
        if (cp.warningSigns    && typeof cp.warningSigns    === "object") updateData.warningSigns    = cp.warningSigns;
        if (cp.exerciseGuidelines && typeof cp.exerciseGuidelines === "object") updateData.exerciseGuidelines = cp.exerciseGuidelines;

        // dietRestrictions must have at least one item
        if (cp.dietRestrictions && typeof cp.dietRestrictions === "object") {
          const dr = cp.dietRestrictions as { items?: unknown[] };
          if (Array.isArray(dr.items) && dr.items.length > 0) updateData.dietRestrictions = cp.dietRestrictions;
        }

        // Arrays at top level
        if (Array.isArray(cp.followUpAppointments) && cp.followUpAppointments.length > 0) updateData.followUpAppointments = cp.followUpAppointments;
        if (Array.isArray(cp.careContacts)          && cp.careContacts.length > 0)          updateData.careContacts          = cp.careContacts;

        // Wrapped-items fields (allergies, conditions, healthHistory, illnessHistory)
        const allergies    = normalizeItems(cp.allergies);
        const conditions   = normalizeItems(cp.conditions);
        const healthHistory  = normalizeItems(cp.healthHistory);
        const illnessHistory = normalizeItems(cp.illnessHistory);
        if (allergies)    updateData.allergies    = allergies;
        if (conditions)   updateData.conditions   = conditions;
        if (healthHistory)  updateData.healthHistory  = healthHistory;
        if (illnessHistory) updateData.illnessHistory = illnessHistory;

        careProfileSavedFields = Object.keys(updateData).length;
        console.log(`Care profile: ${careProfileSavedFields} fields to save:`, Object.keys(updateData));

        if (careProfileSavedFields > 0) {
          await updatePatientCareProfile(patientId, updateData);
          console.log("Care profile saved successfully via raw SQL.");
        }
      } catch (err) {
        console.error("Failed to save care profile:", err);
        careProfileError = err instanceof Error ? err.message : String(err);
        careProfileSavedFields = 0;
      }
    } else {
      console.log("No care profile data in request:", { careProfile });
    }
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      document,
      medications: createdMedications,
      careProfileSaved: careProfileSavedFields > 0,
      careProfileFields: careProfileSavedFields,
      ...(careProfileError && { careProfileError }),
    }, { status: 201 });

  } catch (error) {
    console.error("Error confirming document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
