import SwiftUI
import WebKit

/// WKWebView wrapper that loads the web app's document scanner page.
/// The NextAuth session cookie is injected so the user is automatically
/// authenticated without a separate web login.
struct DocumentScannerView: View {
    let sessionToken: String
    @State private var isLoading = true

    private var scannerURL: URL {
        // Opens directly to the dashboard; the web app will show the Scan tab
        URL(string: "\(AppConfig.baseURL)/dashboard?tab=scan")!
    }

    var body: some View {
        ZStack {
            GuardianWebView(
                url: scannerURL,
                sessionToken: sessionToken,
                isLoading: $isLoading
            )
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading scanner...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemBackground))
            }
        }
        .navigationTitle("Scan Document")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - WKWebView representative

private struct GuardianWebView: UIViewRepresentable {
    let url:          URL
    let sessionToken: String
    @Binding var isLoading: Bool

    func makeCoordinator() -> Coordinator { Coordinator(isLoading: $isLoading) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Inject the NextAuth session cookie so existing backend routes see an
        // authenticated session automatically — no separate web login needed.
        let cookie = HTTPCookie(properties: [
            .name:    AppConfig.sessionCookieName,
            .value:   sessionToken,
            .domain:  URL(string: AppConfig.baseURL)?.host ?? "localhost",
            .path:    "/",
            .secure:  AppConfig.baseURL.hasPrefix("https") as AnyObject,
            .expires: Date().addingTimeInterval(30 * 24 * 3600) as AnyObject,
        ])

        if let cookie {
            config.websiteDataStore.httpCookieStore.setCookie(cookie)
        }

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            webView.load(URLRequest(url: url))
        }
    }

    // MARK: Coordinator

    class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var isLoading: Bool
        init(isLoading: Binding<Bool>) { _isLoading = isLoading }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation _: WKNavigation!) {
            isLoading = true
        }
        func webView(_ webView: WKWebView, didFinish _: WKNavigation!) {
            isLoading = false
        }
        func webView(_ webView: WKWebView, didFail _: WKNavigation!, withError _: Error) {
            isLoading = false
        }
    }
}
