import SwiftUI

/// Dashboard for FAMILY_MEMBER / CAREGIVER role users.
/// Shows connected patients and lets the carer tap through to view each.
struct CaretakerDashboardView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var connections:   [ConnectedPatient] = []
    @State private var selectedPatient: ConnectedPatient?
    @State private var isLoading       = false
    @State private var errorMessage:   String?

    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading patients...")
                } else if connections.isEmpty {
                    ContentUnavailableView(
                        "No Patients Connected",
                        systemImage: "person.2.slash",
                        description: Text("Ask a patient to share their invite code with you to connect.")
                    )
                } else {
                    List(connections) { patient in
                        Button {
                            selectedPatient = patient
                        } label: {
                            PatientCard(patient: patient)
                        }
                        .buttonStyle(.plain)
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    .listStyle(.plain)
                    .refreshable { await loadConnections() }
                }
            }
            .navigationTitle("My Patients")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    ProfileMenuButton()
                }
            }
            // Navigate to patient detail when selected
            .navigationDestination(item: $selectedPatient) { patient in
                PatientDetailView(patient: patient)
            }
        }
        .task { await loadConnections() }
    }

    private func loadConnections() async {
        isLoading    = true
        errorMessage = nil
        do {
            let resp: ConnectionsResponse = try await NetworkManager.shared.get("/api/patients/connections")
            connections = resp.connections
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Patient card

private struct PatientCard: View {
    let patient: ConnectedPatient
    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        HStack(spacing: 14) {
            Circle()
                .fill(brandBlue.opacity(0.15))
                .frame(width: 50, height: 50)
                .overlay(
                    Text(patient.displayName.prefix(2).uppercased())
                        .font(.headline)
                        .foregroundStyle(brandBlue)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(patient.displayName)
                    .font(.body.weight(.semibold))
                if let email = patient.email {
                    Text(email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }
}

// MARK: - Patient detail (caregiver view of a specific patient)

struct PatientDetailView: View {
    let patient: ConnectedPatient
    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        TabView {
            NavigationStack {
                TaskListView(patientId: patient.patientId)
            }
            .tabItem { Label("Tasks", systemImage: "checklist") }

            NavigationStack {
                MedicationsView(patientId: patient.patientId)
            }
            .tabItem { Label("Medications", systemImage: "pills.fill") }

            NavigationStack {
                if let token = NetworkManager.shared.sessionToken {
                    DocumentScannerView(sessionToken: token)
                } else {
                    ContentUnavailableView("Not authenticated", systemImage: "lock")
                }
            }
            .tabItem { Label("Scan Doc", systemImage: "doc.viewfinder") }
        }
        .accentColor(brandBlue)
        .navigationTitle(patient.displayName)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Profile menu button (toolbar)

private struct ProfileMenuButton: View {
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        Menu {
            Text(authVM.currentUser?.displayName ?? "User")
            Divider()
            Button(role: .destructive) {
                authVM.logout()
            } label: {
                Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
            }
        } label: {
            Circle()
                .fill(Color(red: 0.184, green: 0.373, blue: 0.624))
                .frame(width: 34, height: 34)
                .overlay(
                    Text(authVM.currentUser?.initials ?? "?")
                        .font(.caption.bold())
                        .foregroundStyle(.white)
                )
        }
    }
}
