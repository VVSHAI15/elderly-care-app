export interface DischargeInfo {
  hospital: string;
  diagnosis: string;
  mrn: string;
  admissionDate: string;
  dischargeDate: string;
  attendingPhysician: string;
  followUpPhysician: string;
}

export interface ExercisePhase {
  period: string;
  instructions: string;
}

export interface ExerciseGuidelines {
  phases: ExercisePhase[];
  restrictions: string[];
}

export interface DietItem {
  category: string;
  instruction: string;
}

export interface DietRestrictions {
  items: DietItem[];
}

export interface WarningSigns {
  emergency: string[];
  callDoctor: string[];
}

export interface CareContact {
  name: string;
  phone: string;
  hours: string;
}

export interface FollowUpAppointment {
  priority: string;
  type: string;
  timeframe: string;
  physician: string;
  reason: string;
}

export interface Allergy {
  substance: string;
  reaction: string;
  severity?: string; // "Mild" | "Moderate" | "Severe"
}

export interface AllergyList {
  items: Allergy[];
}

export interface Condition {
  name: string;
  status?: string; // "Active" | "Managed" | "Resolved"
  notes?: string;
}

export interface ConditionList {
  items: Condition[];
}

export interface HealthEvent {
  event: string;
  date?: string;
  notes?: string;
}

export interface HealthHistory {
  items: HealthEvent[];
}

export interface IllnessEvent {
  illness: string;
  date?: string;
  notes?: string;
}

export interface IllnessHistory {
  items: IllnessEvent[];
}

export interface CareProfile {
  dischargeInfo?: DischargeInfo | null;
  exerciseGuidelines?: ExerciseGuidelines | null;
  dietRestrictions?: DietRestrictions | null;
  warningSigns?: WarningSigns | null;
  careContacts?: CareContact[] | null;
  followUpAppointments?: FollowUpAppointment[] | null;
  allergies?: AllergyList | null;
  conditions?: ConditionList | null;
  healthHistory?: HealthHistory | null;
  illnessHistory?: IllnessHistory | null;
}
