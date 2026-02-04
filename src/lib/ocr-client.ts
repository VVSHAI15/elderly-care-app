"use client";

import Tesseract from "tesseract.js";

export interface MedicationExtraction {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export interface OCRResult {
  rawText: string;
  confidence: number;
  medications: MedicationExtraction[];
}

// Common medication names to help identify medications in text
const COMMON_MEDICATIONS = [
  "aspirin", "ibuprofen", "acetaminophen", "tylenol", "advil", "motrin",
  "lisinopril", "metformin", "amlodipine", "metoprolol", "omeprazole",
  "losartan", "gabapentin", "hydrochlorothiazide", "atorvastatin", "simvastatin",
  "levothyroxine", "azithromycin", "amoxicillin", "prednisone", "tramadol",
  "furosemide", "pantoprazole", "escitalopram", "sertraline", "fluoxetine",
  "citalopram", "trazodone", "alprazolam", "lorazepam", "clonazepam",
  "warfarin", "clopidogrel", "eliquis", "xarelto", "pradaxa",
  "insulin", "methotrexate", "hydroxychloroquine", "prolia", "humira",
  "lipitor", "crestor", "nexium", "prilosec", "zantac", "pepcid",
  "norvasc", "zoloft", "lexapro", "prozac", "xanax", "ativan", "klonopin",
  "vicodin", "percocet", "oxycodone", "hydrocodone", "morphine", "fentanyl",
  "ventolin", "albuterol", "flovent", "advair", "symbicort", "spiriva",
  "januvia", "jardiance", "ozempic", "trulicity", "victoza",
  "synthroid", "armour", "cytomel", "coumadin", "plavix", "brilinta",
  "lasix", "bumex", "aldactone", "coreg", "toprol", "lopressor",
  "diovan", "benicar", "micardis", "atacand", "avapro",
  "prinivil", "zestril", "altace", "vasotec", "capoten",
  "norco", "dilaudid", "demerol", "codeine", "suboxone", "methadone",
];

export async function extractTextFromImage(
  imageSource: string | File | Blob,
  onProgress?: (status: string, progress: number) => void
): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(imageSource, "eng", {
    logger: (m) => {
      if (m.status && onProgress) {
        onProgress(m.status, m.progress || 0);
      }
    },
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

export function parseMedicationsFromText(text: string): MedicationExtraction[] {
  const medications: MedicationExtraction[] = [];
  const lines = text.split(/\n/);

  // Dosage pattern - matches things like "10mg", "500 mg", "0.5mg", "100mcg", "5ml"
  const dosagePattern = /(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|units?|iu|tablets?|caps?|capsules?|pills?))/i;

  // Frequency patterns
  const frequencyPatterns = [
    /\b(once\s+(?:a\s+)?daily|once\s+daily|daily|qd)\b/i,
    /\b(twice\s+(?:a\s+)?daily|twice\s+daily|bid|b\.i\.d\.?)\b/i,
    /\b(three\s+times\s+(?:a\s+)?daily|tid|t\.i\.d\.?)\b/i,
    /\b(four\s+times\s+(?:a\s+)?daily|qid|q\.i\.d\.?)\b/i,
    /\b(every\s+\d+\s+hours?|q\d+h?)\b/i,
    /\b(at\s+bedtime|before\s+bed|hs|h\.s\.?|qhs)\b/i,
    /\b(in\s+the\s+morning|every\s+morning|qam|q\.a\.m\.?)\b/i,
    /\b(in\s+the\s+evening|every\s+evening|qpm|q\.p\.m\.?)\b/i,
    /\b(with\s+meals?|with\s+food|pc|p\.c\.?)\b/i,
    /\b(before\s+meals?|ac|a\.c\.?)\b/i,
    /\b(as\s+needed|prn|p\.r\.n\.?)\b/i,
    /\b(weekly|every\s+week)\b/i,
    /\b(monthly|every\s+month)\b/i,
  ];

  // Words to skip (not medication names)
  const skipWords = new Set([
    "the", "and", "with", "for", "your", "this", "that", "patient", "take",
    "doctor", "pharmacy", "prescription", "refill", "date", "name", "address",
    "phone", "rx", "sig", "disp", "qty", "quantity", "total", "instructions",
    "medication", "drug", "medicine", "tablet", "capsule", "pill", "dose",
  ]);

  // Process each line
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 3) continue;

    // Check if line contains a known medication
    for (const medName of COMMON_MEDICATIONS) {
      const medRegex = new RegExp(`\\b${medName}\\b`, "i");
      if (medRegex.test(cleanLine)) {
        const dosageMatch = cleanLine.match(dosagePattern);
        let frequency = "as directed";

        for (const freqPattern of frequencyPatterns) {
          const freqMatch = cleanLine.match(freqPattern);
          if (freqMatch) {
            frequency = normalizeFrequency(freqMatch[1]);
            break;
          }
        }

        medications.push({
          name: medName.charAt(0).toUpperCase() + medName.slice(1),
          dosage: dosageMatch ? dosageMatch[1] : "as prescribed",
          frequency,
        });
        break;
      }
    }
  }

  // Also try pattern-based extraction for medications not in our list
  const patternBasedMeds = extractByPatterns(text);
  for (const med of patternBasedMeds) {
    const alreadyFound = medications.some(
      m => m.name.toLowerCase() === med.name.toLowerCase()
    );
    if (!alreadyFound && !skipWords.has(med.name.toLowerCase())) {
      medications.push(med);
    }
  }

  // Remove duplicates
  const uniqueMedications = medications.filter(
    (med, index, self) =>
      index === self.findIndex((m) => m.name.toLowerCase() === med.name.toLowerCase())
  );

  return uniqueMedications;
}

function extractByPatterns(text: string): MedicationExtraction[] {
  const medications: MedicationExtraction[] = [];

  // Pattern: Word followed by dosage (e.g., "Lisinopril 10mg")
  const pattern1 = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g))\b/g;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    medications.push({
      name: match[1].trim(),
      dosage: match[2].trim(),
      frequency: "as directed",
    });
  }

  // Pattern: "Take [Med] [dosage] [frequency]"
  const pattern2 = /\btake\s+([A-Za-z]+)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|tablets?|caps?))\s+(.+?)(?:\.|,|$)/gi;
  while ((match = pattern2.exec(text)) !== null) {
    medications.push({
      name: match[1].trim(),
      dosage: match[2].trim(),
      frequency: normalizeFrequency(match[3].trim()),
    });
  }

  return medications;
}

function normalizeFrequency(freq: string): string {
  const lowercaseFreq = freq.toLowerCase().trim();

  if (/twice|bid|b\.i\.d|2x/i.test(lowercaseFreq)) {
    return "twice daily";
  }
  if (/three|tid|t\.i\.d|3x/i.test(lowercaseFreq)) {
    return "three times daily";
  }
  if (/four|qid|q\.i\.d|4x/i.test(lowercaseFreq)) {
    return "four times daily";
  }
  if (/once|daily|qd|q\.d/i.test(lowercaseFreq)) {
    return "once daily";
  }
  if (/every\s*8|q8/i.test(lowercaseFreq)) {
    return "every 8 hours";
  }
  if (/every\s*12|q12/i.test(lowercaseFreq)) {
    return "every 12 hours";
  }
  if (/every\s*6|q6/i.test(lowercaseFreq)) {
    return "every 6 hours";
  }
  if (/every\s*4|q4/i.test(lowercaseFreq)) {
    return "every 4 hours";
  }
  if (/bedtime|hs|h\.s|qhs/i.test(lowercaseFreq)) {
    return "at bedtime";
  }
  if (/morning|qam|a\.m/i.test(lowercaseFreq)) {
    return "every morning";
  }
  if (/evening|qpm|p\.m/i.test(lowercaseFreq)) {
    return "every evening";
  }
  if (/prn|as\s*needed/i.test(lowercaseFreq)) {
    return "as needed";
  }
  if (/with\s*meal|with\s*food|pc/i.test(lowercaseFreq)) {
    return "with meals";
  }
  if (/weekly/i.test(lowercaseFreq)) {
    return "weekly";
  }
  if (/monthly/i.test(lowercaseFreq)) {
    return "monthly";
  }

  return freq || "as directed";
}

export async function processDocumentClient(
  imageSource: string | File | Blob,
  onProgress?: (status: string, progress: number) => void
): Promise<OCRResult> {
  const { text, confidence } = await extractTextFromImage(imageSource, onProgress);
  const medications = parseMedicationsFromText(text);

  return {
    rawText: text,
    confidence,
    medications,
  };
}
