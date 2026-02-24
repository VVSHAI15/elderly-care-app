import Foundation

struct Medication: Codable, Identifiable {
    let id:           String
    let name:         String
    let dosage:       String?
    let frequency:    String?
    let instructions: String?
    let startDate:    String?
    let endDate:      String?
    let refillDate:   String?
    let patientId:    String

    // MARK: Computed

    var needsRefillSoon: Bool {
        guard let refillStr = refillDate,
              let refillDate = parsedRefillDate else { return false }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: refillDate).day ?? Int.max
        return days >= 0 && days <= 7
    }

    var parsedRefillDate: Date? {
        guard let s = refillDate else { return nil }
        let iso = ISO8601DateFormatter()
        return iso.date(from: s)
    }

    var formattedRefillDate: String {
        guard let date = parsedRefillDate else { return "Not set" }
        let fmt = DateFormatter()
        fmt.dateStyle = .medium
        return fmt.string(from: date)
    }

    var dosageAndFrequency: String {
        [dosage, frequency].compactMap { $0 }.joined(separator: " · ")
    }
}
