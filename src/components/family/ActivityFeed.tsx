"use client";

import { CheckCircle2, FileText } from "lucide-react";

interface FeedItem {
  type: string;
  label: string;
  date: string;
  category: string;
}

interface Props {
  items: FeedItem[];
}

export function ActivityFeed({ items }: Props) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            item.type === "task_completed" ? "bg-green-100" : "bg-blue-100"
          }`}>
            {item.type === "task_completed" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-snug">{item.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric" })}
              {" · "}
              {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
