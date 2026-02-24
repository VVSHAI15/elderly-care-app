import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading       = true
    @Published var currentUser:  User?
    @Published var patientId:    String?
    @Published var errorMessage: String?

    init() {
        Task { await checkExistingSession() }
    }

    // MARK: - Session check on launch

    private func checkExistingSession() async {
        guard NetworkManager.shared.sessionToken != nil else {
            isLoading = false
            return
        }
        // Validate the stored token by fetching the user's patient profile
        do {
            // For PATIENT: /api/patients/me returns their profile
            // For CAREGIVER: it may return nil, which is fine
            struct MeResponse: Codable {
                let id:     String?
                let userId: String?
                let user:   User?
            }
            let me: MeResponse? = try? await NetworkManager.shared.get("/api/patients/me")
            if let me {
                patientId   = me.id
                currentUser = me.user
                if let pid = me.id {
                    KeychainHelper.shared.save(pid, forKey: KeychainHelper.patientIdKey)
                }
            } else {
                // Caregiver — no patient profile; restore from keychain
                patientId = AuthService.shared.storedPatientId
            }

            // Restore user from keychain role if needed
            if currentUser == nil, let uid = AuthService.shared.storedUserId {
                // Minimal user stub until a /api/users/me endpoint exists
                currentUser = User(
                    id:    uid,
                    email: "",
                    name:  nil,
                    role:  patientId != nil ? .patient : .caregiver
                )
            }
            isAuthenticated = true
        } catch {
            // Token is expired or invalid
            AuthService.shared.logout()
        }
        isLoading = false
    }

    // MARK: - Login

    func login(email: String, password: String) async {
        isLoading    = true
        errorMessage = nil
        do {
            let response  = try await AuthService.shared.login(email: email, password: password)
            currentUser   = response.user
            patientId     = response.patientId
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Register

    func register(name: String, email: String, password: String, role: String) async {
        isLoading    = true
        errorMessage = nil
        do {
            let response  = try await AuthService.shared.register(
                name: name, email: email, password: password, role: role
            )
            currentUser   = response.user
            patientId     = response.patientId
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Logout

    func logout() {
        AuthService.shared.logout()
        currentUser     = nil
        patientId       = nil
        isAuthenticated = false
    }
}
