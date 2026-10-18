import { apiClient } from './client';
import { Task, TaskListResponse, AuditEvent, TaskType, TaskPriority, TaskStatus } from '../types';

export interface TaskQueryParams {
  search?: string;
  status?: string;
  priority?: string;
  team_id?: string;
  assignee_id?: string;
  page?: number;
  page_size?: number;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  team_id: string;
  assignee_id?: string | null;
  due_date?: string | null;
}

export interface TaskUpdatePayload {
  version: number; // Required for optimistic concurrency control!
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee_id?: string | null;
  due_date?: string | null;
}

export const tasksApi = {
  getTasks: async (params: TaskQueryParams = {}): Promise<TaskListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.status) searchParams.set('status', params.status);
    if (params.priority) searchParams.set('priority', params.priority);
    if (params.team_id) searchParams.set('team_id', params.team_id);
    if (params.assignee_id) searchParams.set('assignee_id', params.assignee_id);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.page_size) searchParams.set('page_size', params.page_size.toString());

    const qs = searchParams.toString();
    return apiClient<TaskListResponse>(`/api/v1/tasks${qs ? `?${qs}` : ''}`);
  },

  getTask: async (id: string): Promise<Task> => {
    return apiClient<Task>(`/api/v1/tasks/${id}`);
  },

  createTask: async (payload: TaskCreatePayload, idempotencyKey?: string): Promise<Task> => {
    return apiClient<Task>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  },

  updateTask: async (id: string, payload: TaskUpdatePayload): Promise<Task> => {
    return apiClient<Task>(`/api/v1/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getTaskActivity: async (id: string): Promise<AuditEvent[]> => {
    return apiClient<AuditEvent[]>(`/api/v1/tasks/${id}/activity`);
  },
};
