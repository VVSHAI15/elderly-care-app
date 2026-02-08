import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a medical document analyzer. Analyze the prescription or medical document and extract all medication information.

Return a JSON object with:
1. "summary": a short plain-English summary (2-3 sentences) of what this document contains, suitable for a patient or caregiver to quickly understand the key points.

2. "medications": array of medications found, each with:
   - name: medication name
   - dosage: dosage amount (e.g., "10mg", "500mg")
   - frequency: how often to take (e.g., "once daily", "twice daily", "every 8 hours")
   - instructions: any special instructions (optional)
   - quantity: quantity dispensed (optional)
   - refills: number of refills (optional)

3. "pharmacy": pharmacy name if visible (optional)
4. "prescriber": doctor/prescriber name if visible (optional)
5. "patient": patient name if visible (optional)
6. "rawText": key text you can read from the document

7. "medicalTerms": an array of medical terms, abbreviations, or jargon found in the document that a non-medical person might not understand. For each item provide:
   - term: the medical word or abbreviation exactly as it appears in the document (e.g., "Hypertension", "BID", "eGFR", "Metformin")
   - explanation: a plain-language explanation in 1-2 short sentences that an elderly patient or their non-medical family member could easily understand. Do not use other medical jargon in the explanation. Write as if explaining to a grandparent.
   Include: diagnosis names, medication names, medical abbreviations (BID, PRN, q.d., PO, etc.), procedure names, lab test names and values, and any other specialized terms. Aim for 5-15 terms depending on document complexity. If the document is very simple with no jargon, return an empty array.

If you cannot read the document clearly or no medications are found, still return the structure with empty medications array, empty medicalTerms array, and a summary noting the issue.

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
    max_tokens: 2500,
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
        content: `Please analyze the following medical document text and extract all medication information:\n\n${text}`,
      },
    ],
    max_tokens: 2500,
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
    });
  } catch (error) {
    console.error("Error processing document:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}
