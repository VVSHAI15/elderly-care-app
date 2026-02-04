"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
} from "lucide-react";

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
  medication?: {
    name: string;
    dosage: string;
  };
}

interface TaskListProps {
  patientId: string;
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
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  URGENT: "bg-red-100 text-red-600",
};

export function TaskList({ patientId, onTaskComplete }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("pending");

  useEffect(() => {
    fetchTasks();
  }, [patientId, filter]);

  const fetchTasks = async () => {
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
  };

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
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks found
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`
                bg-white rounded-lg border p-4 flex items-start gap-3 transition-all
                ${task.status === "COMPLETED" ? "opacity-60" : ""}
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
                  <Circle className="w-6 h-6 text-gray-300 hover:text-blue-500" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400">
                    {categoryIcons[task.category]}
                  </span>
                  <h3
                    className={`font-medium ${
                      task.status === "COMPLETED"
                        ? "line-through text-gray-400"
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
                </div>

                {task.description && (
                  <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-400">
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
                    <span className="text-green-500">
                      Completed {format(new Date(task.completedAt), "h:mm a")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
