import SwiftUI

struct TaskListView: View {
    @StateObject private var vm = TaskViewModel()
    let patientId: String

    @State private var showAddTask = false
    @State private var selectedFilter: FilterTab = .pending

    enum FilterTab: String, CaseIterable {
        case pending   = "Active"
        case completed = "Done"
        case all       = "All"
    }

    var filteredTasks: [GuardianTask] {
        switch selectedFilter {
        case .pending:   return vm.pendingTasks
        case .completed: return vm.completedTasks
        case .all:       return vm.tasks
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filter tabs
            Picker("Filter", selection: $selectedFilter) {
                ForEach(FilterTab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            if vm.isLoading {
                Spacer()
                ProgressView("Loading tasks...")
                Spacer()
            } else if filteredTasks.isEmpty {
                Spacer()
                ContentUnavailableView(
                    "No tasks",
                    systemImage: "checklist",
                    description: Text("Tap + to add a new task")
                )
                Spacer()
            } else {
                List {
                    ForEach(filteredTasks) { task in
                        TaskRowView(task: task) {
                            Task { await vm.markCompleted(task) }
                        }
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                Task { await vm.deleteTask(task) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                            Button {
                                Task { await vm.markSkipped(task) }
                            } label: {
                                Label("Skip", systemImage: "minus.circle")
                            }
                            .tint(.orange)
                        }
                    }
                }
                .listStyle(.plain)
                .refreshable { await vm.load(patientId: patientId) }
            }

            if let err = vm.errorMessage {
                Text(err)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .padding()
            }
        }
        .navigationTitle("Today's Tasks")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showAddTask = true } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                }
            }
        }
        .sheet(isPresented: $showAddTask) {
            AddTaskView(patientId: patientId) { await vm.reload() }
        }
        .task { await vm.load(patientId: patientId) }
    }
}

// MARK: - Task row

struct TaskRowView: View {
    let task:      GuardianTask
    let onComplete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            // Complete button (44pt touch target for elderly accessibility)
            Button(action: onComplete) {
                Image(systemName: task.status == .completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 26))
                    .foregroundStyle(task.status.color)
            }
            .frame(width: 44, height: 44)
            .disabled(task.status == .completed || task.status == .skipped)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(task.title)
                        .font(.body.weight(.semibold))
                        .strikethrough(task.status == .completed)
                        .foregroundStyle(task.status == .completed ? .secondary : .primary)
                    Spacer()
                    PriorityBadge(priority: task.priority)
                }

                if let desc = task.description, !desc.isEmpty {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 8) {
                    Label(task.category.displayName, systemImage: task.category.systemImage)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if !task.formattedDueDate.isEmpty {
                        Text("·")
                            .foregroundStyle(.secondary)
                        Image(systemName: "clock")
                            .font(.caption)
                        Text(task.formattedDueDate)
                            .font(.caption)
                    }
                }
                .foregroundStyle(task.isPastDue && task.status != .completed ? .red : .secondary)
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }
}

// MARK: - Priority badge

private struct PriorityBadge: View {
    let priority: GuardianTask.TaskPriority
    var body: some View {
        Text(priority.rawValue.capitalized)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(priority.color.opacity(0.15))
            .foregroundStyle(priority.color)
            .clipShape(Capsule())
    }
}
