/**
 * Drug allergy cross-reactivity database.
 * Maps allergy substances (and drug class names) to lists of drugs
 * that may cause cross-reactive allergic reactions.
 */

export interface AllergyConflict {
  allergen: string;        // The known allergen
  medication: string;      // The conflicting medication
  reason: string;          // Explanation of why this is a conflict
  severity: "CAUTION" | "HIGH" | "CRITICAL";
}

interface DrugAllergyRule {
  allergenKeywords: string[];   // Match against the patient's allergy substance
  conflictingDrugKeywords: string[]; // Match against medication names
  reason: string;
  severity: "CAUTION" | "HIGH" | "CRITICAL";
}

const DRUG_ALLERGY_RULES: DrugAllergyRule[] = [
  // ── Penicillin / Beta-lactam cross-reactivity ──────────────────────────
  {
    allergenKeywords: ["penicillin", "amoxicillin", "ampicillin", "beta-lactam", "beta lactam"],
    conflictingDrugKeywords: ["amoxicillin", "ampicillin", "penicillin", "oxacillin", "nafcillin", "dicloxacillin", "piperacillin", "tazobactam", "amoxicillin-clavulanate", "augmentin"],
    reason: "Contains penicillin — cross-reactive with penicillin allergy.",
    severity: "CRITICAL",
  },
  {
    allergenKeywords: ["penicillin", "amoxicillin", "ampicillin", "beta-lactam", "beta lactam"],
    conflictingDrugKeywords: ["cephalexin", "cefazolin", "ceftriaxone", "cefdinir", "cefuroxime", "cefprozil", "cephalosporin", "keflex", "rocephin"],
    reason: "Cephalosporin antibiotic — 1–2% cross-reactivity with penicillin allergy (consult physician).",
    severity: "CAUTION",
  },
  {
    allergenKeywords: ["penicillin", "amoxicillin", "beta-lactam"],
    conflictingDrugKeywords: ["imipenem", "meropenem", "ertapenem", "carbapenem"],
    reason: "Carbapenem antibiotic — some cross-reactivity risk with penicillin allergy.",
    severity: "CAUTION",
  },

  // ── Sulfonamide (Sulfa) cross-reactivity ──────────────────────────────
  {
    allergenKeywords: ["sulfa", "sulfonamide", "sulfamethoxazole", "trimethoprim", "bactrim", "septra"],
    conflictingDrugKeywords: ["sulfamethoxazole", "trimethoprim", "bactrim", "septra", "cotrimoxazole", "smx", "tmp-smx"],
    reason: "Sulfonamide antibiotic — contains sulfa component, cross-reactive with sulfa allergy.",
    severity: "CRITICAL",
  },
  {
    allergenKeywords: ["sulfa", "sulfonamide"],
    conflictingDrugKeywords: ["furosemide", "lasix", "hydrochlorothiazide", "hctz", "chlorthalidone", "metolazone", "thiazide"],
    reason: "Thiazide or loop diuretic with sulfonamide group — possible cross-reactivity in sulfa-allergic patients.",
    severity: "CAUTION",
  },
  {
    allergenKeywords: ["sulfa", "sulfonamide"],
    conflictingDrugKeywords: ["celecoxib", "celebrex", "dapsone"],
    reason: "Contains sulfonamide group — may cross-react in patients with sulfa allergy.",
    severity: "CAUTION",
  },

  // ── NSAIDs / Aspirin ──────────────────────────────────────────────────
  {
    allergenKeywords: ["aspirin", "nsaid", "ibuprofen", "naproxen"],
    conflictingDrugKeywords: ["ibuprofen", "advil", "motrin", "naproxen", "aleve", "aspirin", "ketorolac", "toradol", "indomethacin", "meloxicam", "celecoxib", "celebrex", "diclofenac", "voltaren"],
    reason: "NSAID — may cross-react in aspirin/NSAID-sensitive patients, including triggering asthma or urticaria.",
    severity: "HIGH",
  },

  // ── ACE Inhibitors ────────────────────────────────────────────────────
  {
    allergenKeywords: ["ace inhibitor", "lisinopril", "enalapril", "ramipril", "captopril", "benazepril"],
    conflictingDrugKeywords: ["lisinopril", "enalapril", "ramipril", "captopril", "benazepril", "fosinopril", "quinapril", "perindopril", "trandolapril", "moexipril"],
    reason: "ACE inhibitor — cross-reactive class; if allergic (especially angioedema), avoid all ACE inhibitors.",
    severity: "CRITICAL",
  },

  // ── Statins ───────────────────────────────────────────────────────────
  {
    allergenKeywords: ["statin", "atorvastatin", "simvastatin", "rosuvastatin", "lovastatin"],
    conflictingDrugKeywords: ["atorvastatin", "lipitor", "simvastatin", "zocor", "rosuvastatin", "crestor", "lovastatin", "pravastatin", "pitavastatin", "fluvastatin"],
    reason: "Statin medication — possible cross-reactivity (myopathy risk) across statin class.",
    severity: "CAUTION",
  },

  // ── Opioids ───────────────────────────────────────────────────────────
  {
    allergenKeywords: ["morphine", "opioid", "codeine", "hydrocodone"],
    conflictingDrugKeywords: ["morphine", "ms contin", "oxycodone", "oxycontin", "hydrocodone", "vicodin", "norco", "codeine", "hydromorphone", "dilaudid", "fentanyl", "tramadol", "methadone"],
    reason: "Opioid analgesic — may cross-react in opioid-sensitive patients (especially if prior reaction involved histamine release).",
    severity: "HIGH",
  },

  // ── Fluoroquinolones ──────────────────────────────────────────────────
  {
    allergenKeywords: ["fluoroquinolone", "quinolone", "ciprofloxacin", "levofloxacin"],
    conflictingDrugKeywords: ["ciprofloxacin", "cipro", "levofloxacin", "levaquin", "moxifloxacin", "avelox", "ofloxacin", "gemifloxacin", "norfloxacin"],
    reason: "Fluoroquinolone antibiotic — cross-reactive class allergy.",
    severity: "CRITICAL",
  },

  // ── Macrolides ────────────────────────────────────────────────────────
  {
    allergenKeywords: ["macrolide", "erythromycin", "azithromycin", "clarithromycin"],
    conflictingDrugKeywords: ["azithromycin", "zithromax", "z-pack", "erythromycin", "clarithromycin", "biaxin", "roxithromycin"],
    reason: "Macrolide antibiotic — class cross-reactivity possible.",
    severity: "HIGH",
  },

  // ── Tetracyclines ─────────────────────────────────────────────────────
  {
    allergenKeywords: ["tetracycline", "doxycycline", "minocycline"],
    conflictingDrugKeywords: ["doxycycline", "minocycline", "tetracycline", "vibramycin", "solodyn"],
    reason: "Tetracycline antibiotic — class cross-reactivity.",
    severity: "HIGH",
  },

  // ── Contrast Dye / Iodine ─────────────────────────────────────────────
  {
    allergenKeywords: ["iodine", "contrast dye", "contrast media", "shellfish"],
    conflictingDrugKeywords: ["amiodarone", "cordarone", "povidone-iodine", "betadine"],
    reason: "Contains iodine — relevant if patient has iodine/contrast allergy (pre-medication protocol may be needed).",
    severity: "CAUTION",
  },

  // ── Latex (cross-reactive foods) ─────────────────────────────────────
  {
    allergenKeywords: ["latex"],
    conflictingDrugKeywords: ["rubber stopper", "latex glove"],
    reason: "Latex allergy — ensure latex-free medical supplies and equipment.",
    severity: "HIGH",
  },

  // ── Warfarin / anticoagulants ─────────────────────────────────────────
  {
    allergenKeywords: ["warfarin", "coumadin"],
    conflictingDrugKeywords: ["warfarin", "coumadin"],
    reason: "Direct warfarin allergy — use alternative anticoagulant (DOAC, heparin) as prescribed.",
    severity: "CRITICAL",
  },

  // ── Metformin ─────────────────────────────────────────────────────────
  {
    allergenKeywords: ["metformin"],
    conflictingDrugKeywords: ["metformin", "glucophage", "glumetza", "fortamet"],
    reason: "Metformin allergy — alternative diabetes medications needed.",
    severity: "CRITICAL",
  },

  // ── Allopurinol ───────────────────────────────────────────────────────
  {
    allergenKeywords: ["allopurinol"],
    conflictingDrugKeywords: ["allopurinol", "febuxostat", "uloric"],
    reason: "Xanthine oxidase inhibitor allergy — use alternative gout medication.",
    severity: "HIGH",
  },
];

/**
 * Normalize a substance/drug name for exact matching.
 */
function normalizeForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize for fuzzy matching: collapse consecutive duplicate letters
 * so typos like "peniccilin" → "penicilin" match "penicillin" → "penicilin".
 */
function normalizeFuzzy(name: string): string {
  return normalizeForMatching(name)
    .replace(/(.)\1+/g, "$1"); // collapse "ll" → "l", "cc" → "c", etc.
}

/**
 * Returns true if a and b are a fuzzy match (exact OR duplicate-letter-collapsed match,
 * or one contains the other in either normalized form).
 */
function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle || !haystack) return false;
  // Exact substring match
  if (haystack.includes(needle) || needle.includes(haystack)) return true;
  // Fuzzy (collapsed duplicates) match
  const fh = normalizeFuzzy(haystack);
  const fn = normalizeFuzzy(needle);
  return fh.includes(fn) || fn.includes(fh);
}

/**
 * Check a single medication name against a list of known allergies.
 * Returns array of conflicts found.
 */
export function checkMedicationAgainstAllergies(
  medicationName: string,
  allergies: Array<{ substance: string; reaction?: string; severity?: string }>
): AllergyConflict[] {
  const conflicts: AllergyConflict[] = [];
  const normMed = normalizeForMatching(medicationName);

  for (const allergy of allergies) {
    const normAllergen = normalizeForMatching(allergy.substance);

    // Direct / fuzzy name match first (e.g. "peniccilin" matches "penicillin")
    if (normAllergen && fuzzyIncludes(normMed, normAllergen)) {
      conflicts.push({
        allergen: allergy.substance,
        medication: medicationName,
        reason: `Patient is allergic to "${allergy.substance}" — this medication may be the same substance.`,
        severity: "CRITICAL",
      });
      continue;
    }

    // Cross-reactivity rules
    for (const rule of DRUG_ALLERGY_RULES) {
      // Check if the allergy matches this rule's allergen keywords
      const allergenMatch = rule.allergenKeywords.some(
        (kw) => fuzzyIncludes(normAllergen, normalizeForMatching(kw))
      );
      if (!allergenMatch) continue;

      // Check if the medication matches this rule's conflicting drug keywords
      const drugMatch = rule.conflictingDrugKeywords.some(
        (kw) => fuzzyIncludes(normMed, normalizeForMatching(kw))
      );
      if (!drugMatch) continue;

      // Don't double-report if a direct match was already found
      const alreadyReported = conflicts.some(
        (c) => c.allergen === allergy.substance && c.medication === medicationName
      );
      if (!alreadyReported) {
        conflicts.push({
          allergen: allergy.substance,
          medication: medicationName,
          reason: rule.reason,
          severity: rule.severity,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check all provided medications against all known allergies.
 * Returns a flat list of all conflicts found.
 */
export function getAllAllergyConflicts(
  medications: Array<{ name: string; [key: string]: unknown }>,
  allergies: Array<{ substance: string; reaction?: string; severity?: string }>
): AllergyConflict[] {
  if (!medications.length || !allergies.length) return [];

  const allConflicts: AllergyConflict[] = [];
  const seenKeys = new Set<string>();

  for (const med of medications) {
    const medConflicts = checkMedicationAgainstAllergies(med.name, allergies);
    for (const conflict of medConflicts) {
      const key = `${conflict.allergen}::${conflict.medication}::${conflict.reason}`;
      if (!seenKeys.has(key)) {
        allConflicts.push(conflict);
        seenKeys.add(key);
      }
    }
  }

  return allConflicts;
}
