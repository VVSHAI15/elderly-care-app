import SwiftUI

struct RegisterView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var name     = ""
    @State private var email    = ""
    @State private var password = ""
    @State private var confirm  = ""
    @State private var role     = "PATIENT"

    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)
    private let roles = [
        ("PATIENT",       "I am the patient",          "person.fill"),
        ("FAMILY_MEMBER", "I am a family member",      "person.2.fill"),
        ("CAREGIVER",     "I am a professional carer", "cross.case.fill"),
    ]

    private var canSubmit: Bool {
        !name.isEmpty && !email.isEmpty && password.count >= 6 && password == confirm
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                // MARK: Role picker
                VStack(alignment: .leading, spacing: 12) {
                    Text("I am...")
                        .font(.headline)
                    ForEach(roles, id: \.0) { (value, label, icon) in
                        RoleOptionRow(
                            icon: icon,
                            label: label,
                            isSelected: role == value
                        ) { role = value }
                    }
                }

                // MARK: Form
                VStack(spacing: 16) {
                    LabeledTextField(label: "Full Name", text: $name)
                    LabeledTextField(label: "Email",     text: $email, keyboard: .emailAddress)
                    LabeledSecureField(label: "Password (min 6 chars)", text: $password)
                    LabeledSecureField(label: "Confirm Password",        text: $confirm)

                    if !confirm.isEmpty && password != confirm {
                        Text("Passwords do not match")
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    if let err = authVM.errorMessage {
                        Text(err)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button(action: {
                        Task { await authVM.register(name: name, email: email, password: password, role: role) }
                    }) {
                        Group {
                            if authVM.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Create Account")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(brandBlue)
                    .disabled(!canSubmit || authVM.isLoading)
                }
                .padding(24)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.08), radius: 12, y: 4)

                Button("Already have an account? Sign in") { dismiss() }
                    .font(.subheadline)
                    .foregroundStyle(brandBlue)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 32)
        }
        .navigationTitle("Create Account")
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

// MARK: - Role option row

private struct RoleOptionRow: View {
    let icon:       String
    let label:      String
    let isSelected: Bool
    let action:     () -> Void

    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(isSelected ? .white : brandBlue)
                    .frame(width: 36)
                Text(label)
                    .font(.body)
                    .foregroundStyle(isSelected ? .white : .primary)
                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? .white : .secondary)
            }
            .padding(16)
            .background(isSelected ? brandBlue : Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}
