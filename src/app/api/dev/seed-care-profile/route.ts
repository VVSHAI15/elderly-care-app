import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// POST /api/dev/seed-care-profile?name=Robert+Johnson
// Seeds the care profile for a patient by name (dev only)
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "Robert Johnson";

  const user = await prisma.user.findFirst({
    where: { name: { contains: name } },
    include: { patient: true },
  });

  if (!user?.patient) {
    return NextResponse.json({ error: `Patient "${name}" not found` }, { status: 404 });
  }

  await prisma.patient.update({
    where: { id: user.patient.id },
    data: {
      dischargeInfo: {
        hospital: "Riverside General Hospital",
        diagnosis: "Congestive Heart Failure (CHF) — Compensated",
        mrn: "RGH-2024-087432",
        admissionDate: "February 25, 2026",
        dischargeDate: "March 3, 2026",
        attendingPhysician: "Dr. Sandra Okafor, MD",
        followUpPhysician: "Dr. Marcus Reid, MD",
      },
      warningSigns: {
        emergency: [
          "Sudden, severe chest pain or pressure, squeezing, or tightness",
          "Difficulty breathing at rest or while lying flat (cannot catch breath)",
          "Fainting, loss of consciousness, or sudden collapse",
          "Sudden confusion, slurred speech, facial drooping, or arm weakness (signs of stroke)",
          "Heart rate over 130 beats per minute or irregular heartbeat with dizziness",
          "Coughing up pink, foamy mucus",
        ],
        callDoctor: [
          "Weight gain of more than 2 lbs overnight or 5 lbs within one week",
          "Increased swelling in ankles, feet, or legs",
          "Shortness of breath that is new or getting worse with minimal activity",
          "Dizziness or lightheadedness, especially after taking medications",
          "New or worsening cough (especially at night)",
          "Reduced urine output or dark-colored urine",
          "Fever above 101°F (38.3°C) lasting more than 24 hours",
          "Nausea, vomiting, or inability to keep medications down for more than one day",
        ],
      },
      exerciseGuidelines: {
        phases: [
          {
            period: "Week 1–2",
            instructions:
              "Short, slow walks of 5–10 minutes, 1–2 times per day inside the home. Rest between activities. Avoid climbing more than one flight of stairs per day.",
          },
          {
            period: "Week 3–4",
            instructions:
              "Increase walks to 15–20 minutes outdoors on flat ground. Aim for 3–4 times per week. Light household tasks (folding laundry, light cooking) are acceptable.",
          },
          {
            period: "Week 5+",
            instructions:
              "Gradually increase to 30-minute walks 5 days per week as tolerated. Discuss beginning a supervised cardiac rehabilitation program with Dr. Reid.",
          },
        ],
        restrictions: [
          "No heavy lifting (over 10 lbs) for at least 4 weeks",
          "No strenuous yard work, shoveling, or pushing heavy objects",
          "No swimming or water aerobics until cleared by cardiologist",
          "Stop all activity immediately if you feel chest pain, severe shortness of breath, or dizziness",
        ],
      },
      dietRestrictions: {
        items: [
          {
            category: "Sodium (Salt)",
            instruction:
              "Limit to 2,000 mg per day (about 1 teaspoon total). Avoid canned soups, deli meats, fast food, and salty snacks. Read all nutrition labels.",
          },
          {
            category: "Fluid Intake",
            instruction:
              "Limit total daily fluids to 1.5–2 liters (about 6–8 cups). This includes water, juice, coffee, tea, soup broth, and ice cream.",
          },
          {
            category: "Potassium",
            instruction:
              "Eat potassium-rich foods (bananas, oranges, potatoes, spinach) — but avoid potassium supplements unless prescribed.",
          },
          {
            category: "Alcohol",
            instruction:
              "Avoid alcohol completely. Alcohol weakens the heart muscle and interacts with your medications.",
          },
          {
            category: "Daily Weigh-In",
            instruction:
              "Weigh yourself every morning before breakfast, after using the restroom. Record in a notebook. Call Dr. Reid if you gain more than 2 lbs in one day or 5 lbs in one week.",
          },
        ],
      },
      followUpAppointments: [
        {
          priority: "URGENT",
          type: "Post-discharge check-up",
          timeframe: "Within 7 days (by March 10)",
          physician: "Dr. Marcus Reid — (804) 555-0250",
          reason: "Assess fluid status, weight, and symptoms",
        },
        {
          priority: "REQUIRED",
          type: "Cardiology follow-up",
          timeframe: "2–3 weeks (by March 24)",
          physician: "Dr. Reid — Cardiology Clinic, Suite 400",
          reason: "Review echocardiogram and medication response",
        },
        {
          priority: "REQUIRED",
          type: "Blood work (BMP + BNP)",
          timeframe: "Within 1 week (by March 10)",
          physician: "Riverside Lab, Ground Floor",
          reason: "Check kidney function and potassium levels",
        },
        {
          priority: "SCHEDULED",
          type: "Cardiac Rehabilitation Consult",
          timeframe: "4 weeks (by March 31)",
          physician: "Dr. Reid to provide referral",
          reason: "Begin supervised exercise program",
        },
        {
          priority: "RECOMMENDED",
          type: "Primary Care Annual Review",
          timeframe: "Within 3 months (by June 3)",
          physician: "Your PCP office",
          reason: "Medication reconciliation, overall health review",
        },
      ],
      careContacts: [
        { name: "Emergency", phone: "911", hours: "Life-threatening emergency" },
        {
          name: "Dr. Marcus Reid (Cardiology)",
          phone: "(804) 555-0250",
          hours: "Mon–Fri 8 AM–5 PM",
        },
        {
          name: "After-Hours Nurse Line",
          phone: "(804) 555-0275",
          hours: "Evenings, weekends, holidays",
        },
        {
          name: "Riverside Pharmacy",
          phone: "(804) 555-0150",
          hours: "Prescription refills & questions",
        },
        {
          name: "Home Health Services",
          phone: "(804) 555-0300",
          hours: "Scheduled home visits",
        },
        {
          name: "Social Work / Support",
          phone: "(804) 555-0320",
          hours: "Transportation, meals, assistance",
        },
      ],
    },
  });

  return NextResponse.json({ message: `Care profile seeded for ${user.name}`, patientId: user.patient.id });
}
