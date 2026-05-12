import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import type { AxiosProgressEvent } from 'axios';
import { apiClient } from './api';
import type { AbsenceType, AbsenceStatus } from '../types/time-report';

export interface AbsenceDocumentDto {
  id: string;
  absenceReportId: string;
  fileName: string;
  mimeType: string;
  storagePath?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface AbsenceWithDocumentsDto {
  id: string;
  userId: string;
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  partialDurationHours: number | null;
  calculatedAbsenceDays: number;
  status: AbsenceStatus;
  documents?: AbsenceDocumentDto[];
  documentRequired?: boolean;
}

export interface CreateAbsencePayload {
  absenceType: AbsenceType;
  startDate: string;
  endDate: string;
  isPartial: boolean;
  partialDurationHours?: number | null;
}

export interface UpdateAbsencePayload {
  absenceType?: AbsenceType;
  startDate?: string;
  endDate?: string;
  isPartial?: boolean;
  partialDurationHours?: number | null;
}

export interface UploadedDocumentResponse {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

const ABSENCES_KEY = 'absences';

export function useAbsences(userId: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: [ABSENCES_KEY, userId, year, month],
    queryFn: async () => {
      const { data } = await apiClient.get<AbsenceWithDocumentsDto[]>('/api/v1/absences', {
        params: { userId, year, month },
      });
      return data;
    },
    enabled: !!userId,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAbsencePayload) => {
      const { data } = await apiClient.post<AbsenceWithDocumentsDto>('/api/v1/absences', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ABSENCES_KEY] });
    },
  });
}

export function useUpdateAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateAbsencePayload & { id: string }) => {
      const { data } = await apiClient.patch<AbsenceWithDocumentsDto>(
        `/api/v1/absences/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ABSENCES_KEY] });
    },
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/v1/absences/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ABSENCES_KEY] });
    },
  });
}

export interface UploadDocumentVars {
  absenceId: string;
  file: File;
  onProgress?: (percent: number) => void;
}

export function useUploadDocument(): UseMutationResult<
  UploadedDocumentResponse,
  unknown,
  UploadDocumentVars
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ absenceId, file, onProgress }: UploadDocumentVars) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<UploadedDocumentResponse>(
        `/api/v1/absences/${absenceId}/document`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event: AxiosProgressEvent) => {
            if (onProgress && event.total) {
              onProgress(Math.round((event.loaded / event.total) * 100));
            }
          },
        },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ABSENCES_KEY] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (absenceId: string) => {
      await apiClient.delete(`/api/v1/absences/${absenceId}/document`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ABSENCES_KEY] });
    },
  });
}
