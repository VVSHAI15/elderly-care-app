import SwiftUI

struct MedicationsView: View {
    @StateObject private var vm = MedicationViewModel()
    let patientId: String

    var body: some View {
        Group {
            if vm.isLoading {
                ProgressView("Loading medications...")
            } else if vm.medications.isEmpty {
                ContentUnavailableView(
                    "No Medications",
                    systemImage: "pills.fill",
                    description: Text("Medications extracted from uploaded documents will appear here.")
                )
            } else {
                List {
                    if !vm.refillSoonMedications.isEmpty {
                        Section {
                            ForEach(vm.refillSoonMedications) { med in
                                MedicationRow(medication: med)
                            }
                        } header: {
                            Label("Refill Soon", systemImage: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                        }
                    }

                    Section("All Medications") {
                        ForEach(vm.medications) { med in
                            MedicationRow(medication: med)
                        }
                    }
                }
                .refreshable { await vm.load(patientId: patientId) }
            }
        }
        .navigationTitle("Medications")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load(patientId: patientId) }
        .overlay {
            if let err = vm.errorMessage {
                VStack {
                    Spacer()
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.white)
                        .padding()
                        .background(Color.red.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .padding()
                }
            }
        }
    }
}

// MARK: - Medication row

private struct MedicationRow: View {
    let medication: Medication

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(medication.name)
                        .font(.body.weight(.semibold))
                    if !medication.dosageAndFrequency.isEmpty {
                        Text(medication.dosageAndFrequency)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if medication.needsRefillSoon {
                    Label("Refill Soon", systemImage: "exclamationmark.circle.fill")
                        .font(.caption)
                        .foregroundStyle(.orange)
                        .labelStyle(.iconOnly)
                        .font(.title3)
                }
            }

            if let instructions = medication.instructions, !instructions.isEmpty {
                Text(instructions)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack {
                Label("Refill: \(medication.formattedRefillDate)", systemImage: "calendar")
                    .font(.caption)
                    .foregroundStyle(medication.needsRefillSoon ? .orange : .secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
