import Foundation

final class AuthService {
    static let shared = AuthService()
    private init() {}

    // MARK: - Login

    func login(email: String, password: String) async throws -> MobileLoginResponse {
        struct Body: Encodable { let email, password: String }
        let response: MobileLoginResponse = try await NetworkManager.shared.post(
            "/api/auth/mobile-login",
            body: Body(email: email, password: password),
            requiresAuth: false
        )
        persistSession(response)
        return response
    }

    // MARK: - Register

    /// Registers a new user, then immediately logs in to obtain the session token.
    func register(name: String, email: String, password: String, role: String) async throws -> MobileLoginResponse {
        let body = RegisterRequest(name: name, email: email, password: password, role: role)
        // Register creates the user; ignore the plain user response
        let _: User = try await NetworkManager.shared.post(
            "/api/auth/register",
            body: body,
            requiresAuth: false
        )
        // Now log in to get the JWT
        return try await login(email: email, password: password)
    }

    // MARK: - Logout

    func logout() {
        NetworkManager.shared.sessionToken = nil
        KeychainHelper.shared.delete(forKey: KeychainHelper.patientIdKey)
        KeychainHelper.shared.delete(forKey: KeychainHelper.userIdKey)
    }

    // MARK: - Persistence helpers

    func persistSession(_ response: MobileLoginResponse) {
        KeychainHelper.shared.save(response.user.id, forKey: KeychainHelper.userIdKey)
        if let pid = response.patientId {
            KeychainHelper.shared.save(pid, forKey: KeychainHelper.patientIdKey)
        }
    }

    var storedPatientId: String? { KeychainHelper.shared.read(forKey: KeychainHelper.patientIdKey) }
    var storedUserId:    String? { KeychainHelper.shared.read(forKey: KeychainHelper.userIdKey) }
}
