import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import type { User, UserRole } from '../types/entities';

interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.role) params.role = filters.role;
      if (filters.isActive !== undefined) params.isActive = String(filters.isActive);
      if (filters.search) params.search = filters.search;
      const { data } = await apiClient.get<User[]>('/api/v1/users', { params });
      return data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      email: string;
      password: string;
      role: UserRole;
    }) => {
      const { data } = await apiClient.post<User>('/api/v1/users', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      fullName?: string;
      email?: string;
      role?: UserRole;
    }) => {
      const { data } = await apiClient.patch<User>(`/api/v1/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<User>(`/api/v1/users/${id}/deactivate`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<User>(`/api/v1/users/${id}/activate`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
