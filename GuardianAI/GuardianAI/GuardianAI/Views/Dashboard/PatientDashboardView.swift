import SwiftUI

/// Main dashboard for PATIENT role users.
/// Tab-based navigation: Tasks | Medications | Scan Document
struct PatientDashboardView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        TabView {
            // MARK: Tasks tab
            NavigationStack {
                TaskListView(patientId: patientId)
            }
            .tabItem { Label("Tasks", systemImage: "checklist") }

            // MARK: Medications tab
            NavigationStack {
                MedicationsView(patientId: patientId)
            }
            .tabItem { Label("Medications", systemImage: "pills.fill") }

            // MARK: Scan Document tab (WKWebView hybrid)
            NavigationStack {
                if let token = NetworkManager.shared.sessionToken {
                    DocumentScannerView(sessionToken: token)
                } else {
                    ContentUnavailableView("Not authenticated", systemImage: "lock")
                }
            }
            .tabItem { Label("Scan Doc", systemImage: "doc.viewfinder") }

            // MARK: Profile / Sign Out tab
            NavigationStack {
                ProfileView()
            }
            .tabItem { Label("Profile", systemImage: "person.circle") }
        }
        .accentColor(brandBlue)
    }

    private var patientId: String {
        authVM.patientId ?? ""
    }
}

// MARK: - Profile view

struct ProfileView: View {
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        List {
            Section {
                HStack(spacing: 16) {
                    Circle()
                        .fill(Color(red: 0.184, green: 0.373, blue: 0.624))
                        .frame(width: 56, height: 56)
                        .overlay(
                            Text(authVM.currentUser?.initials ?? "?")
                                .font(.title3.bold())
                                .foregroundStyle(.white)
                        )
                    VStack(alignment: .leading, spacing: 2) {
                        Text(authVM.currentUser?.displayName ?? "User")
                            .font(.headline)
                        Text(authVM.currentUser?.email ?? "")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text(authVM.currentUser?.role.rawValue.capitalized ?? "")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            }

            Section("App Info") {
                LabeledContent("Version", value: "\(AppConfig.appVersion) (\(AppConfig.buildNumber))")
                LabeledContent("Backend", value: AppConfig.baseURL)
            }

            Section {
                Button(role: .destructive) {
                    authVM.logout()
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("Profile")
    }
}
