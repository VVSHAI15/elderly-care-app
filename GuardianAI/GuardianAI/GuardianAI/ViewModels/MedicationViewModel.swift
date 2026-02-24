import SwiftUI

@MainActor
final class MedicationViewModel: ObservableObject {
    @Published var medications:  [Medication] = []
    @Published var isLoading     = false
    @Published var errorMessage: String?

    func load(patientId: String) async {
        isLoading    = true
        errorMessage = nil
        do {
            medications = try await MedicationService.shared.getMedications(patientId: patientId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    var refillSoonMedications: [Medication] { medications.filter(\.needsRefillSoon) }
}
