import Foundation

// MARK: - API Errors

enum APIError: Error, LocalizedError {
    case invalidURL
    case noToken
    case networkError(String)
    case decodingError(String)
    case serverError(Int, String)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:             return "Invalid URL"
        case .noToken:                return "Not authenticated. Please log in."
        case .networkError(let msg):  return msg
        case .decodingError(let msg): return "Data parse error: \(msg)"
        case .serverError(let code, let msg): return "Server error \(code): \(msg)"
        case .unauthorized:           return "Session expired. Please log in again."
        }
    }
}

// MARK: - Network Manager

/// Centralised HTTP client. Sends NextAuth session JWT as a cookie so all
/// existing backend routes (which use getServerSession) work without changes.
final class NetworkManager {
    static let shared = NetworkManager()
    private init() {}

    private let baseURL = AppConfig.baseURL
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    // MARK: Token management

    var sessionToken: String? {
        get { KeychainHelper.shared.read(forKey: KeychainHelper.sessionTokenKey) }
        set {
            if let t = newValue {
                KeychainHelper.shared.save(t, forKey: KeychainHelper.sessionTokenKey)
            } else {
                KeychainHelper.shared.delete(forKey: KeychainHelper.sessionTokenKey)
            }
        }
    }

    // MARK: - Core request

    private func makeRequest(
        path: String,
        method: String,
        body: Data? = nil,
        requiresAuth: Bool = true
    ) throws -> URLRequest {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let body { request.httpBody = body }

        if requiresAuth {
            guard let token = sessionToken else { throw APIError.noToken }
            // Send as the NextAuth session cookie — existing routes validate this automatically
            request.setValue(
                "\(AppConfig.sessionCookieName)=\(token)",
                forHTTPHeaderField: "Cookie"
            )
        }
        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError("No HTTP response")
        }
        switch http.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        default:
            let msg = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.serverError(http.statusCode, msg)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error.localizedDescription)
        }
    }

    // MARK: - Public helpers

    func get<T: Decodable>(_ path: String, requiresAuth: Bool = true) async throws -> T {
        let req = try makeRequest(path: path, method: "GET", requiresAuth: requiresAuth)
        return try await execute(req)
    }

    func post<T: Decodable>(_ path: String, body: some Encodable, requiresAuth: Bool = true) async throws -> T {
        let data = try JSONEncoder().encode(body)
        let req  = try makeRequest(path: path, method: "POST", body: data, requiresAuth: requiresAuth)
        return try await execute(req)
    }

    func patch<T: Decodable>(_ path: String, body: some Encodable) async throws -> T {
        let data = try JSONEncoder().encode(body)
        let req  = try makeRequest(path: path, method: "PATCH", body: data)
        return try await execute(req)
    }

    /// DELETE with no decoded response body
    func delete(_ path: String) async throws {
        let req = try makeRequest(path: path, method: "DELETE")
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.networkError("Delete failed")
        }
    }
}
