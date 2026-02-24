import Foundation

enum AppConfig {
    // Toggle between local dev and production.
    // In Xcode: Product > Scheme > Edit Scheme > Arguments > Add "-dev" to launch args,
    // or simply change isDebug to true/false manually while developing.
    #if DEBUG
    static let baseURL = "http://localhost:3000"
    #else
    static let baseURL = "https://your-app.vercel.app" // ← Replace with your Vercel URL
    #endif

    // Bundle identifier — must match your Xcode project setting exactly
    static let bundleID = "com.guardianai.app"

    // TestFlight versioning
    static let appVersion  = "1.0"
    static let buildNumber = "1"

    // NextAuth session cookie name (must match the web app's cookie)
    static let sessionCookieName = "next-auth.session-token"
}
