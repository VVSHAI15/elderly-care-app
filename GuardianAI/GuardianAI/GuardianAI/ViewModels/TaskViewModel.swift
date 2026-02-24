import SwiftUI

@MainActor
final class TaskViewModel: ObservableObject {
    @Published var tasks:        [GuardianTask] = []
    @Published var isLoading     = false
    @Published var errorMessage: String?
    @Published var statusFilter: GuardianTask.TaskStatus? = nil

    private var patientId: String = ""

    // MARK: - Load

    func load(patientId: String) async {
        self.patientId = patientId
        isLoading      = true
        errorMessage   = nil
        do {
            let statusParam = statusFilter?.rawValue
            tasks = try await TaskService.shared.getTasks(patientId: patientId, status: statusParam)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func reload() async {
        guard !patientId.isEmpty else { return }
        await load(patientId: patientId)
    }

    // MARK: - Create

    func createTask(
        title:       String,
        description: String?,
        dueDate:     String?,
        dueTime:     String?,
        priority:    GuardianTask.TaskPriority,
        category:    GuardianTask.TaskCategory,
        isRecurring: Bool,
        recurrence:  String?
    ) async throws {
        let req = CreateTaskRequest(
            patientId:   patientId,
            title:       title,
            description: description,
            dueDate:     dueDate,
            dueTime:     dueTime,
            priority:    priority.rawValue,
            category:    category.rawValue,
            isRecurring: isRecurring,
            recurrence:  recurrence
        )
        let newTask = try await TaskService.shared.createTask(req)
        tasks.insert(newTask, at: 0)
    }

    // MARK: - Update status

    func markCompleted(_ task: GuardianTask) async {
        await updateStatus(task, to: .completed)
    }

    func markSkipped(_ task: GuardianTask) async {
        await updateStatus(task, to: .skipped)
    }

    private func updateStatus(_ task: GuardianTask, to status: GuardianTask.TaskStatus) async {
        do {
            let updated = try await TaskService.shared.updateStatus(id: task.id, status: status.rawValue)
            if let idx = tasks.firstIndex(where: { $0.id == task.id }) {
                tasks[idx] = updated
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Delete

    func deleteTask(_ task: GuardianTask) async {
        do {
            try await TaskService.shared.deleteTask(id: task.id)
            tasks.removeAll { $0.id == task.id }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Filtered views

    var pendingTasks:   [GuardianTask] { tasks.filter { $0.status == .pending || $0.status == .overdue } }
    var completedTasks: [GuardianTask] { tasks.filter { $0.status == .completed } }
    var overdueTasks:   [GuardianTask] { tasks.filter { $0.status == .overdue } }
}
