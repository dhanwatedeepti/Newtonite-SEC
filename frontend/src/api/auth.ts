import { apiClient, setCsrfToken } from './client';
import { User } from '../types';

export interface AuthResponse {
  user: User;
  csrf_token: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCsrfToken(res.csrf_token);
    return res;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setCsrfToken(null);
    }
  },

  getMe: async (): Promise<AuthResponse> => {
    const res = await apiClient<AuthResponse>('/api/v1/auth/me', { method: 'GET' });
    setCsrfToken(res.csrf_token);
    return res;
  },
};
