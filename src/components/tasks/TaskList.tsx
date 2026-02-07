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
  assignedTo?: {
    id: string;
    name: string | null;
    role: string;
  };
  medication?: {
    name: string;
    dosage: string;
  };
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

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  MEDICATION: <Pill className="w-4 h-4" />,
  APPOINTMENT: <Calendar className="w-4 h-4" />,
  EXERCISE: <Dumbbell className="w-4 h-4" />,
  MEAL: <Utensils className="w-4 h-4" />,
  HYDRATION: <Droplets className="w-4 h-4" />,
  PERSONAL_CARE: <User className="w-4 h-4" />,
  SOCIAL: <Heart className="w-4 h-4" />,
  OTHER: <MoreHorizontal className="w-4 h-4" />,
};

const priorityColors: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

function getTimeStatus(task: Task): { label: string; isOverdue: boolean } | null {
  if (!task.dueDate || task.status === "COMPLETED") return null;

  const dueDate = new Date(task.dueDate);

  if (task.dueTime && isToday(dueDate)) {
    const [hours, minutes] = task.dueTime.split(":").map(Number);
    const dueDateTime = new Date(dueDate);
    dueDateTime.setHours(hours, minutes, 0, 0);

    if (isPast(dueDateTime)) {
      return {
        label: `Overdue by ${formatDistanceToNow(dueDateTime)}`,
        isOverdue: true,
      };
    }
    return {
      label: `Due in ${formatDistanceToNow(dueDateTime)}`,
      isOverdue: false,
    };
  }

  if (isPast(dueDate) && !isToday(dueDate)) {
    return {
      label: `Overdue by ${formatDistanceToNow(dueDate)}`,
      isOverdue: true,
    };
  }

  return null;
}

export function TaskList({ patientId, connections = [], onTaskComplete }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ patientId });
      if (filter !== "all") {
        params.append("status", filter === "pending" ? "PENDING" : "COMPLETED");
      }
      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? updatedTask : t))
        );
        if (newStatus === "COMPLETED") {
          onTaskComplete?.(updatedTask);
        }
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "completed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-700">
          No tasks found
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const timeStatus = getTimeStatus(task);
            const isOverdue = task.status === "OVERDUE" || timeStatus?.isOverdue;

            return (
              <div
                key={task.id}
                className={`
                  bg-white rounded-lg border p-4 flex items-start gap-3 transition-all
                  ${task.status === "COMPLETED" ? "opacity-60" : ""}
                  ${isOverdue ? "border-red-300 bg-red-50" : ""}
                  hover:shadow-md
                `}
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className="flex-shrink-0 mt-0.5"
                >
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className={`w-6 h-6 ${isOverdue ? "text-red-400 hover:text-red-600" : "text-gray-400 hover:text-blue-500"}`} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={isOverdue ? "text-red-500" : "text-gray-600"}>
                      {categoryIcons[task.category]}
                    </span>
                    <h3
                      className={`font-medium ${
                        task.status === "COMPLETED"
                          ? "line-through text-gray-500"
                          : isOverdue
                          ? "text-red-800"
                          : "text-gray-800"
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        OVERDUE
                      </span>
                    )}
                    {task.assignedTo && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {task.assignedTo.name || "Assigned"}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-700 mb-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {task.dueTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.dueTime}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                    {task.completedAt && (
                      <span className="text-green-600">
                        Completed {format(new Date(task.completedAt), "h:mm a")}
                      </span>
                    )}
                    {timeStatus && (
                      <span className={timeStatus.isOverdue ? "text-red-600 font-medium" : "text-blue-600"}>
                        {timeStatus.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit / Delete actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit task"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingTaskId(task.id)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          patientId={patientId}
          connections={connections}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={() => {
            setEditingTask(null);
            fetchTasks();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Task</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteTask(deletingTaskId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingTaskId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
