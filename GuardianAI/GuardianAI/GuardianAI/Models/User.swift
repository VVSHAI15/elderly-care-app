import Foundation

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let role: UserRole

    enum UserRole: String, Codable {
        case patient      = "PATIENT"
        case familyMember = "FAMILY_MEMBER"
        case caregiver    = "CAREGIVER"
        case admin        = "ADMIN"
    }

    var isPatient:   Bool { role == .patient }
    var isCaregiver: Bool { role == .caregiver || role == .familyMember }

    var displayName: String { name ?? email }
    var initials: String {
        guard let n = name else { return email.prefix(2).uppercased() }
        let parts = n.split(separator: " ")
        return parts.prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
    }
}

// MARK: - API response models

struct MobileLoginResponse: Codable {
    let token:     String
    let user:      User
    let patientId: String?
}

struct RegisterRequest: Encodable {
    let name:     String
    let email:    String
    let password: String
    let role:     String
}

// MARK: - Connected patient (for caregivers)

struct ConnectedPatient: Codable, Identifiable {
    let patientId: String
    let userId:    String
    let name:      String?
    let email:     String?

    var id: String { patientId }
    var displayName: String { name ?? email ?? "Unknown" }
}

struct ConnectionsResponse: Codable {
    let type:        String          // "patient" or "caregiver"
    let connections: [ConnectedPatient]
}
