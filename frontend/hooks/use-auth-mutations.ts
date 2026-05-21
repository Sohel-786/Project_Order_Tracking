'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { User } from '@/types';

interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        queryClient.setQueryData(['user'], data.user);
        toast.success('Login successful!');
        router.replace('/dashboard');
      }
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;
      const message = status === 401 ? 'Invalid username or password.' : (backendMessage || 'Login failed.');
      toast.error(message);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      queryClient.clear();
      toast.success('Logged out successfully');
      window.location.href = '/login';
    },
    onError: () => {
      localStorage.removeItem('user');
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}
