import SwiftUI

/// Root routing view. Decides whether to show the login screen or the
/// appropriate dashboard based on authentication state and user role.
struct ContentView: View {
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        Group {
            if authVM.isLoading {
                // Splash while checking stored session
                SplashView()
            } else if authVM.isAuthenticated {
                if authVM.currentUser?.isPatient == true {
                    PatientDashboardView()
                } else {
                    CaretakerDashboardView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authVM.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: authVM.isLoading)
    }
}

// MARK: - Splash

private struct SplashView: View {
    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(brandBlue)
            Text("guardian.ai")
                .font(.largeTitle.bold())
                .foregroundStyle(brandBlue)
            ProgressView()
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 0.90, green: 0.95, blue: 1.0), Color(red: 0.93, green: 0.98, blue: 0.95)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        )
    }
}
