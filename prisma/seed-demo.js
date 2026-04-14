/**
 * Demo seed — creates a realistic care agency with 4 patients,
 * 3 caregivers, 1 admin, and 4 family members for class demos.
 *
 * Run: node prisma/seed-demo.js
 * All accounts use password: Demo1234!
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASS = bcrypt.hashSync("Demo1234!", 12);

// ── helpers ────────────────────────────────────────────────────────────────
const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const todayAt  = (h, m = 0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
const dateOf   = (yyyy, mm, dd) => new Date(`${yyyy}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}T00:00:00`);

async function main() {
  console.log("🌱  Seeding demo data...\n");

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: { name: "Sunrise Home Care Agency" },
  });
  console.log("✓ Organization:", org.name);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@sunrisecare.demo",
      password: PASS,
      name: "Sarah Johnson",
      role: "ADMIN",
      organizationId: org.id,
    },
  });
  console.log("✓ Admin:", admin.name, admin.email);

  // ── Caregivers ────────────────────────────────────────────────────────────
  const [cg1, cg2, cg3] = await Promise.all([
    prisma.user.create({ data: { email: "alex@sunrisecare.demo",  password: PASS, name: "Alex Rivera",    role: "CAREGIVER", organizationId: org.id } }),
    prisma.user.create({ data: { email: "jamie@sunrisecare.demo", password: PASS, name: "Jamie Thompson", role: "CAREGIVER", organizationId: org.id } }),
    prisma.user.create({ data: { email: "maria@sunrisecare.demo", password: PASS, name: "Maria Santos",   role: "CAREGIVER", organizationId: org.id } }),
  ]);
  console.log("✓ Caregivers:", [cg1, cg2, cg3].map(c => c.name).join(", "));

  // ── Patient 1: Dorothy Williams — cardiac, 78 ─────────────────────────────
  const dorothyUser = await prisma.user.create({
    data: { email: "dorothy@sunrisecare.demo", password: PASS, name: "Dorothy Williams", role: "PATIENT" },
  });
  const dorothy = await prisma.patient.create({
    data: {
      userId: dorothyUser.id,
      organizationId: org.id,
      dateOfBirth: dateOf(1947, 3, 14),
      medicalNotes: "History of congestive heart failure and hypertension. Pacemaker implanted 2021. Low-sodium diet required.",
      emergencyContact: "Linda Williams (daughter) — 555-201-4567",
      familyMembers: { connect: [{ id: cg1.id }, { id: cg2.id }] },
      conditions: { items: [
        { name: "Congestive Heart Failure", status: "managed", notes: "Stable on current medication" },
        { name: "Hypertension", status: "managed", notes: "Blood pressure monitored daily" },
        { name: "Pacemaker", status: "active", notes: "Implanted March 2021, next check June 2026" },
      ]},
      allergies: { items: [
        { substance: "Penicillin", reaction: "Hives and difficulty breathing", severity: "severe" },
        { substance: "Aspirin", reaction: "GI upset", severity: "moderate" },
      ]},
      warningSigns: { items: [
        "Sudden shortness of breath or difficulty breathing",
        "Chest pain or pressure",
        "Swelling in legs or ankles worsening",
        "Weight gain of more than 2 lbs in a day",
        "Dizziness or fainting",
      ]},
      dietRestrictions: {
        restrictions: ["Low sodium (less than 1500mg/day)", "Fluid restriction (64 oz/day)", "No grapefruit (medication interaction)"],
        notes: "Weigh daily before breakfast. Record in log.",
      },
      followUpAppointments: { items: [
        { provider: "Dr. Patricia Moore (Cardiologist)", date: daysFrom(12).toISOString(), location: "Baltimore Heart Center", notes: "Pacemaker check + echocardiogram" },
        { provider: "Dr. James Lee (Primary Care)", date: daysFrom(21).toISOString(), location: "Sunrise Medical Group", notes: "Routine labs and medication review" },
      ]},
    },
  });

  // Dorothy's medications
  const dorMeds = await Promise.all([
    prisma.medication.create({ data: { patientId: dorothy.id, name: "Lisinopril", dosage: "10mg", frequency: "Once daily (morning)", instructions: "Take with water, avoid standing quickly", prescriber: "Dr. Patricia Moore", startDate: daysAgo(180), isActive: true } }),
    prisma.medication.create({ data: { patientId: dorothy.id, name: "Furosemide (Lasix)", dosage: "40mg", frequency: "Once daily (morning)", instructions: "Monitor for dizziness. Take early in day.", prescriber: "Dr. Patricia Moore", startDate: daysAgo(180), refillDate: daysFrom(10), isActive: true } }),
    prisma.medication.create({ data: { patientId: dorothy.id, name: "Carvedilol", dosage: "6.25mg", frequency: "Twice daily (morning and evening)", instructions: "Take with food", prescriber: "Dr. Patricia Moore", startDate: daysAgo(180), isActive: true } }),
    prisma.medication.create({ data: { patientId: dorothy.id, name: "Potassium Chloride", dosage: "20mEq", frequency: "Once daily", instructions: "Take with full glass of water and food", prescriber: "Dr. Patricia Moore", startDate: daysAgo(180), isActive: true } }),
  ]);

  // Dorothy's tasks today
  await prisma.task.createMany({ data: [
    { patientId: dorothy.id, title: "Morning medications (Lisinopril, Furosemide, Carvedilol, Potassium)", category: "MEDICATION", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8), completedAt: todayAt(8, 15) },
    { patientId: dorothy.id, title: "Weigh patient and record", category: "OTHER", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8), completedAt: todayAt(8, 10) },
    { patientId: dorothy.id, title: "Low-sodium breakfast", category: "MEAL", status: "COMPLETED", priority: "MEDIUM", dueDate: todayAt(8, 30), completedAt: todayAt(8, 45) },
    { patientId: dorothy.id, title: "Blood pressure check", category: "OTHER", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(9), completedAt: todayAt(9, 5) },
    { patientId: dorothy.id, title: "Fluid intake — 32 oz by noon", category: "HYDRATION", status: "IN_PROGRESS", priority: "MEDIUM", dueDate: todayAt(12) },
    { patientId: dorothy.id, title: "Gentle seated exercises (15 min)", category: "EXERCISE", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(10, 30) },
    { patientId: dorothy.id, title: "Evening medications (Carvedilol)", category: "MEDICATION", status: "PENDING", priority: "HIGH", dueDate: todayAt(18) },
    { patientId: dorothy.id, title: "Leg swelling check — record notes", category: "OTHER", status: "PENDING", priority: "HIGH", dueDate: todayAt(17) },
  ]});

  // Dorothy's health metrics (last 7 days)
  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i); d.setHours(9, 0, 0, 0);
    const systolic  = 128 + Math.floor(Math.random() * 20) - 10;
    const diastolic = 80  + Math.floor(Math.random() * 10) - 5;
    await prisma.healthMetric.createMany({ data: [
      { patientId: dorothy.id, type: "blood_pressure", value: `${systolic}/${diastolic}`, unit: "mmHg", recordedAt: d, recordedById: cg1.id },
      { patientId: dorothy.id, type: "weight", value: String((162 + (Math.random() * 2 - 1)).toFixed(1)), unit: "lbs", recordedAt: d, recordedById: cg1.id },
      { patientId: dorothy.id, type: "heart_rate", value: String(68 + Math.floor(Math.random() * 12)), unit: "bpm", recordedAt: d, recordedById: cg1.id },
    ]});
  }

  // Dorothy's shifts (past week + next week)
  for (let i = 5; i >= 1; i--) {
    const start = daysAgo(i); start.setHours(8, 0, 0, 0);
    const end   = daysAgo(i); end.setHours(16, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: cg1.id, patientId: dorothy.id, startTime: start, endTime: end, status: "COMPLETED", createdById: admin.id } });
  }
  await prisma.scheduledShift.create({ data: { caregiverId: cg1.id, patientId: dorothy.id, startTime: todayAt(8), endTime: todayAt(16), status: "IN_PROGRESS", createdById: admin.id } });
  for (let i = 1; i <= 5; i++) {
    const start = daysFrom(i); start.setHours(8, 0, 0, 0);
    const end   = daysFrom(i); end.setHours(16, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: cg1.id, patientId: dorothy.id, startTime: start, endTime: end, status: "SCHEDULED", createdById: admin.id } });
  }
  console.log("✓ Patient 1: Dorothy Williams (cardiac)");

  // ── Patient 2: Robert Chen — diabetes + mobility, 82 ─────────────────────
  const robertUser = await prisma.user.create({
    data: { email: "robert@sunrisecare.demo", password: PASS, name: "Robert Chen", role: "PATIENT" },
  });
  const robert = await prisma.patient.create({
    data: {
      userId: robertUser.id,
      organizationId: org.id,
      dateOfBirth: dateOf(1943, 8, 22),
      medicalNotes: "Type 2 diabetes, moderate dementia, right hip replacement (Nov 2025). Uses walker. Fall risk — bed rails in use.",
      emergencyContact: "Kevin Chen (son) — 555-312-8901",
      familyMembers: { connect: [{ id: cg2.id }, { id: cg3.id }] },
      conditions: { items: [
        { name: "Type 2 Diabetes", status: "managed", notes: "Blood glucose checked twice daily" },
        { name: "Moderate Dementia", status: "active", notes: "May become confused in evenings (sundowning)" },
        { name: "Right Hip Replacement", status: "recovering", notes: "Surgery Nov 2025, PT 3x/week" },
        { name: "Osteoarthritis", status: "managed", notes: "Bilateral knees, managed with PT and medication" },
      ]},
      allergies: { items: [
        { substance: "Sulfa drugs", reaction: "Rash", severity: "moderate" },
        { substance: "Latex", reaction: "Contact dermatitis", severity: "mild" },
      ]},
      warningSigns: { items: [
        "Blood glucose below 70 or above 300 — call 911 immediately",
        "Signs of fall or unsteady gait",
        "Increased confusion or agitation beyond baseline",
        "Redness, warmth, or swelling at hip replacement site",
        "Not eating or drinking for more than 8 hours",
      ]},
      dietRestrictions: {
        restrictions: ["Diabetic diet — no added sugar", "Carbohydrate controlled (45g per meal)", "Small frequent meals preferred"],
        notes: "Check glucose before breakfast and before dinner. Record in log.",
      },
    },
  });

  await Promise.all([
    prisma.medication.create({ data: { patientId: robert.id, name: "Metformin", dosage: "500mg", frequency: "Twice daily (with meals)", instructions: "Take with food to reduce GI upset", prescriber: "Dr. Susan Park", startDate: daysAgo(365), isActive: true } }),
    prisma.medication.create({ data: { patientId: robert.id, name: "Glipizide", dosage: "5mg", frequency: "Once daily (30 min before breakfast)", instructions: "Monitor for low blood sugar", prescriber: "Dr. Susan Park", startDate: daysAgo(365), isActive: true } }),
    prisma.medication.create({ data: { patientId: robert.id, name: "Donepezil (Aricept)", dosage: "10mg", frequency: "Once daily (bedtime)", instructions: "May cause vivid dreams", prescriber: "Dr. Thomas Grant (Neurologist)", startDate: daysAgo(200), isActive: true } }),
    prisma.medication.create({ data: { patientId: robert.id, name: "Celecoxib", dosage: "200mg", frequency: "Once daily", instructions: "Take with food", prescriber: "Dr. Susan Park", startDate: daysAgo(120), isActive: true } }),
  ]);

  await prisma.task.createMany({ data: [
    { patientId: robert.id, title: "Blood glucose check (pre-breakfast)", category: "MEDICATION", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(7, 30), completedAt: todayAt(7, 35) },
    { patientId: robert.id, title: "Morning medications (Metformin + Glipizide)", category: "MEDICATION", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8), completedAt: todayAt(8, 10) },
    { patientId: robert.id, title: "Assist with shower and personal hygiene", category: "PERSONAL_CARE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(9), completedAt: todayAt(9, 45) },
    { patientId: robert.id, title: "Physical therapy exercises (hip)", category: "EXERCISE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(10, 30), completedAt: todayAt(11) },
    { patientId: robert.id, title: "Diabetic lunch — record carb intake", category: "MEAL", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(12) },
    { patientId: robert.id, title: "Blood glucose check (pre-dinner)", category: "MEDICATION", status: "PENDING", priority: "HIGH", dueDate: todayAt(17, 30) },
    { patientId: robert.id, title: "Evening medications (Metformin + Donepezil)", category: "MEDICATION", status: "PENDING", priority: "HIGH", dueDate: todayAt(18) },
    { patientId: robert.id, title: "Evening walk with walker (10 min)", category: "EXERCISE", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(16) },
    { patientId: robert.id, title: "Social activity — family phone call", category: "SOCIAL", status: "PENDING", priority: "LOW", dueDate: todayAt(19) },
  ]});

  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i); d.setHours(7, 30, 0, 0);
    await prisma.healthMetric.createMany({ data: [
      { patientId: robert.id, type: "blood_glucose", value: String(108 + Math.floor(Math.random() * 40) - 10), unit: "mg/dL", recordedAt: d, recordedById: cg2.id, notes: "Pre-breakfast" },
      { patientId: robert.id, type: "blood_glucose", value: String(140 + Math.floor(Math.random() * 30) - 10), unit: "mg/dL", recordedAt: new Date(d.getTime() + 10 * 3600000), recordedById: cg2.id, notes: "Pre-dinner" },
    ]});
  }

  for (let i = 5; i >= 1; i--) {
    const start = daysAgo(i); start.setHours(7, 0, 0, 0);
    const end   = daysAgo(i); end.setHours(15, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: cg2.id, patientId: robert.id, startTime: start, endTime: end, status: "COMPLETED", createdById: admin.id } });
  }
  await prisma.scheduledShift.create({ data: { caregiverId: cg2.id, patientId: robert.id, startTime: todayAt(7), endTime: todayAt(15), status: "IN_PROGRESS", createdById: admin.id } });
  for (let i = 1; i <= 5; i++) {
    const start = daysFrom(i); start.setHours(7, 0, 0, 0);
    const end   = daysFrom(i); end.setHours(15, 0, 0, 0);
    const caregiver = i % 3 === 0 ? cg3 : cg2;
    await prisma.scheduledShift.create({ data: { caregiverId: caregiver.id, patientId: robert.id, startTime: start, endTime: end, status: "SCHEDULED", createdById: admin.id } });
  }
  console.log("✓ Patient 2: Robert Chen (diabetes + dementia)");

  // ── Patient 3: Margaret Sullivan — post-surgery recovery, 71 ─────────────
  const margaretUser = await prisma.user.create({
    data: { email: "margaret@sunrisecare.demo", password: PASS, name: "Margaret Sullivan", role: "PATIENT" },
  });
  const margaret = await prisma.patient.create({
    data: {
      userId: margaretUser.id,
      organizationId: org.id,
      dateOfBirth: dateOf(1954, 11, 5),
      medicalNotes: "Recovering from knee replacement surgery (left knee, March 2026). Previously active. Motivated patient. Mild hypertension.",
      emergencyContact: "Patrick Sullivan (husband) — 555-445-6789",
      familyMembers: { connect: [{ id: cg3.id }] },
      conditions: { items: [
        { name: "Left Knee Replacement", status: "recovering", notes: "Surgery March 10, 2026. PT 3x/week. Target: walking without aid by June." },
        { name: "Hypertension", status: "managed", notes: "Well-controlled on Amlodipine" },
        { name: "Mild Anxiety", status: "managed", notes: "Related to recovery progress" },
      ]},
      allergies: { items: [
        { substance: "Codeine", reaction: "Nausea and vomiting", severity: "moderate" },
      ]},
      warningSigns: { items: [
        "Increased redness, warmth, or swelling at incision site",
        "Fever above 101°F",
        "Sudden severe pain in the knee",
        "Calf pain, redness, or swelling (DVT risk)",
        "Difficulty breathing or chest pain",
      ]},
      dietRestrictions: {
        restrictions: ["High-protein diet to support healing", "Adequate calcium and vitamin D", "Limit alcohol"],
        notes: "Encourage increased fluid intake. Iron-rich foods recommended.",
      },
      dischargeInfo: {
        hospital: "Johns Hopkins Hospital",
        dischargeDate: daysAgo(35).toISOString(),
        diagnosis: "Left total knee arthroplasty",
        surgeonNotes: "Procedure successful. No complications. Weight-bearing as tolerated with walker. Wound care daily until sutures removed.",
        restrictions: ["No driving for 6 weeks", "No kneeling or squatting", "Elevate leg when sitting"],
      },
    },
  });

  await Promise.all([
    prisma.medication.create({ data: { patientId: margaret.id, name: "Amlodipine", dosage: "5mg", frequency: "Once daily (morning)", prescriber: "Dr. Rachel Kim", startDate: daysAgo(200), isActive: true } }),
    prisma.medication.create({ data: { patientId: margaret.id, name: "Celecoxib", dosage: "200mg", frequency: "Twice daily (with food)", instructions: "For post-op pain management", prescriber: "Dr. Michael Torres (Orthopedic Surgeon)", startDate: daysAgo(35), endDate: daysFrom(14), isActive: true } }),
    prisma.medication.create({ data: { patientId: margaret.id, name: "Aspirin", dosage: "81mg", frequency: "Once daily (morning)", instructions: "DVT prevention — do not skip", prescriber: "Dr. Michael Torres", startDate: daysAgo(35), endDate: daysFrom(14), isActive: true } }),
    prisma.medication.create({ data: { patientId: margaret.id, name: "Calcium + Vitamin D", dosage: "600mg/400IU", frequency: "Twice daily", instructions: "Take with meals", prescriber: "Dr. Rachel Kim", startDate: daysAgo(90), isActive: true } }),
  ]);

  await prisma.task.createMany({ data: [
    { patientId: margaret.id, title: "Morning medications (Amlodipine, Aspirin, Celecoxib, Calcium)", category: "MEDICATION", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8), completedAt: todayAt(8, 10) },
    { patientId: margaret.id, title: "Incision site wound care", category: "PERSONAL_CARE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8, 30), completedAt: todayAt(8, 50) },
    { patientId: margaret.id, title: "PT exercises — quad sets and ankle pumps (20 min)", category: "EXERCISE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(9, 30), completedAt: todayAt(9, 55) },
    { patientId: margaret.id, title: "Assisted walk with walker (100 feet)", category: "EXERCISE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(11), completedAt: todayAt(11, 15) },
    { patientId: margaret.id, title: "Afternoon medications (Celecoxib, Calcium)", category: "MEDICATION", status: "PENDING", priority: "HIGH", dueDate: todayAt(14) },
    { patientId: margaret.id, title: "Afternoon PT session — stair training", category: "EXERCISE", status: "PENDING", priority: "HIGH", dueDate: todayAt(15) },
    { patientId: margaret.id, title: "Ice knee (20 min) after exercise", category: "OTHER", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(16) },
    { patientId: margaret.id, title: "Record pain level (0–10 scale)", category: "OTHER", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(18) },
  ]});

  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i); d.setHours(9, 0, 0, 0);
    await prisma.healthMetric.createMany({ data: [
      { patientId: margaret.id, type: "blood_pressure", value: `${118 + Math.floor(Math.random() * 16)}/${74 + Math.floor(Math.random() * 8)}`, unit: "mmHg", recordedAt: d, recordedById: cg3.id },
      { patientId: margaret.id, type: "temperature", value: String((98.2 + Math.random() * 0.8).toFixed(1)), unit: "°F", recordedAt: d, recordedById: cg3.id },
    ]});
  }

  for (let i = 5; i >= 1; i--) {
    const start = daysAgo(i); start.setHours(9, 0, 0, 0);
    const end   = daysAgo(i); end.setHours(17, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: cg3.id, patientId: margaret.id, startTime: start, endTime: end, status: "COMPLETED", createdById: admin.id } });
  }
  await prisma.scheduledShift.create({ data: { caregiverId: cg3.id, patientId: margaret.id, startTime: todayAt(9), endTime: todayAt(17), status: "IN_PROGRESS", createdById: admin.id } });
  for (let i = 1; i <= 5; i++) {
    const start = daysFrom(i); start.setHours(9, 0, 0, 0);
    const end   = daysFrom(i); end.setHours(17, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: cg3.id, patientId: margaret.id, startTime: start, endTime: end, status: "SCHEDULED", createdById: admin.id } });
  }
  console.log("✓ Patient 3: Margaret Sullivan (post-surgery recovery)");

  // ── Patient 4: Harold Thompson — COPD + mild stroke, 80 ──────────────────
  const haroldUser = await prisma.user.create({
    data: { email: "harold@sunrisecare.demo", password: PASS, name: "Harold Thompson", role: "PATIENT" },
  });
  const harold = await prisma.patient.create({
    data: {
      userId: haroldUser.id,
      organizationId: org.id,
      dateOfBirth: dateOf(1945, 6, 30),
      medicalNotes: "COPD (moderate severity), mild ischemic stroke Jan 2026 with left-side weakness. Smoker (quit 2023). Uses supplemental oxygen at night.",
      emergencyContact: "Barbara Thompson (wife) — 555-567-8901",
      familyMembers: { connect: [{ id: cg1.id }, { id: cg3.id }] },
      conditions: { items: [
        { name: "COPD (Moderate)", status: "managed", notes: "FEV1 58% predicted. Pulm rehab 2x/week." },
        { name: "Mild Ischemic Stroke", status: "recovering", notes: "January 2026. Left-side mild weakness. Speech nearly fully recovered." },
        { name: "Atrial Fibrillation", status: "managed", notes: "On anticoagulation. INR monitored monthly." },
        { name: "Former Smoker", status: "resolved", notes: "Quit July 2023 after 40-year history" },
      ]},
      allergies: { items: [
        { substance: "NSAIDs", reaction: "Worsens breathing", severity: "moderate" },
        { substance: "Shellfish", reaction: "Anaphylaxis", severity: "severe" },
      ]},
      warningSigns: { items: [
        "Sudden worsening of shortness of breath not relieved by inhaler",
        "New or worsening weakness on left side",
        "Slurred speech or facial drooping",
        "Oxygen saturation below 90%",
        "Signs of bleeding (unusual bruising, blood in urine/stool) — on Warfarin",
      ]},
      dietRestrictions: {
        restrictions: ["Consistent Vitamin K intake (on Warfarin)", "Soft foods preferred (stroke history)", "No shellfish (severe allergy)"],
        notes: "Small frequent meals to avoid breathlessness during eating. Ensure adequate protein.",
      },
    },
  });

  await Promise.all([
    prisma.medication.create({ data: { patientId: harold.id, name: "Tiotropium (Spiriva)", dosage: "18mcg", frequency: "Once daily (inhaled)", instructions: "Use HandiHaler device. Rinse mouth after use.", prescriber: "Dr. Linda Okafor (Pulmonologist)", startDate: daysAgo(400), isActive: true } }),
    prisma.medication.create({ data: { patientId: harold.id, name: "Albuterol (rescue inhaler)", dosage: "2 puffs", frequency: "As needed for breathlessness", instructions: "Maximum 4 times per day. Seek help if no relief.", prescriber: "Dr. Linda Okafor", startDate: daysAgo(400), isActive: true } }),
    prisma.medication.create({ data: { patientId: harold.id, name: "Warfarin", dosage: "5mg", frequency: "Once daily (same time)", instructions: "Do NOT take with Vitamin K supplements. Report unusual bleeding.", prescriber: "Dr. Samuel Rivera (Neurologist)", startDate: daysAgo(90), refillDate: daysFrom(8), isActive: true } }),
    prisma.medication.create({ data: { patientId: harold.id, name: "Atorvastatin", dosage: "40mg", frequency: "Once daily (evening)", prescriber: "Dr. Samuel Rivera", startDate: daysAgo(90), isActive: true } }),
    prisma.medication.create({ data: { patientId: harold.id, name: "Clopidogrel (Plavix)", dosage: "75mg", frequency: "Once daily", instructions: "Do not stop without consulting doctor", prescriber: "Dr. Samuel Rivera", startDate: daysAgo(90), isActive: true } }),
  ]);

  await prisma.task.createMany({ data: [
    { patientId: harold.id, title: "Morning medications (Tiotropium, Warfarin, Atorvastatin, Plavix)", category: "MEDICATION", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8), completedAt: todayAt(8, 10) },
    { patientId: harold.id, title: "Oxygen saturation and pulse check", category: "OTHER", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(8, 30), completedAt: todayAt(8, 35) },
    { patientId: harold.id, title: "Pulmonary rehab breathing exercises (20 min)", category: "EXERCISE", status: "COMPLETED", priority: "HIGH", dueDate: todayAt(9), completedAt: todayAt(9, 25) },
    { patientId: harold.id, title: "Left-side strength exercises (PT protocol)", category: "EXERCISE", status: "IN_PROGRESS", priority: "HIGH", dueDate: todayAt(10, 30) },
    { patientId: harold.id, title: "High-protein soft lunch", category: "MEAL", status: "PENDING", priority: "MEDIUM", dueDate: todayAt(12) },
    { patientId: harold.id, title: "Afternoon oxygen sat check", category: "OTHER", status: "PENDING", priority: "HIGH", dueDate: todayAt(14) },
    { patientId: harold.id, title: "Evening medications (Atorvastatin)", category: "MEDICATION", status: "PENDING", priority: "HIGH", dueDate: todayAt(18) },
    { patientId: harold.id, title: "Set up overnight oxygen concentrator", category: "OTHER", status: "PENDING", priority: "HIGH", dueDate: todayAt(21) },
  ]});

  for (let i = 6; i >= 0; i--) {
    const d = daysAgo(i); d.setHours(8, 30, 0, 0);
    await prisma.healthMetric.createMany({ data: [
      { patientId: harold.id, type: "oxygen_saturation", value: String(93 + Math.floor(Math.random() * 4)), unit: "%", recordedAt: d, recordedById: cg1.id },
      { patientId: harold.id, type: "heart_rate", value: String(72 + Math.floor(Math.random() * 16)), unit: "bpm", recordedAt: d, recordedById: cg1.id },
      { patientId: harold.id, type: "blood_pressure", value: `${130 + Math.floor(Math.random() * 20) - 10}/${82 + Math.floor(Math.random() * 10) - 5}`, unit: "mmHg", recordedAt: d, recordedById: cg1.id },
    ]});
  }

  // Harold alternates between cg1 and cg3
  for (let i = 5; i >= 1; i--) {
    const start = daysAgo(i); start.setHours(10, 0, 0, 0);
    const end   = daysAgo(i); end.setHours(18, 0, 0, 0);
    await prisma.scheduledShift.create({ data: { caregiverId: i % 2 === 0 ? cg1.id : cg3.id, patientId: harold.id, startTime: start, endTime: end, status: "COMPLETED", createdById: admin.id } });
  }
  await prisma.scheduledShift.create({ data: { caregiverId: cg1.id, patientId: harold.id, startTime: todayAt(10), endTime: todayAt(18), status: "IN_PROGRESS", createdById: admin.id } });
  for (let i = 1; i <= 5; i++) {
    const start = daysFrom(i); start.setHours(10, 0, 0, 0);
    const end   = daysFrom(i); end.setHours(18, 0, 0, 0);
    const caregiver = i % 2 === 0 ? cg3 : cg1;
    await prisma.scheduledShift.create({ data: { caregiverId: caregiver.id, patientId: harold.id, startTime: start, endTime: end, status: "SCHEDULED", createdById: admin.id } });
  }
  console.log("✓ Patient 4: Harold Thompson (COPD + stroke)");

  // ── Family Members ────────────────────────────────────────────────────────
  const [fam1, fam2, fam3, fam4] = await Promise.all([
    prisma.user.create({ data: { email: "linda@sunrisecare.demo",   password: PASS, name: "Linda Williams",  role: "FAMILY_MEMBER" } }),
    prisma.user.create({ data: { email: "kevin@sunrisecare.demo",   password: PASS, name: "Kevin Chen",      role: "FAMILY_MEMBER" } }),
    prisma.user.create({ data: { email: "patrick@sunrisecare.demo", password: PASS, name: "Patrick Sullivan",role: "FAMILY_MEMBER" } }),
    prisma.user.create({ data: { email: "barbara@sunrisecare.demo", password: PASS, name: "Barbara Thompson",role: "FAMILY_MEMBER" } }),
  ]);

  await prisma.patient.update({ where: { id: dorothy.id  }, data: { familyMembers: { connect: { id: fam1.id } } } });
  await prisma.patient.update({ where: { id: robert.id   }, data: { familyMembers: { connect: { id: fam2.id } } } });
  await prisma.patient.update({ where: { id: margaret.id }, data: { familyMembers: { connect: { id: fam3.id } } } });
  await prisma.patient.update({ where: { id: harold.id   }, data: { familyMembers: { connect: { id: fam4.id } } } });
  console.log("✓ Family members:", [fam1, fam2, fam3, fam4].map(f => f.name).join(", "));

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅  Demo data seeded successfully!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  All accounts use password: Demo1234!\n");
  console.log("  ADMIN");
  console.log("    Sarah Johnson       admin@sunrisecare.demo\n");
  console.log("  CAREGIVERS");
  console.log("    Alex Rivera         alex@sunrisecare.demo");
  console.log("    Jamie Thompson      jamie@sunrisecare.demo");
  console.log("    Maria Santos        maria@sunrisecare.demo\n");
  console.log("  PATIENTS");
  console.log("    Dorothy Williams    dorothy@sunrisecare.demo   (cardiac, 78)");
  console.log("    Robert Chen         robert@sunrisecare.demo    (diabetes + dementia, 82)");
  console.log("    Margaret Sullivan   margaret@sunrisecare.demo  (post-surgery, 71)");
  console.log("    Harold Thompson     harold@sunrisecare.demo    (COPD + stroke, 80)\n");
  console.log("  FAMILY MEMBERS");
  console.log("    Linda Williams      linda@sunrisecare.demo     (Dorothy's daughter)");
  console.log("    Kevin Chen          kevin@sunrisecare.demo     (Robert's son)");
  console.log("    Patrick Sullivan    patrick@sunrisecare.demo   (Margaret's husband)");
  console.log("    Barbara Thompson    barbara@sunrisecare.demo   (Harold's wife)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => { console.error("❌  Seed failed:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
