import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import type { Client, Project, ProjectWithRelations, Task, TaskWithProject, TaskWithAssignments } from '../types/entities';

export function useActiveClients() {
  return useQuery({
    queryKey: ['clients', 'active'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; name: string }[]>('/api/v1/clients/active');
      return data;
    },
  });
}

export function useAllClients() {
  return useQuery({
    queryKey: ['clients', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<Client[]>('/api/v1/clients');
      return data;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const { data } = await apiClient.post<Client>('/api/v1/clients', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch<Client>(`/api/v1/clients/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useActiveProjects(clientId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'active', clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; name: string; clientId: string }[]>(
        '/api/v1/projects/active',
        { params: { clientId } },
      );
      return data;
    },
    enabled: clientId !== undefined,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { clientId: string; name: string; description?: string; startDate?: string; endDate?: string }) => {
      const { data } = await apiClient.post<Project>('/api/v1/projects', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['projects', 'active', variables.clientId] });
      void queryClient.invalidateQueries({ queryKey: ['projects', 'byClient', variables.clientId] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string; isActive?: boolean; startDate?: string | null; endDate?: string | null }) => {
      const { data } = await apiClient.patch<Project>(`/api/v1/projects/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'byClient', clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectWithRelations[]>('/api/v1/projects', {
        params: { clientId },
      });
      return data;
    },
    enabled: clientId !== undefined,
  });
}

export function useAllProjects(clientId?: string) {
  return useQuery({
    queryKey: ['projects', 'all', clientId ?? null],
    queryFn: async () => {
      const params = clientId ? { clientId } : {};
      const { data } = await apiClient.get<ProjectWithRelations[]>('/api/v1/projects', { params });
      return data;
    },
  });
}

export function useTasksByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'byProject', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Task[]>('/api/v1/tasks', {
        params: { projectId },
      });
      return data;
    },
    enabled: projectId !== undefined,
  });
}

export function useAllTasksWithProject(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', 'all', projectId ?? null],
    queryFn: async () => {
      const params = projectId ? { projectId } : {};
      const { data } = await apiClient.get<TaskWithProject[]>('/api/v1/tasks', { params });
      return data;
    },
  });
}

export function useActiveTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'active', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; name: string; projectId: string }[]>(
        '/api/v1/tasks/active',
        { params: { projectId } },
      );
      return data;
    },
    enabled: projectId !== undefined,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { projectId: string; name: string; description?: string; startDate?: string; endDate?: string }) => {
      const { data } = await apiClient.post<Task>('/api/v1/tasks', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks', 'byProject', variables.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useTasksWithAssignments(projectId?: string) {
  return useQuery({
    queryKey: ['taskAssignments', projectId ?? null],
    queryFn: async () => {
      const params = projectId ? { projectId } : {};
      const { data } = await apiClient.get<TaskWithAssignments[]>('/api/v1/task-assignments', { params });
      return data;
    },
  });
}

export function useActiveUsers() {
  return useQuery({
    queryKey: ['activeUsers'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ id: string; fullName: string }[]>('/api/v1/task-assignments/employees');
      return data;
    },
  });
}

export function useSyncTaskAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, userIds }: { taskId: string; userIds: string[] }) => {
      await apiClient.patch(`/api/v1/task-assignments/tasks/${taskId}`, { userIds });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taskAssignments'] });
    },
  });
}

export function useRemoveTaskAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/api/v1/task-assignments/tasks/${taskId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['taskAssignments'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string; isActive?: boolean; startDate?: string | null; endDate?: string | null }) => {
      const { data } = await apiClient.patch<Task>(`/api/v1/tasks/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
