import SwiftUI

struct AddTaskView: View {
    @Environment(\.dismiss) private var dismiss
    let patientId: String
    let onCreated: () async -> Void

    @State private var title       = ""
    @State private var description = ""
    @State private var priority    = GuardianTask.TaskPriority.medium
    @State private var category    = GuardianTask.TaskCategory.other
    @State private var dueDate:    Date? = nil
    @State private var hasDueDate  = false
    @State private var isRecurring = false
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private let brandBlue = Color(red: 0.184, green: 0.373, blue: 0.624)
    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    var body: some View {
        NavigationStack {
            Form {
                // MARK: Basics
                Section("Task Details") {
                    TextField("Title", text: $title)
                        .font(.body)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .font(.body)
                        .lineLimit(3...)
                }

                // MARK: Category & Priority
                Section("Category & Priority") {
                    Picker("Category", selection: $category) {
                        ForEach(GuardianTask.TaskCategory.allCases, id: \.self) { c in
                            Label(c.displayName, systemImage: c.systemImage).tag(c)
                        }
                    }
                    Picker("Priority", selection: $priority) {
                        ForEach(GuardianTask.TaskPriority.allCases, id: \.self) { p in
                            Text(p.rawValue.capitalized).tag(p)
                        }
                    }
                }

                // MARK: Schedule
                Section("Schedule") {
                    Toggle("Set a due date", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker(
                            "Due Date",
                            selection: Binding(
                                get: { dueDate ?? Date() },
                                set: { dueDate = $0 }
                            ),
                            displayedComponents: .date
                        )
                    }
                    Toggle("Recurring task", isOn: $isRecurring)
                }

                // MARK: Error
                if let err = errorMessage {
                    Section {
                        Text(err).foregroundStyle(.red).font(.footnote)
                    }
                }
            }
            .navigationTitle("Add Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        Task { await submit() }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        errorMessage = nil
        do {
            let vm = TaskViewModel()
            try await vm.createTask(
                title:       title,
                description: description.isEmpty ? nil : description,
                dueDate:     dueDate.map { dateFormatter.string(from: $0) },
                dueTime:     nil,
                priority:    priority,
                category:    category,
                isRecurring: isRecurring,
                recurrence:  nil
            )
            await onCreated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
