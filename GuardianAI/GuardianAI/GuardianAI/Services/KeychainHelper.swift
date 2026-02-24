import Foundation
import Security

/// Thin wrapper around the iOS Keychain for secure string storage.
final class KeychainHelper {
    static let shared = KeychainHelper()
    private init() {}

    private let service = AppConfig.bundleID

    // MARK: - Public API

    func save(_ value: String, forKey key: String) {
        let data = Data(value.utf8)
        delete(forKey: key) // Remove any existing item first
        let attributes: [String: Any] = [
            kSecClass       as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData   as String: data,
        ]
        SecItemAdd(attributes as CFDictionary, nil)
    }

    func read(forKey key: String) -> String? {
        let query: [String: Any] = [
            kSecClass       as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData  as String: true,
            kSecMatchLimit  as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass       as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Keychain keys

extension KeychainHelper {
    static let sessionTokenKey = "session_token"
    static let patientIdKey    = "patient_id"
    static let userIdKey       = "user_id"
}
