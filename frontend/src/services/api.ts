import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { User } from '../types/auth';
import { useAuthStore } from '../store/authStore';
import router from '../router';

interface AuthRefreshResponse {
  accessToken: string;
  user: User;
}

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(token: string | null, err: unknown = null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token !== null) {
      resolve(token);
    } else {
      reject(err);
    }
  });
  pendingQueue = [];
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequest | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Auth endpoints (login/refresh) returning 401 means bad credentials or no session — bail immediately
    if (
      originalRequest.url?.includes('/auth/')
    ) {
      useAuthStore.getState().clearAuth();
      void router.navigate('/login');
      return Promise.reject(error);
    }

    // This request already retried once — give up
    if (originalRequest._retry) {
      useAuthStore.getState().clearAuth();
      void router.navigate('/login');
      return Promise.reject(error);
    }

    // Refresh already in flight — queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest._retry = true;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await apiClient.post<AuthRefreshResponse>('/api/v1/auth/refresh');
      useAuthStore.getState().setAuth(data.user, data.accessToken);
      processQueue(data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(null, refreshError);
      useAuthStore.getState().clearAuth();
      void router.navigate('/login');
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
