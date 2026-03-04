import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a medical document analyzer. Analyze the medical document and extract ALL structured information for a caregiver care profile.

Return a JSON object with these fields:

1. "summary": a short plain-English summary (2-3 sentences) of what this document contains.

2. "medications": array of medications found, each with:
   - name, dosage, frequency, instructions (optional), quantity (optional), refills (optional)

3. "pharmacy": pharmacy name if visible (optional)
4. "prescriber": doctor/prescriber name if visible (optional)
5. "patient": patient name if visible (optional)
6. "rawText": key text you can read from the document

7. "medicalTerms": array of medical terms a non-medical person might not understand, each with:
   - term: the exact word/abbreviation as it appears
   - explanation: plain-language explanation (1-2 sentences, no jargon, as if explaining to a grandparent)
   Aim for 5-15 terms. Return empty array if none.

8. "careProfile": object with all care profile information found in the document. Include only fields that are actually present. All fields are optional:
   - "dischargeInfo": { hospital, diagnosis, mrn, admissionDate, dischargeDate, attendingPhysician, followUpPhysician }
   - "warningSigns": {
       "emergency": array of strings — symptoms requiring 911 (e.g. "Sudden severe chest pain"),
       "callDoctor": array of strings — symptoms requiring same-day doctor call
     }
   - "exerciseGuidelines": {
       "phases": array of { period: string (e.g. "Week 1-2"), instructions: string },
       "restrictions": array of strings (e.g. "No heavy lifting over 10 lbs for 4 weeks")
     }
   - "dietRestrictions": {
       "items": array of { category: string (e.g. "Sodium"), instruction: string }
     }
   - "followUpAppointments": array of { priority: "URGENT"|"REQUIRED"|"SCHEDULED"|"RECOMMENDED", type, timeframe, physician, reason }
   - "careContacts": array of { name, phone, hours }
   - "allergies": { "items": array of { substance: string, reaction: string, severity?: "Mild"|"Moderate"|"Severe" } }
   - "conditions": { "items": array of { name: string, status?: "Active"|"Managed"|"Resolved", notes?: string } }
   - "healthHistory": { "items": array of { event: string, date?: string, notes?: string } — surgeries, hospitalizations, procedures }
   - "illnessHistory": { "items": array of { illness: string, date?: string, notes?: string } }

If the document is a discharge summary, focus on extracting the full careProfile. If it is a simple prescription, careProfile may be empty or minimal.

Return ONLY valid JSON, no other text.`;

function parseGptResponse(content: string) {
  try {
    const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanContent);
  } catch {
    console.error("Failed to parse GPT response:", content);
    return { medications: [], medicalTerms: [], rawText: content, summary: "Unable to parse document." };
  }
}

async function analyzeImage(buffer: Buffer, fileType: string) {
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${fileType};base64,${base64}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please analyze this prescription/medical document and extract all medication information:",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "high" },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  return completion.choices[0]?.message?.content || "{}";
}

async function analyzePdfText(text: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Please analyze the following medical document and extract all information including medications and the full care profile:\n\n${text}`,
      },
    ],
    max_tokens: 4000,
  });

  return completion.choices[0]?.message?.content || "{}";
}

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

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  console.log(`=== SCAN DOCUMENT ${isPdf ? "(PDF)" : "(IMAGE)"} ===`);
  console.log("File:", file.name, file.type, file.size, "bytes");

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let responseContent: string;

    if (isPdf) {
      // Extract text from PDF using pdf-parse
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const extractedText = textResult.text;

      console.log("PDF text extracted, length:", extractedText.length);

      if (!extractedText.trim()) {
        return NextResponse.json({
          fileName: file.name,
          fileType: file.type,
          medications: [],
          summary: "The PDF appears to be empty or contains only images. Try uploading a screenshot instead.",
          rawText: "",
        });
      }

      responseContent = await analyzePdfText(extractedText);
    } else {
      responseContent = await analyzeImage(buffer, file.type);
    }

    console.log("GPT response:", responseContent);
    const parsedResult = parseGptResponse(responseContent);

    return NextResponse.json({
      fileName: file.name,
      fileType: file.type,
      medications: parsedResult.medications || [],
      pharmacy: parsedResult.pharmacy,
      prescriber: parsedResult.prescriber,
      summary: parsedResult.summary || "",
      rawText: parsedResult.rawText,
      medicalTerms: parsedResult.medicalTerms || [],
      careProfile: parsedResult.careProfile || null,
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
