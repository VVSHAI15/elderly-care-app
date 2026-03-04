import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import prisma from "@/lib/db";
import { updatePatientCareProfile } from "@/lib/care-profile-update";
import { createTasksFromCareProfile } from "@/lib/care-profile-tasks";
import { getAllAllergyConflicts } from "@/lib/drug-allergy-check";
import { findProtocolsForConditions } from "@/lib/condition-protocols";
import { createTasksFromProtocol } from "@/lib/care-profile-tasks";

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
    medications = [],
    pharmacy,
    prescriber,
    summary,
    rawText,
    uploadedById,
    documentType = "PRESCRIPTION",
    medicalTerms = [],
    vitals = {},
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
        processedData: { medications, pharmacy, prescriber, medicalTerms, vitals } as never,
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

    // ── Save vitals as HealthMetric records ──────────────────────────────
    let vitalsSaved = 0;
    const VITAL_TYPE_MAP: Record<string, string> = {
      blood_pressure: "Blood Pressure",
      heart_rate: "Heart Rate",
      temperature: "Temperature",
      oxygen_saturation: "Oxygen Saturation",
      blood_glucose: "Blood Glucose",
      weight: "Weight",
      height: "Height",
      bmi: "BMI",
      hba1c: "HbA1c",
      cholesterol_total: "Total Cholesterol",
      cholesterol_ldl: "LDL Cholesterol",
      cholesterol_hdl: "HDL Cholesterol",
      triglycerides: "Triglycerides",
      creatinine: "Creatinine",
      egfr: "eGFR",
      sodium: "Sodium",
      potassium: "Potassium",
      pain_scale: "Pain Scale",
      respiratory_rate: "Respiratory Rate",
    };

    if (vitals && typeof vitals === "object" && Object.keys(vitals).length > 0) {
      const vitalEntries = Object.entries(vitals as Record<string, string>).filter(([, v]) => v && String(v).trim());
      for (const [key, rawValue] of vitalEntries) {
        const typeLabel = VITAL_TYPE_MAP[key] || key.replace(/_/g, " ");
        // Parse value and unit: e.g. "128/82 mmHg" → value="128/82", unit="mmHg"
        const valueStr = String(rawValue).trim();
        const unitMatch = valueStr.match(/^([\d\/.<>~\s.]+)\s*([a-zA-Z%°\/²³]+.*)?$/);
        const value = unitMatch ? unitMatch[1].trim() : valueStr;
        const unit = unitMatch?.[2]?.trim() || "";

        try {
          await prisma.healthMetric.create({
            data: {
              patientId,
              type: typeLabel,
              value,
              unit: unit || null,
              sourceDocumentId: document.id,
              recordedById: uploadedById || null,
              notes: `Extracted from document: ${fileName}`,
              recordedAt: new Date(),
            },
          });
          vitalsSaved++;
        } catch (err) {
          console.error(`Failed to save vital ${typeLabel}:`, err);
        }
      }
      console.log(`Vitals: saved ${vitalsSaved} health metrics from document.`);
    }

    // ── Save care profile fields ────────────────────────────────────────────
    let careProfileSavedFields = 0;
    let careProfileError: string | null = null;
    let exerciseTasks = 0;
    let appointmentTasks = 0;
    let protocolTasksCreated = 0;
    const protocolsApplied: string[] = [];

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

          // ── Auto-create tasks from exercise guidelines and appointments ──
          const taskResult = await createTasksFromCareProfile(patientId, updateData);
          exerciseTasks = taskResult.exerciseTasks;
          appointmentTasks = taskResult.appointmentTasks;

          // ── Auto-apply condition protocols if conditions were found ──
          if (conditions && Array.isArray((conditions as { items: unknown[] }).items)) {
            const conditionNames = (conditions as { items: { name: string }[] }).items.map((c) => c.name);
            const protocols = findProtocolsForConditions(conditionNames);
            for (const protocol of protocols) {
              try {
                const created = await createTasksFromProtocol(patientId, protocol);
                if (created > 0) {
                  protocolTasksCreated += created;
                  protocolsApplied.push(protocol.name);
                }
              } catch (err) {
                console.error(`Failed to apply protocol ${protocol.name}:`, err);
              }
            }
          }
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

    // ── Allergy conflict check against newly added medications ──────────────
    let allergyConflicts: Array<{ allergen: string; medication: string; reason: string; severity: string }> = [];
    if (createdMedications.length > 0) {
      try {
        // Fetch patient's current allergies (provider-aware placeholder)
        const isPostgres = /^(postgresql|postgres):/i.test(process.env.DATABASE_URL ?? "");
        const patientRecord = await prisma.$queryRawUnsafe<Array<{ allergies: string | null }>>(
          isPostgres
            ? `SELECT "allergies" FROM "Patient" WHERE "id" = $1`
            : `SELECT "allergies" FROM "Patient" WHERE "id" = ?`,
          patientId
        );
        const allergyData = patientRecord[0]?.allergies;
        if (allergyData) {
          const parsedAllergies = typeof allergyData === "string" ? JSON.parse(allergyData) : allergyData;
          const allergyList = Array.isArray(parsedAllergies?.items) ? parsedAllergies.items : [];
          if (allergyList.length > 0) {
            allergyConflicts = getAllAllergyConflicts(
              createdMedications.map((m) => ({ name: m.name })),
              allergyList
            );
          }
        }
      } catch (err) {
        console.error("Allergy conflict check failed:", err);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      document,
      medications: createdMedications,
      vitalsSaved,
      careProfileSaved: careProfileSavedFields > 0,
      careProfileFields: careProfileSavedFields,
      tasksCreated: {
        exercise: exerciseTasks,
        appointments: appointmentTasks,
        protocols: protocolTasksCreated,
      },
      ...(protocolsApplied.length > 0 && { protocolsApplied }),
      ...(allergyConflicts.length > 0 && { allergyConflicts }),
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
