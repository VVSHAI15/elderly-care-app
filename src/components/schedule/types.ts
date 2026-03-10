export type ShiftStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RequestType = "DAY_OFF" | "COVER_REQUEST" | "SWAP_REQUEST";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";

export interface ScheduledShift {
  id: string;
  caregiverId: string;
  patientId: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  notes?: string | null;
  createdAt: string;
  caregiver: { id: string; name: string | null; email: string };
  patient: { id: string; user: { name: string | null } };
}

export interface ShiftRequest {
  id: string;
  requesterId: string;
  type: RequestType;
  status: RequestStatus;
  requestDate?: string | null;
  message?: string | null;
  adminNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  requester: { id: string; name: string | null; email: string };
  coveredBy?: { id: string; name: string | null; email: string } | null;
  scheduledShift?: {
    id: string;
    startTime: string;
    endTime: string;
    patient: { id: string; user: { name: string | null } };
  } | null;
  offeredShift?: {
    id: string;
    startTime: string;
    endTime: string;
    patient: { id: string; user: { name: string | null } };
  } | null;
}
