"use client";

import { useState, useEffect, useCallback } from "react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  Pill,
  Calendar,
  Dumbbell,
  Utensils,
  Droplets,
  User,
  Heart,
  MoreHorizontal,
  AlertTriangle,
  Pencil,
  Trash2,
  UserCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EditTaskModal } from "./EditTaskModal";

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "OVERDUE";
type TaskCategory = "MEDICATION" | "APPOINTMENT" | "EXERCISE" | "MEAL" | "HYDRATION" | "PERSONAL_CARE" | "SOCIAL" | "OTHER";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: Priority;
  completedAt?: string;
  isRecurring?: boolean;
  recurrence?: string;
  assignedToId?: string;
  assignedTo?: { id: string; name: string | null; role: string };
  medication?: { name: string; dosage: string };
}

interface Connection {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface TaskListProps {
  patientId: string;
  connections?: Connection[];
  onTaskComplete?: (task: Task) => void;
}

// ── Category config ─────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  MEDICATION:    { label: "Medications",    icon: <Pill className="w-4 h-4" />,         bg: "bg-purple-50",  text: "text-purple-700", border: "border-purple-200" },
  APPOINTMENT:   { label: "Appointments",   icon: <Calendar className="w-4 h-4" />,     bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
  EXERCISE:      { label: "Exercise",       icon: <Dumbbell className="w-4 h-4" />,     bg: "bg-green-50",   text: "text-green-700",  border: "border-green-200" },
  MEAL:          { label: "Meals",          icon: <Utensils className="w-4 h-4" />,     bg: "bg-orange-50",  text: "text-orange-700", border: "border-orange-200" },
  HYDRATION:     { label: "Hydration",      icon: <Droplets className="w-4 h-4" />,     bg: "bg-cyan-50",    text: "text-cyan-700",   border: "border-cyan-200" },
  PERSONAL_CARE: { label: "Personal Care",  icon: <User className="w-4 h-4" />,         bg: "bg-pink-50",    text: "text-pink-700",   border: "border-pink-200" },
  SOCIAL:        { label: "Social",         icon: <Heart className="w-4 h-4" />,        bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200" },
  OTHER:         { label: "Other",          icon: <MoreHorizontal className="w-4 h-4" />, bg: "bg-gray-50",  text: "text-gray-600",   border: "border-gray-200" },
};

// Render order for categories (most critical first)
const CATEGORY_ORDER: TaskCategory[] = [
  "MEDICATION", "APPOINTMENT", "EXERCISE", "MEAL", "HYDRATION", "PERSONAL_CARE", "SOCIAL", "OTHER",
];

const PRIORITY_ORDER: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const PRIORITY_STYLES: Record<Priority, string> = {
  URGENT: "bg-red-100 text-red-800",
  HIGH:   "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW:    "bg-gray-100 text-gray-600",
};

function getTimeStatus(task: Task): { label: string; isOverdue: boolean } | null {
  if (!task.dueDate || task.status === "COMPLETED") return null;
  const dueDate = new Date(task.dueDate);
  if (task.dueTime && isToday(dueDate)) {
    const [hours, minutes] = task.dueTime.split(":").map(Number);
    const dueDateTime = new Date(dueDate);
    dueDateTime.setHours(hours, minutes, 0, 0);
    if (isPast(dueDateTime)) return { label: `Overdue by ${formatDistanceToNow(dueDateTime)}`, isOverdue: true };
    return { label: `Due in ${formatDistanceToNow(dueDateTime)}`, isOverdue: false };
  }
  if (isPast(dueDate) && !isToday(dueDate)) return { label: `Overdue by ${formatDistanceToNow(dueDate)}`, isOverdue: true };
  return null;
}

function isTaskOverdue(task: Task): boolean {
  return task.status === "OVERDUE" || (getTimeStatus(task)?.isOverdue ?? false);
}

// ── Single task card ─────────────────────────────────────────────────────────
function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const timeStatus = getTimeStatus(task);
  const overdue = isTaskOverdue(task);
  const done = task.status === "COMPLETED";

  return (
    <div
      className={`
        bg-white rounded-xl border-2 p-4 flex items-start gap-3 transition-all hover:shadow-sm
        ${done ? "opacity-55" : ""}
        ${overdue ? "border-red-200 bg-red-50/40" : "border-gray-100"}
      `}
    >
      <button onClick={onToggle} className="flex-shrink-0 pt-0.5">
        {done
          ? <CheckCircle2 className="w-6 h-6 text-green-500" />
          : <Circle className={`w-6 h-6 ${overdue ? "text-red-400 hover:text-red-600" : "text-gray-300 hover:text-[#2f5f9f]"} transition-colors`} />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-sm font-semibold ${done ? "line-through text-gray-400" : overdue ? "text-red-800" : "text-gray-900"}`}>
            {task.title}
          </span>
          {task.priority !== "MEDIUM" && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </span>
          )}
          {overdue && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />OVERDUE
            </span>
          )}
          {task.isRecurring && (
            <span className="text-xs text-gray-400 font-medium">↺ daily</span>
          )}
          {task.assignedTo && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 font-medium">
              <UserCheck className="w-3 h-3" />{task.assignedTo.name || "Assigned"}
            </span>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 leading-snug">{task.description}</p>
        )}

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          {task.dueTime && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.dueTime}</span>
          )}
          {task.dueDate && (
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(task.dueDate), "MMM d")}</span>
          )}
          {task.completedAt && (
            <span className="text-green-600 font-medium">
              ✓ {format(new Date(task.completedAt), "h:mm a")}
            </span>
          )}
          {timeStatus && !done && (
            <span className={`font-semibold ${timeStatus.isOverdue ? "text-red-600" : "text-[#2f5f9f]"}`}>
              {timeStatus.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#2f5f9f] hover:bg-blue-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Collapsible category section ─────────────────────────────────────────────
function CategorySection({
  category,
  tasks,
  defaultOpen,
  onToggle,
  onEdit,
  onDelete,
}: {
  category: TaskCategory;
  tasks: Task[];
  defaultOpen: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = CATEGORY_CONFIG[category];
  const doneCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const pendingCount = tasks.length - doneCount;

  return (
    <div className={`border-2 ${cfg.border} rounded-2xl overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${cfg.bg} transition-colors hover:brightness-95`}
      >
        <div className="flex items-center gap-2">
          <span className={cfg.text}>{cfg.icon}</span>
          <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {pendingCount} pending
          </span>
          {doneCount > 0 && (
            <span className="text-xs text-gray-500">{doneCount} done</span>
          )}
        </div>
        {open
          ? <ChevronDown className={`w-4 h-4 ${cfg.text}`} />
          : <ChevronRight className={`w-4 h-4 ${cfg.text}`} />
        }
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-white">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggle(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TaskList({ patientId, connections = [], onTaskComplete }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ patientId });
      // Fetch all statuses so we can group them client-side
      const response = await fetch(`/api/tasks?${params}`);
      const data: Task[] = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (response.ok) {
        const updated = await response.json();
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
        if (newStatus === "COMPLETED") onTaskComplete?.(updated);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (response.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2f5f9f]" />
      </div>
    );
  }

  // ── Derived lists ──────────────────────────────────────────────────────────
  const pending = tasks.filter((t) => t.status !== "COMPLETED");
  const completed = tasks.filter((t) => t.status === "COMPLETED");
  const viewTasks = filter === "completed" ? completed : filter === "all" ? tasks : pending;

  // For grouped view: separate overdue from normal pending
  const overdueTasks = pending
    .filter(isTaskOverdue)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const normalTasks = pending
    .filter((t) => !isTaskOverdue(t))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // Group normal pending by category
  const grouped: Partial<Record<TaskCategory, Task[]>> = {};
  for (const task of normalTasks) {
    if (!grouped[task.category]) grouped[task.category] = [];
    grouped[task.category]!.push(task);
  }
  const activeCategories = CATEGORY_ORDER.filter((c) => grouped[c]?.length);

  const totalPending = pending.length;
  const totalCompleted = completed.length;

  return (
    <div className="space-y-4">
      {/* Filter tabs + summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(["pending", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === f
                  ? "bg-[#2f5f9f] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {f === "pending" ? `Pending (${totalPending})` : f === "completed" ? `Completed (${totalCompleted})` : `All (${tasks.length})`}
            </button>
          ))}
        </div>
        {overdueTasks.length > 0 && filter === "pending" && (
          <span className="text-sm font-bold text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
            <AlertTriangle className="w-4 h-4" />
            {overdueTasks.length} overdue
          </span>
        )}
      </div>

      {viewTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {filter === "completed" ? "No completed tasks yet." : filter === "pending" ? "All caught up! Nothing pending." : "No tasks found."}
        </div>
      )}

      {/* ── Smart grouped view (pending / all) ── */}
      {filter !== "completed" && viewTasks.length > 0 && (
        <div className="space-y-3">
          {/* Overdue section — always expanded, shown first */}
          {overdueTasks.length > 0 && (
            <div className="border-2 border-red-300 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-bold text-red-800">Needs Attention — Overdue</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                  {overdueTasks.length}
                </span>
              </div>
              <div className="p-3 space-y-2 bg-white">
                {overdueTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTaskStatus(task)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => setDeletingTaskId(task.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category sections */}
          {activeCategories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              tasks={grouped[category]!}
              defaultOpen={category === "MEDICATION" || category === "APPOINTMENT"}
              onToggle={toggleTaskStatus}
              onEdit={setEditingTask}
              onDelete={setDeletingTaskId}
            />
          ))}

          {/* Completed tasks (collapsed at bottom when showing "all") */}
          {filter === "all" && completed.length > 0 && (
            <div className="border-2 border-green-200 rounded-2xl overflow-hidden">
              <details>
                <summary className="flex items-center gap-2 px-4 py-3 bg-green-50 cursor-pointer hover:brightness-95 list-none">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-800">Completed</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                    {completed.length}
                  </span>
                </summary>
                <div className="p-3 space-y-2 bg-white">
                  {completed.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTaskStatus(task)}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => setDeletingTaskId(task.id)}
                    />
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* ── Flat completed view ── */}
      {filter === "completed" && completed.length > 0 && (
        <div className="space-y-2">
          {completed.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleTaskStatus(task)}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeletingTaskId(task.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          patientId={patientId}
          connections={connections}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={() => { setEditingTask(null); fetchTasks(); }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Delete Task</h3>
            <p className="text-lg text-gray-700 mb-8">Are you sure? This cannot be undone.</p>
            <div className="flex gap-4">
              <button
                onClick={() => deleteTask(deletingTaskId)}
                className="flex-1 px-4 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-base"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingTaskId(null)}
                className="flex-1 px-4 py-3.5 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
