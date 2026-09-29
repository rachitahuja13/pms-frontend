import axios, { type AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types';

// Points at the backend on the office LAN. Set VITE_API_BASE_URL at build time
// (see .env.example) to your server's internal address, e.g.
// https://pms.internal.yourcompany.com/api
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pms_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pms_token');
      localStorage.removeItem('pms_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError?.response?.data?.message || fallback;
}
