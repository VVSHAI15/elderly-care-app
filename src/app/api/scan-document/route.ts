import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const patientId = formData.get("patientId") as string;

  if (!file || !patientId) {
    return NextResponse.json(
      { error: "File and patient ID are required" },
      { status: 400 }
    );
  }

  console.log("=== SCAN DOCUMENT WITH GPT-4 VISION ===");
  console.log("File:", file.name, file.type, file.size, "bytes");

  try {
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log("Calling GPT-4 Vision...");

    // Use GPT-4 Vision to analyze the image
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical document analyzer. Analyze the prescription or medical document image and extract all medication information.

Return a JSON object with:
1. "medications": array of medications found, each with:
   - name: medication name
   - dosage: dosage amount (e.g., "10mg", "500mg")
   - frequency: how often to take (e.g., "once daily", "twice daily", "every 8 hours")
   - instructions: any special instructions (optional)
   - quantity: quantity dispensed (optional)
   - refills: number of refills (optional)

2. "pharmacy": pharmacy name if visible (optional)
3. "prescriber": doctor/prescriber name if visible (optional)
4. "patient": patient name if visible (optional)
5. "rawText": key text you can read from the document

If you cannot read the document clearly or no medications are found, still return the structure with empty medications array.

Return ONLY valid JSON, no other text.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this prescription/medical document and extract all medication information:",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    console.log("GPT-4 Vision response:", content);

    // Parse the response
    let parsedResult;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsedResult = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse GPT-4 response:", content);
      parsedResult = { medications: [], rawText: content };
    }

    const medications = parsedResult.medications || [];
    console.log("Extracted medications:", medications);

    // Save document to database
    const document = await prisma.document.create({
      data: {
        patientId,
        fileName: file.name,
        fileUrl: "", // In production, upload to cloud storage
        fileType: file.type,
        rawText: parsedResult.rawText || "",
        processedData: parsedResult as never,
        documentType: "PRESCRIPTION",
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
      medications,
      pharmacy: parsedResult.pharmacy,
      prescriber: parsedResult.prescriber,
      rawText: parsedResult.rawText,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
