/**
 * Medical condition care protocol knowledge base.
 * Each protocol maps a condition (with keyword aliases) to a structured
 * set of recommended tasks, monitoring requirements, and care notes.
 */

export interface ProtocolTask {
  title: string;
  description: string;
  category: "MEDICATION" | "APPOINTMENT" | "EXERCISE" | "MEAL" | "HYDRATION" | "PERSONAL_CARE" | "SOCIAL" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isRecurring: boolean;
  recurrence?: string; // "daily", "weekly", "twice-daily", etc.
}

export interface ConditionProtocol {
  id: string;
  name: string;              // Display name
  keywords: string[];        // Fuzzy-match aliases (lowercase)
  description: string;       // Short plain-English description shown to users
  tasks: ProtocolTask[];
  warnings: string[];        // Key warning signs for this condition
  dietNotes?: string[];
  monitoringNotes?: string[];
}

export const CONDITION_PROTOCOLS: ConditionProtocol[] = [
  {
    id: "diabetes-t2",
    name: "Type 2 Diabetes",
    keywords: ["diabetes", "type 2 diabetes", "t2dm", "diabetic", "dm2", "insulin resistance"],
    description: "Comprehensive diabetes management: blood glucose monitoring, insulin/medication adherence, diet management, and foot care.",
    tasks: [
      { title: "Check blood sugar (morning)", description: "Fasting blood glucose check before breakfast. Target: 80–130 mg/dL.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Check blood sugar (evening)", description: "Post-meal blood glucose check 2 hours after dinner. Target: <180 mg/dL.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Take diabetes medication", description: "Administer prescribed diabetes medication with meals as directed by physician.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Foot inspection", description: "Check feet for cuts, sores, blisters, redness, or swelling. Diabetic wounds can become serious quickly.", category: "PERSONAL_CARE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "30-minute walk or exercise", description: "Moderate activity helps lower blood sugar. Avoid exercising when blood sugar is <100 or >300 mg/dL.", category: "EXERCISE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Diabetic-friendly meal planning", description: "Monitor carbohydrate intake. Aim for consistent meal timing. Avoid sugary drinks.", category: "MEAL", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "HbA1c lab appointment", description: "Schedule quarterly HbA1c test to assess 3-month blood sugar control. Target: <7%.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
      { title: "Annual eye exam (diabetic retinopathy)", description: "Annual dilated eye exam to screen for diabetic eye disease.", category: "APPOINTMENT", priority: "MEDIUM", isRecurring: false },
    ],
    warnings: ["Blood sugar below 70 mg/dL (hypoglycemia) — treat immediately with 15g fast-acting carbs", "Blood sugar above 300 mg/dL", "Non-healing wound on foot or leg", "Chest pain, shortness of breath"],
    dietNotes: ["Limit refined carbohydrates and sugary beverages", "Eat consistent meal portions at regular times", "Focus on vegetables, whole grains, lean protein"],
    monitoringNotes: ["Blood glucose: fasting and 2h post-meal", "HbA1c every 3 months", "Blood pressure at every visit"],
  },
  {
    id: "diabetes-t1",
    name: "Type 1 Diabetes",
    keywords: ["type 1 diabetes", "t1dm", "juvenile diabetes", "insulin dependent diabetes"],
    description: "Insulin-dependent diabetes management with frequent glucose monitoring, carb counting, and injection site rotation.",
    tasks: [
      { title: "Check blood sugar (before meals)", description: "Check blood glucose before each meal and correct with insulin as prescribed.", category: "OTHER", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Check blood sugar (bedtime)", description: "Bedtime glucose check to prevent overnight hypoglycemia.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Administer basal insulin", description: "Long-acting insulin dose at the same time each day as prescribed.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Inspect insulin injection sites", description: "Rotate injection sites to prevent lipodystrophy. Check for redness or lumps.", category: "PERSONAL_CARE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Count carbohydrates at meals", description: "Calculate carbohydrate grams for bolus insulin dosing.", category: "MEAL", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Endocrinologist follow-up", description: "Quarterly diabetes specialist appointment for insulin adjustment.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Blood sugar below 70 mg/dL — treat immediately with fast-acting glucose", "Ketones in urine (diabetic ketoacidosis risk)", "Blood sugar above 250 mg/dL with symptoms"],
    monitoringNotes: ["CGM or fingerstick: before meals and bedtime", "Ketone check when blood sugar >250 mg/dL"],
  },
  {
    id: "heart-failure",
    name: "Congestive Heart Failure (CHF)",
    keywords: ["congestive heart failure", "chf", "heart failure", "cardiac failure", "left ventricular failure", "lvf", "systolic heart failure", "diastolic heart failure"],
    description: "Daily weight monitoring, fluid restriction, and medication adherence to prevent fluid overload and hospital readmission.",
    tasks: [
      { title: "Weigh daily (same time)", description: "Weigh each morning after using the bathroom. Call doctor if weight increases >2 lbs in 1 day or >5 lbs in 1 week.", category: "OTHER", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Take heart failure medications", description: "ACE inhibitor/ARB, beta-blocker, and diuretic must be taken as prescribed. Do not skip doses.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Fluid intake log", description: "Track all fluid intake. Stay within prescribed daily limit (often 1.5–2 liters).", category: "HYDRATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Daily sodium count", description: "Keep sodium intake under 2,000 mg/day. Avoid canned soups, processed meats, and salty snacks.", category: "MEAL", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Ankle/leg swelling check", description: "Check ankles and lower legs for pitting edema. Document and report worsening.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "15-minute light walk", description: "Gentle walking as tolerated. Stop if short of breath, dizzy, or chest pain occurs.", category: "EXERCISE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Cardiologist follow-up", description: "Follow-up within 7–14 days of discharge, then every 1–3 months.", category: "APPOINTMENT", priority: "URGENT", isRecurring: false },
    ],
    warnings: ["Weight gain of 2+ lbs overnight", "Increasing shortness of breath or unable to lie flat", "Severe ankle swelling", "Chest pain", "Rapid or irregular heartbeat"],
    dietNotes: ["Sodium restriction: <2,000 mg/day", "Fluid restriction as prescribed", "Avoid alcohol"],
    monitoringNotes: ["Daily weight at same time", "Blood pressure and pulse daily", "BMP (electrolytes/kidney function) periodically"],
  },
  {
    id: "hypertension",
    name: "Hypertension (High Blood Pressure)",
    keywords: ["hypertension", "high blood pressure", "htn", "elevated blood pressure"],
    description: "Blood pressure monitoring, medication adherence, and lifestyle modifications to prevent stroke, heart attack, and kidney damage.",
    tasks: [
      { title: "Check blood pressure (morning)", description: "Before medications, after 5 minutes rest. Record in log. Target: <130/80 mmHg.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Take blood pressure medication", description: "Take antihypertensive medications at the same time each day. Never skip a dose.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Low-sodium meal", description: "DASH diet: limit sodium to 1,500–2,300 mg/day. Emphasize fruits, vegetables, whole grains.", category: "MEAL", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "30-minute aerobic activity", description: "Regular moderate exercise (walking, cycling, swimming) helps lower blood pressure by 5–8 mmHg.", category: "EXERCISE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "BP check (evening)", description: "Evening blood pressure check. Report if consistently above 160/100 mmHg.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "PCP follow-up (blood pressure review)", description: "Check in with primary care physician to review BP log and adjust medications.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["BP above 180/120 mmHg (hypertensive emergency) — call 911", "Severe headache", "Chest pain or shortness of breath", "Vision changes"],
    dietNotes: ["DASH diet recommended", "Limit sodium to <2,300 mg/day", "Reduce alcohol", "Increase potassium-rich foods"],
    monitoringNotes: ["BP twice daily (morning and evening)", "Weekly BP averages to share with doctor"],
  },
  {
    id: "copd",
    name: "COPD",
    keywords: ["copd", "chronic obstructive pulmonary disease", "emphysema", "chronic bronchitis"],
    description: "Breathing exercises, inhaler adherence, oxygen monitoring, and avoiding triggers to prevent exacerbations.",
    tasks: [
      { title: "Use rescue inhaler as needed", description: "Use short-acting bronchodilator (e.g., albuterol) for acute shortness of breath. Max 4 times/day; call doctor if needed more often.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Use maintenance inhaler", description: "Take long-acting bronchodilator or inhaled steroid at prescribed times. Do not skip.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Pursed-lip breathing exercises", description: "Practice pursed-lip breathing for 5 minutes to improve lung efficiency and reduce breathlessness.", category: "EXERCISE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Check oxygen saturation", description: "Morning SpO2 check with pulse oximeter. Target: ≥90%. If <88%, contact doctor.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Avoid COPD triggers", description: "Avoid tobacco smoke, wood smoke, heavy fumes, air pollution, and indoor allergens.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Pulmonologist follow-up", description: "Regular follow-up to review pulmonary function and adjust treatment.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
      { title: "Annual flu vaccine", description: "Flu vaccine annually; pneumococcal vaccine as recommended — critical for COPD patients.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["SpO2 below 88%", "Significant increase in breathlessness compared to normal", "Coughing up blood", "Lips or fingertips turning blue (cyanosis)", "Fever with increased mucus production"],
    monitoringNotes: ["Daily SpO2", "Note changes in sputum color (green/yellow = possible infection)", "6-minute walk test periodically"],
  },
  {
    id: "afib",
    name: "Atrial Fibrillation (AFib)",
    keywords: ["atrial fibrillation", "afib", "a-fib", "af", "irregular heartbeat", "heart arrhythmia"],
    description: "Rate/rhythm control, anticoagulation adherence, and stroke prevention monitoring.",
    tasks: [
      { title: "Take anticoagulant medication", description: "Blood thinners (warfarin/Coumadin, apixaban/Eliquis, rivaroxaban/Xarelto) must be taken exactly as prescribed. Never skip or double dose.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Take rate-control medication", description: "Beta-blocker or calcium channel blocker at prescribed times to control heart rate.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Check pulse for regularity", description: "Check radial pulse for 1 minute each morning. Record rate and note if irregular. Target rate: 60–100 bpm.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Limit alcohol and caffeine", description: "Both can trigger AFib episodes. Limit alcohol to 0–1 drink/day; limit caffeine to 1–2 cups coffee.", category: "MEAL", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Electrophysiology / cardiology follow-up", description: "Regular monitoring of rhythm, rate control, and anticoagulation adequacy.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
      { title: "INR check (if on warfarin)", description: "Regular PT/INR blood test to ensure warfarin is in therapeutic range (2.0–3.0).", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Sudden weakness or numbness on one side (stroke signs — call 911)", "Rapid or very irregular heart rate above 150 bpm", "Fainting or near-fainting", "Chest pain", "Signs of bleeding (blood in urine, unusual bruising) if on anticoagulants"],
    monitoringNotes: ["Daily pulse check", "INR monitoring if on warfarin", "CHADS₂-VASc score assessment"],
  },
  {
    id: "ckd",
    name: "Chronic Kidney Disease (CKD)",
    keywords: ["chronic kidney disease", "ckd", "renal failure", "renal insufficiency", "kidney disease", "nephropathy"],
    description: "Fluid and dietary management, medication review, and regular labs to slow CKD progression.",
    tasks: [
      { title: "Take kidney-protective medications", description: "ACE inhibitors, ARBs, and other nephroprotective medications at prescribed times.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Monitor fluid intake", description: "Track daily fluid intake per physician guidance (restrictions may apply in advanced CKD).", category: "HYDRATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Low-potassium and low-phosphorus meal", description: "Limit potassium (bananas, potatoes, oranges) and phosphorus (dairy, nuts, cola) as prescribed by dietitian.", category: "MEAL", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Daily weight monitoring", description: "Weight each morning to detect fluid retention.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Avoid NSAIDs and nephrotoxic drugs", description: "Do not take ibuprofen, naproxen, or other NSAIDs. Check with pharmacist before any new medication.", category: "MEDICATION", priority: "HIGH", isRecurring: false },
      { title: "Nephrology follow-up with lab work", description: "BMP/CMP labs (creatinine, eGFR, potassium) at frequency directed by nephrologist.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Significant decrease in urine output", "Sudden weight gain (fluid retention)", "Difficulty breathing (fluid in lungs)", "Confusion or altered mental status"],
    dietNotes: ["Protein restriction if prescribed", "Limit potassium-rich foods", "Limit phosphorus-rich foods", "Low-sodium diet"],
    monitoringNotes: ["eGFR and creatinine labs per schedule", "Daily weight", "Blood pressure control is critical"],
  },
  {
    id: "stroke-recovery",
    name: "Stroke Recovery",
    keywords: ["stroke", "cva", "cerebrovascular accident", "tia", "transient ischemic attack", "ischemic stroke", "hemorrhagic stroke", "stroke recovery"],
    description: "Post-stroke rehabilitation, blood pressure control, anticoagulation, and recurrence prevention.",
    tasks: [
      { title: "Antiplatelet / anticoagulant medication", description: "Aspirin, clopidogrel, or anticoagulant as prescribed. Take at same time each day without skipping.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Blood pressure management", description: "Morning and evening BP check. Target: <130/80 mmHg. Report readings above 160/100 mmHg.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Physical therapy exercises", description: "Perform prescribed PT exercises to regain motor function and prevent spasticity.", category: "EXERCISE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Speech/language exercises", description: "Aphasia or dysarthria exercises as prescribed by speech therapist.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Fall prevention precautions", description: "Use assistive devices as recommended. Keep pathways clear. Supervise transfers.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Swallowing safety assessment", description: "Ensure safe swallowing per dysphagia precautions if applicable. Use prescribed diet texture.", category: "MEAL", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Neurologist follow-up", description: "Follow-up with neurologist for medication adjustment and recovery assessment.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["FAST signs: Face drooping, Arm weakness, Speech difficulty, Time to call 911", "Sudden severe headache", "Vision changes", "Confusion or disorientation"],
    monitoringNotes: ["Daily BP monitoring", "Monitor for signs of stroke recurrence (FAST)", "Track functional recovery progress"],
  },
  {
    id: "hip-knee-replacement",
    name: "Hip / Knee Replacement Recovery",
    keywords: ["hip replacement", "knee replacement", "total hip arthroplasty", "tha", "total knee arthroplasty", "tka", "joint replacement", "orthopedic surgery"],
    description: "Post-surgical recovery: DVT prevention, wound care, progressive mobility, and fall prevention.",
    tasks: [
      { title: "DVT prevention medication", description: "Take prescribed blood thinner (aspirin, enoxaparin, or other anticoagulant) to prevent blood clots.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Ankle pumps and leg exercises", description: "Ankle pump exercises every hour while awake to promote circulation and prevent DVT.", category: "EXERCISE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Physical therapy session", description: "Attend scheduled PT or perform prescribed home exercises for strengthening and range of motion.", category: "EXERCISE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Wound / incision inspection", description: "Inspect surgical site for redness, warmth, drainage, or opening. Keep clean and dry.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Hip precautions compliance (hip replacement)", description: "Do not bend hip >90°. Do not cross legs. Use raised toilet seat and chair cushion.", category: "PERSONAL_CARE", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Ice and elevation", description: "Ice surgical area 20 minutes several times daily. Keep leg elevated to reduce swelling.", category: "PERSONAL_CARE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Orthopedic surgeon follow-up", description: "Post-operative follow-up at 2 weeks, 6 weeks, and 3 months typically required.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Signs of DVT: sudden calf pain, swelling, redness (call doctor immediately)", "Signs of PE: chest pain, shortness of breath (call 911)", "Signs of infection: fever >101.5°F, wound drainage, increased redness", "Dislocation signs (hip): sudden severe pain with a pop/clunk"],
    monitoringNotes: ["Daily wound inspection", "Watch for DVT symptoms", "Track weight-bearing progress per PT plan"],
  },
  {
    id: "dementia",
    name: "Dementia / Alzheimer's Disease",
    keywords: ["dementia", "alzheimer", "alzheimer's", "alzheimers", "cognitive decline", "memory loss", "vascular dementia", "lewy body dementia"],
    description: "Cognitive support, safe environment, medication adherence, caregiver supervision, and behavioral management.",
    tasks: [
      { title: "Administer cognitive medications", description: "Cholinesterase inhibitors (donepezil, rivastigmine) or memantine at exact prescribed times.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Morning orientation routine", description: "Review today's date, weather, and schedule with patient each morning to support orientation.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Structured daily activities", description: "Engage in familiar, meaningful activities (music, puzzles, photos). Routine reduces anxiety.", category: "SOCIAL", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Safety check (wandering prevention)", description: "Ensure door alarms, ID bracelet, and locked hazardous areas are in place.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Nutrition and hydration supervision", description: "Ensure adequate food and fluid intake. Patients with dementia may forget to eat or drink.", category: "MEAL", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Neurologist / geriatrician follow-up", description: "Regular follow-up for cognitive assessment and behavioral symptom management.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Sudden acute confusion worse than baseline (may indicate UTI, pain, medication side effect)", "Agitation or aggression", "Falls or wandering away from home", "Refusing food or water for >1 day"],
    monitoringNotes: ["MMSE or MoCA score tracking", "Behavior change log", "Sleep pattern monitoring"],
  },
  {
    id: "parkinsons",
    name: "Parkinson's Disease",
    keywords: ["parkinson", "parkinson's", "parkinsons", "parkinson's disease", "pd"],
    description: "Strict medication timing, fall prevention, speech therapy, and motor function maintenance.",
    tasks: [
      { title: "Administer Parkinson's medications (exact timing)", description: "Levodopa/carbidopa (Sinemet) and other PD medications must be given at EXACT times to prevent 'off' periods. Never skip or delay.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Fall prevention routine", description: "Clear pathways, use non-slip mats, use assistive devices. Supervise mobility when needed.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Balance and gait exercises", description: "Daily balance exercises and large-amplitude movements (LSVT BIG or similar program).", category: "EXERCISE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Loud voice exercises (LSVT LOUD)", description: "Vocalization exercises to maintain speech volume and clarity.", category: "OTHER", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Bowel and bladder management", description: "High-fiber diet and adequate hydration to prevent constipation (common in PD).", category: "MEAL", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Neurologist follow-up", description: "Regular review of motor function, medication adjustments, and non-motor symptoms.", category: "APPOINTMENT", priority: "HIGH", isRecurring: false },
    ],
    warnings: ["Sudden worsening of tremor or rigidity", "Hallucinations or confusion (may be medication side effect)", "Falls or near-falls", "Difficulty swallowing (aspiration risk)", "Sudden 'off' periods lasting longer than usual"],
    monitoringNotes: ["Track 'on/off' medication cycles", "Log falls and near-falls", "Monitor for dyskinesias"],
  },
  {
    id: "osteoporosis",
    name: "Osteoporosis",
    keywords: ["osteoporosis", "osteopenia", "low bone density", "bone loss"],
    description: "Calcium and Vitamin D supplementation, bone-strengthening exercises, and fall prevention to reduce fracture risk.",
    tasks: [
      { title: "Take calcium + Vitamin D supplement", description: "Calcium carbonate (with meals) or calcium citrate + Vitamin D3 as prescribed. Critical for bone health.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Take bisphosphonate or bone medication", description: "Take weekly or monthly bone-building medication exactly as prescribed (often requires sitting upright for 30 min after).", category: "MEDICATION", priority: "HIGH", isRecurring: false },
      { title: "Weight-bearing exercise", description: "30 minutes of weight-bearing activity (walking, stairs, standing) to stimulate bone density.", category: "EXERCISE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Balance training", description: "Tai chi, standing balance exercises to reduce fall risk and fracture prevention.", category: "EXERCISE", priority: "MEDIUM", isRecurring: true, recurrence: "daily" },
      { title: "Fall prevention home check", description: "Ensure adequate lighting, remove trip hazards, install grab bars in bathroom. Review medications that increase fall risk.", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: false },
      { title: "DEXA scan (bone density)", description: "Scheduled DEXA scan to monitor bone density response to treatment.", category: "APPOINTMENT", priority: "MEDIUM", isRecurring: false },
    ],
    warnings: ["Any fall — evaluate for fracture (hip, wrist, vertebra)", "Back pain after fall (possible vertebral compression fracture)", "Significant height loss"],
    dietNotes: ["Calcium-rich foods: dairy, leafy greens, fortified foods", "Vitamin D sources or supplements", "Limit alcohol and smoking"],
    monitoringNotes: ["DEXA scan every 1–2 years", "Annual bone turnover markers if on treatment"],
  },
  {
    id: "asthma",
    name: "Asthma",
    keywords: ["asthma", "reactive airway disease", "bronchial asthma"],
    description: "Inhaler adherence, trigger avoidance, and asthma action plan management.",
    tasks: [
      { title: "Use controller inhaler", description: "Daily inhaled corticosteroid (ICS) or combination inhaler as prescribed — even on good days.", category: "MEDICATION", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Use rescue inhaler as needed", description: "Short-acting beta-agonist (albuterol) for acute symptoms. If needed >2x/week, notify doctor.", category: "MEDICATION", priority: "URGENT", isRecurring: true, recurrence: "daily" },
      { title: "Peak flow monitoring", description: "Morning peak flow measurement to track lung function. Follow asthma action plan based on results.", category: "OTHER", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Trigger avoidance", description: "Avoid known asthma triggers: allergens, tobacco smoke, cold air, exercise-induced (pre-medicate if needed).", category: "PERSONAL_CARE", priority: "HIGH", isRecurring: true, recurrence: "daily" },
      { title: "Pulmonologist / allergist follow-up", description: "Regular review of asthma control and step-up/step-down therapy decisions.", category: "APPOINTMENT", priority: "MEDIUM", isRecurring: false },
    ],
    warnings: ["Rescue inhaler not helping after 2 puffs (call 911)", "Peak flow in red zone per action plan", "Inability to speak in full sentences due to breathlessness"],
    monitoringNotes: ["Peak flow diary", "Symptom diary", "Count rescue inhaler uses per week"],
  },
];

/**
 * Find matching condition protocols for a list of condition names.
 * Uses keyword matching for flexible detection.
 */
export function findProtocolsForConditions(conditionNames: string[]): ConditionProtocol[] {
  const matched: ConditionProtocol[] = [];
  const seenIds = new Set<string>();

  for (const conditionName of conditionNames) {
    const normalized = conditionName.toLowerCase().trim();
    for (const protocol of CONDITION_PROTOCOLS) {
      if (seenIds.has(protocol.id)) continue;
      const matches = protocol.keywords.some(
        (kw) => normalized.includes(kw) || kw.includes(normalized)
      );
      if (matches) {
        matched.push(protocol);
        seenIds.add(protocol.id);
      }
    }
  }

  return matched;
}

/**
 * Find a single protocol by its ID.
 */
export function getProtocolById(id: string): ConditionProtocol | undefined {
  return CONDITION_PROTOCOLS.find((p) => p.id === id);
}
