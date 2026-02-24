import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var email    = ""
    @State private var password = ""
    @State private var showRegister = false

    // Brand color matching the web app (#2f5f9f)
    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // MARK: Header
                    VStack(spacing: 8) {
                        Image(systemName: "heart.circle.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(brandBlue)
                        Text("guardian.ai")
                            .font(.largeTitle.bold())
                            .foregroundStyle(brandBlue)
                        Text("Care coordination for families")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.top, 48)

                    // MARK: Form card
                    VStack(spacing: 20) {
                        LabeledTextField(label: "Email", text: $email, keyboard: .emailAddress)
                        LabeledSecureField(label: "Password", text: $password)

                        if let err = authVM.errorMessage {
                            Text(err)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        Button(action: { Task { await authVM.login(email: email, password: password) } }) {
                            Group {
                                if authVM.isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Sign In")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(brandBlue)
                        .disabled(email.isEmpty || password.isEmpty || authVM.isLoading)
                    }
                    .padding(24)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.08), radius: 12, y: 4)

                    // MARK: Register link
                    Button("Don't have an account? Register") {
                        showRegister = true
                    }
                    .font(.subheadline)
                    .foregroundStyle(brandBlue)

                    Spacer()
                }
                .padding(.horizontal, 24)
            }
            .background(
                LinearGradient(
                    colors: [Color(red: 0.90, green: 0.95, blue: 1.0), Color(red: 0.93, green: 0.98, blue: 0.95)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            )
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
            }
        }
    }
}

// MARK: - Reusable form fields

struct LabeledTextField: View {
    let label: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            TextField(label, text: $text)
                .keyboardType(keyboard)
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .font(.body) // min 16pt — prevents iOS auto-zoom on focus
        }
    }
}

struct LabeledSecureField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            SecureField(label, text: $text)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .font(.body)
        }
    }
}
