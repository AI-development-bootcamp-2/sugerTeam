import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import type { Client, Project } from '../types/entities';

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
    mutationFn: async (payload: { name: string }) => {
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
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) => {
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
    mutationFn: async (payload: { clientId: string; name: string }) => {
      const { data } = await apiClient.post<Project>('/api/v1/projects', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['projects', 'active', variables.clientId] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch<Project>(`/api/v1/projects/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
