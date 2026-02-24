import Foundation

final class MedicationService {
    static let shared = MedicationService()
    private init() {}

    func getMedications(patientId: String) async throws -> [Medication] {
        return try await NetworkManager.shared.get("/api/medications?patientId=\(patientId)")
    }
}
