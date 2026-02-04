"use client";

import { useEffect, useState } from "react";
import { getPusherClient, PUSHER_EVENTS, getPatientChannel, getFamilyChannel } from "@/lib/pusher";
import type { Channel } from "pusher-js";

interface TaskUpdate {
  id: string;
  title: string;
  status: string;
  completedAt?: string;
}

interface UsePatientUpdatesOptions {
  patientId: string;
  onTaskCompleted?: (task: TaskUpdate) => void;
  onTaskCreated?: (task: TaskUpdate) => void;
  onTaskUpdated?: (task: TaskUpdate) => void;
}

export function usePatientUpdates({
  patientId,
  onTaskCompleted,
  onTaskCreated,
  onTaskUpdated,
}: UsePatientUpdatesOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel: Channel = pusher.subscribe(getPatientChannel(patientId));

    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    channel.bind(PUSHER_EVENTS.TASK_COMPLETED, (data: TaskUpdate) => {
      onTaskCompleted?.(data);
    });

    channel.bind(PUSHER_EVENTS.TASK_CREATED, (data: TaskUpdate) => {
      onTaskCreated?.(data);
    });

    channel.bind(PUSHER_EVENTS.TASK_UPDATED, (data: TaskUpdate) => {
      onTaskUpdated?.(data);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [patientId, onTaskCompleted, onTaskCreated, onTaskUpdated]);

  return { isConnected };
}

interface UseFamilyUpdatesOptions {
  patientId: string;
  onTaskCompleted?: (data: {
    taskId: string;
    taskTitle: string;
    completedAt: string;
    patientName: string;
  }) => void;
}

export function useFamilyUpdates({
  patientId,
  onTaskCompleted,
}: UseFamilyUpdatesOptions) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel: Channel = pusher.subscribe(getFamilyChannel(patientId));

    channel.bind("pusher:subscription_succeeded", () => {
      setIsConnected(true);
    });

    channel.bind(PUSHER_EVENTS.TASK_COMPLETED, (data: {
      taskId: string;
      taskTitle: string;
      completedAt: string;
      patientName: string;
    }) => {
      onTaskCompleted?.(data);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [patientId, onTaskCompleted]);

  return { isConnected };
}
