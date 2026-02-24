import Foundation
import SwiftUI

// MARK: - Task

struct GuardianTask: Codable, Identifiable {
    let id:          String
    let title:       String
    let description: String?
    let status:      TaskStatus
    let priority:    TaskPriority
    let category:    TaskCategory
    let patientId:   String
    let dueDate:     String?
    let dueTime:     String?
    let isRecurring: Bool
    let completedAt: String?
    let medication:  TaskMedication?
    let assignedTo:  TaskUser?

    // MARK: Status

    enum TaskStatus: String, Codable, CaseIterable {
        case pending    = "PENDING"
        case inProgress = "IN_PROGRESS"
        case completed  = "COMPLETED"
        case skipped    = "SKIPPED"
        case overdue    = "OVERDUE"

        var displayName: String {
            switch self {
            case .pending:    return "Pending"
            case .inProgress: return "In Progress"
            case .completed:  return "Completed"
            case .skipped:    return "Skipped"
            case .overdue:    return "Overdue"
            }
        }

        var color: Color {
            switch self {
            case .pending:    return .blue
            case .inProgress: return .orange
            case .completed:  return .green
            case .skipped:    return .gray
            case .overdue:    return .red
            }
        }

        var systemImage: String {
            switch self {
            case .pending:    return "clock"
            case .inProgress: return "arrow.triangle.2.circlepath"
            case .completed:  return "checkmark.circle.fill"
            case .skipped:    return "minus.circle"
            case .overdue:    return "exclamationmark.circle.fill"
            }
        }
    }

    // MARK: Priority

    enum TaskPriority: String, Codable, CaseIterable {
        case low    = "LOW"
        case medium = "MEDIUM"
        case high   = "HIGH"
        case urgent = "URGENT"

        var color: Color {
            switch self {
            case .low:    return .gray
            case .medium: return .blue
            case .high:   return .orange
            case .urgent: return .red
            }
        }
    }

    // MARK: Category

    enum TaskCategory: String, Codable, CaseIterable {
        case medication  = "MEDICATION"
        case appointment = "APPOINTMENT"
        case exercise    = "EXERCISE"
        case meal        = "MEAL"
        case hydration   = "HYDRATION"
        case personalCare = "PERSONAL_CARE"
        case social      = "SOCIAL"
        case other       = "OTHER"

        var displayName: String {
            switch self {
            case .medication:   return "Medication"
            case .appointment:  return "Appointment"
            case .exercise:     return "Exercise"
            case .meal:         return "Meal"
            case .hydration:    return "Hydration"
            case .personalCare: return "Personal Care"
            case .social:       return "Social"
            case .other:        return "Other"
            }
        }

        var systemImage: String {
            switch self {
            case .medication:   return "pills.fill"
            case .appointment:  return "calendar"
            case .exercise:     return "figure.walk"
            case .meal:         return "fork.knife"
            case .hydration:    return "drop.fill"
            case .personalCare: return "person.fill"
            case .social:       return "person.2.fill"
            case .other:        return "checkmark.circle"
            }
        }
    }

    // MARK: Computed

    var formattedDueDate: String {
        guard let ds = dueDate else { return "" }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withFullDate]
        guard let date = iso.date(from: String(ds.prefix(10))) else { return ds }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        return fmt.string(from: date)
    }

    var isPastDue: Bool {
        guard let ds = dueDate else { return false }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withFullDate]
        guard let date = iso.date(from: String(ds.prefix(10))) else { return false }
        return date < Calendar.current.startOfDay(for: Date())
    }
}

// MARK: - Nested types

struct TaskMedication: Codable, Identifiable {
    let id:     String
    let name:   String
    let dosage: String?
}

struct TaskUser: Codable, Identifiable {
    let id:   String
    let name: String?
    let role: String
}

// MARK: - Requests

struct CreateTaskRequest: Encodable {
    let patientId:   String
    let title:       String
    let description: String?
    let dueDate:     String?
    let dueTime:     String?
    let priority:    String
    let category:    String
    let isRecurring: Bool
    let recurrence:  String?
}

struct UpdateTaskStatusRequest: Encodable {
    let id:     String
    let status: String
}
