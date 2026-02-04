"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { getPusherClient, PUSHER_EVENTS } from "@/lib/pusher";
import { format } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sentAt: string;
}

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications();

    // Subscribe to real-time notifications
    const pusher = getPusherClient();
    if (pusher) {
      const channel = pusher.subscribe(`user-${userId}`);

      channel.bind(PUSHER_EVENTS.NOTIFICATION, (data: Notification) => {
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show browser notification if permitted
        if (Notification.permission === "granted") {
          new Notification(data.title, {
            body: data.message,
            icon: "/icon.png",
          });
        }
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isRead: true }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds, isRead: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm">
                          {notification.title}
                        </p>
                        <p className="text-gray-600 text-sm truncate">
                          {notification.message}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {format(new Date(notification.sentAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
