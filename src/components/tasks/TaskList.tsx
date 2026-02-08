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
  MEDICATION: <Pill className="w-6 h-6" />,
  APPOINTMENT: <Calendar className="w-6 h-6" />,
  EXERCISE: <Dumbbell className="w-6 h-6" />,
  MEAL: <Utensils className="w-6 h-6" />,
  HYDRATION: <Droplets className="w-6 h-6" />,
  PERSONAL_CARE: <User className="w-6 h-6" />,
  SOCIAL: <Heart className="w-6 h-6" />,
  OTHER: <MoreHorizontal className="w-6 h-6" />,
};

const priorityColors: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800",
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
      const data: Task[] = await response.json();
      // Sort overdue tasks to the top
      data.sort((a, b) => {
        const aOverdue = a.status === "OVERDUE" || (getTimeStatus(a)?.isOverdue ?? false);
        const bOverdue = b.status === "OVERDUE" || (getTimeStatus(b)?.isOverdue ?? false);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        return 0;
      });
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        {(["pending", "completed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2.5 rounded-full text-base font-semibold transition-colors ${
              filter === f
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-lg text-gray-700">
          No tasks found
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const timeStatus = getTimeStatus(task);
            const isOverdue = task.status === "OVERDUE" || timeStatus?.isOverdue;

            return (
              <div
                key={task.id}
                className={`
                  bg-white rounded-xl border-2 p-5 flex items-start gap-4 transition-all
                  ${task.status === "COMPLETED" ? "opacity-60" : ""}
                  ${isOverdue ? "border-red-300 bg-red-50" : "border-gray-200"}
                  hover:shadow-md
                `}
              >
                <button
                  onClick={() => toggleTaskStatus(task)}
                  className="flex-shrink-0 p-2 -m-2"
                >
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <Circle className={`w-8 h-8 ${isOverdue ? "text-red-400 hover:text-red-600" : "text-gray-400 hover:text-blue-500"}`} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={isOverdue ? "text-red-500" : "text-gray-600"}>
                      {categoryIcons[task.category]}
                    </span>
                    <h3
                      className={`text-lg font-semibold ${
                        task.status === "COMPLETED"
                          ? "line-through text-gray-500"
                          : isOverdue
                          ? "text-red-800"
                          : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    {isOverdue && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        OVERDUE
                      </span>
                    )}
                    {task.assignedTo && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        {task.assignedTo.name || "Assigned"}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-base text-gray-700 mb-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-5 text-base text-gray-700">
                    {task.dueTime && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-5 h-5" />
                        {task.dueTime}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-5 h-5" />
                        {format(new Date(task.dueDate), "MMM d")}
                      </span>
                    )}
                    {task.completedAt && (
                      <span className="text-green-700 font-medium">
                        Completed {format(new Date(task.completedAt), "h:mm a")}
                      </span>
                    )}
                    {timeStatus && (
                      <span className={`font-semibold ${timeStatus.isOverdue ? "text-red-600" : "text-blue-600"}`}>
                        {timeStatus.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit / Delete actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingTask(task)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:text-blue-700 hover:bg-blue-50 transition-colors font-medium text-sm"
                  >
                    <Pencil className="w-5 h-5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => setDeletingTaskId(task.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:text-red-700 hover:bg-red-50 transition-colors font-medium text-sm"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="hidden sm:inline">Delete</span>
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
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Delete Task</h3>
            <p className="text-lg text-gray-700 mb-8">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
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
