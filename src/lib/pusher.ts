import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Lazy initialization for server-side Pusher
let pusherServerInstance: PusherServer | null = null;

export const getPusherServer = (): PusherServer | null => {
  if (!pusherServerInstance && process.env.PUSHER_APP_ID) {
    pusherServerInstance = new PusherServer({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServerInstance;
};

// For backwards compatibility
export const pusherServer = {
  trigger: async (channel: string, event: string, data: unknown) => {
    const server = getPusherServer();
    if (server) {
      return server.trigger(channel, event, data);
    }
    console.warn("Pusher server not configured, skipping trigger");
    return Promise.resolve();
  },
};

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (
    !pusherClientInstance &&
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_PUSHER_KEY
  ) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClientInstance;
};

// Channel naming conventions
export const getPatientChannel = (patientId: string) => `patient-${patientId}`;
export const getUserChannel = (userId: string) => `user-${userId}`;
export const getFamilyChannel = (patientId: string) => `family-${patientId}`;

// Event types
export const PUSHER_EVENTS = {
  TASK_COMPLETED: "task-completed",
  TASK_CREATED: "task-created",
  TASK_UPDATED: "task-updated",
  TASK_REMINDER: "task-reminder",
  MEDICATION_ADDED: "medication-added",
  NOTIFICATION: "notification",
} as const;

export type PusherEventType = (typeof PUSHER_EVENTS)[keyof typeof PUSHER_EVENTS];
