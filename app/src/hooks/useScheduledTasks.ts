import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useChannel } from "./useChannel";

export interface ScheduledTask {
  id: string;
  title: string;
  description: string | null;
  action_type: "reminder" | "spawn" | "notify";
  payload: Record<string, unknown>;
  schedule: string | null;
  run_at: string | null;
  recurring: boolean;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_by: string;
  status: "pending" | "active" | "completed" | "failed";
  inserted_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  action_type: "reminder" | "spawn" | "notify";
  run_at?: string;
  schedule?: string;
  message?: string;
  prompt?: string;
  description?: string;
}

export interface UpdateTaskInput {
  title?: string;
  prompt?: string;
  description?: string;
  run_at?: string;
  schedule?: string;
  enabled?: boolean;
}

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { channel } = useChannel("dashboard");

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getScheduledTasks();
      setTasks(res.tasks as ScheduledTask[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen for real-time updates via dashboard channel
  useEffect(() => {
    if (!channel) return;

    const refs = [
      channel.on("scheduled_task:created", () => fetchTasks()),
      channel.on("scheduled_task:updated", () => fetchTasks()),
      channel.on("scheduled_task:deleted", () => fetchTasks()),
      channel.on("scheduled_task:executed", () => fetchTasks()),
      channel.on("scheduled_task:failed", () => fetchTasks()),
    ];

    return () => {
      refs.forEach((ref) => channel.off("scheduled_task:created", ref));
    };
  }, [channel, fetchTasks]);

  const createTask = useCallback(async (input: CreateTaskInput) => {
    const res = await api.createScheduledTask(input);
    await fetchTasks();
    return res;
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteScheduledTask(id);
    await fetchTasks();
  }, [fetchTasks]);

  const toggleTask = useCallback(async (id: string) => {
    await api.toggleScheduledTask(id);
    await fetchTasks();
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
    await api.updateScheduledTask(id, input);
    await fetchTasks();
  }, [fetchTasks]);

  const triggerTask = useCallback(async (id: string) => {
    await api.triggerScheduledTask(id);
    await fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, createTask, updateTask, deleteTask, toggleTask, triggerTask, refetch: fetchTasks };
}
