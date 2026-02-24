import Foundation

final class TaskService {
    static let shared = TaskService()
    private init() {}

    func getTasks(patientId: String, status: String? = nil) async throws -> [GuardianTask] {
        var path = "/api/tasks?patientId=\(patientId)"
        if let status { path += "&status=\(status)" }
        return try await NetworkManager.shared.get(path)
    }

    func createTask(_ task: CreateTaskRequest) async throws -> GuardianTask {
        return try await NetworkManager.shared.post("/api/tasks", body: task)
    }

    func updateStatus(id: String, status: String) async throws -> GuardianTask {
        let body = UpdateTaskStatusRequest(id: id, status: status)
        return try await NetworkManager.shared.patch("/api/tasks", body: body)
    }

    func deleteTask(id: String) async throws {
        try await NetworkManager.shared.delete("/api/tasks?id=\(id)")
    }
}
