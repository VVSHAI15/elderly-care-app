import Tesseract from "tesseract.js";

export interface MedicationExtraction {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate?: string;
  prescriber?: string;
}

export interface OCRResult {
  rawText: string;
  confidence: number;
  medications: MedicationExtraction[];
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<{ text: string; confidence: number }> {
  console.log("Starting OCR processing...");

  const result = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (m.status) {
        console.log(`OCR: ${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`);
      }
    },
  });

  console.log("OCR complete!");

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

export function parseMedicationsFromText(text: string): MedicationExtraction[] {
  const medications: MedicationExtraction[] = [];

  // Common medication patterns
  const medicationPatterns = [
    // Pattern: "Take Medication 10mg twice daily"
    /(?:take|administer|give)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+\s*(?:mg|mcg|ml|g|units?))\s+(.+?)(?:\.|$)/gi,
    // Pattern: "Medication 10mg - twice daily"
    /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+\s*(?:mg|mcg|ml|g|units?))\s*[-–]\s*(.+?)(?:\.|$)/gi,
    // Pattern: "Medication: 10mg, frequency"
    /([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*:\s*(\d+\s*(?:mg|mcg|ml|g|units?))\s*,?\s*(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of medicationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, name, dosage, frequency] = match;

      // Skip common non-medication words
      const skipWords = ["the", "and", "with", "for", "your", "this", "that", "patient"];
      if (skipWords.includes(name.toLowerCase())) continue;

      medications.push({
        name: name.trim(),
        dosage: dosage.trim(),
        frequency: normalizeFrequency(frequency.trim()),
      });
    }
  }

  // Remove duplicates
  const uniqueMedications = medications.filter(
    (med, index, self) =>
      index === self.findIndex((m) => m.name.toLowerCase() === med.name.toLowerCase())
  );

  return uniqueMedications;
}

function normalizeFrequency(freq: string): string {
  const lowercaseFreq = freq.toLowerCase();

  if (lowercaseFreq.includes("twice") || lowercaseFreq.includes("bid") || lowercaseFreq.includes("2x")) {
    return "twice daily";
  }
  if (lowercaseFreq.includes("three") || lowercaseFreq.includes("tid") || lowercaseFreq.includes("3x")) {
    return "three times daily";
  }
  if (lowercaseFreq.includes("four") || lowercaseFreq.includes("qid") || lowercaseFreq.includes("4x")) {
    return "four times daily";
  }
  if (lowercaseFreq.includes("once") || lowercaseFreq.includes("daily") || lowercaseFreq.includes("qd")) {
    return "once daily";
  }
  if (lowercaseFreq.includes("every 8") || lowercaseFreq.includes("q8")) {
    return "every 8 hours";
  }
  if (lowercaseFreq.includes("every 12") || lowercaseFreq.includes("q12")) {
    return "every 12 hours";
  }
  if (lowercaseFreq.includes("every 6") || lowercaseFreq.includes("q6")) {
    return "every 6 hours";
  }
  if (lowercaseFreq.includes("bedtime") || lowercaseFreq.includes("hs")) {
    return "at bedtime";
  }
  if (lowercaseFreq.includes("morning")) {
    return "every morning";
  }
  if (lowercaseFreq.includes("prn") || lowercaseFreq.includes("as needed")) {
    return "as needed";
  }

  return freq;
}

export async function processDocument(imageSource: string | File | Blob): Promise<OCRResult> {
  const { text, confidence } = await extractTextFromImage(imageSource);
  const medications = parseMedicationsFromText(text);

  return {
    rawText: text,
    confidence,
    medications,
  };
}
