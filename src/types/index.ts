// User types
export type Role = "PATIENT" | "FAMILY_MEMBER" | "CAREGIVER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// Patient types
export interface Patient {
  id: string;
  userId: string;
  user: User;
  dateOfBirth?: Date;
  medicalNotes?: string;
  emergencyContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Task types
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "OVERDUE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskCategory =
  | "MEDICATION"
  | "APPOINTMENT"
  | "EXERCISE"
  | "MEAL"
  | "HYDRATION"
  | "PERSONAL_CARE"
  | "SOCIAL"
  | "OTHER";

export interface Task {
  id: string;
  patientId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  dueTime?: string;
  isRecurring: boolean;
  recurrence?: string;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  completedAt?: Date;
  medicationId?: string;
  medication?: Medication;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name?: string;
    role: Role;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Medication types
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  startDate: Date;
  endDate?: Date;
  prescriber?: string;
  pharmacy?: string;
  refillDate?: Date;
  isActive: boolean;
  documentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Document types
export type DocumentType =
  | "DISCHARGE_SUMMARY"
  | "PRESCRIPTION"
  | "LAB_RESULTS"
  | "INSURANCE"
  | "OTHER";

export interface Document {
  id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  rawText?: string;
  processedData?: Record<string, unknown>;
  summary?: string;
  documentType: DocumentType;
  uploadedAt: Date;
  processedAt?: Date;
  uploadedById?: string;
  uploadedBy?: {
    id: string;
    name?: string;
    role: Role;
  };
}

// Notification types
export type NotificationType =
  | "TASK_REMINDER"
  | "TASK_COMPLETED"
  | "TASK_OVERDUE"
  | "MEDICATION_REFILL"
  | "APPOINTMENT_REMINDER"
  | "SYSTEM";

export interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  task?: Task;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  emailSent: boolean;
  pushSent: boolean;
}

// API Response types
export interface ApiError {
  error: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
