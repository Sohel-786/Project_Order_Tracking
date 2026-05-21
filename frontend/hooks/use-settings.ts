'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { AppSettings, UserPermission } from '@/types';

export function useAppSettings() {
  return useQuery({
    queryKey: ['settings', 'software'],
    queryFn: async (): Promise<AppSettings> => {
      const response = await api.get('/settings/software');
      return response.data.data;
    },
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<AppSettings>): Promise<AppSettings> => {
      const response = await api.patch('/settings/software', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Software settings saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<AppSettings> => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.post('/settings/software/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Logo updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    },
  });
}

export function useUserPermissions(userId?: number) {
  return useQuery({
    queryKey: ['settings', 'permissions', userId],
    queryFn: async (): Promise<{ permissions: UserPermission } | null> => {
      if (!userId) return null;
      const response = await api.get(`/settings/permissions/user/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

/** Current logged-in user's permissions. Drives Sidebar + per-page CRUD visibility. */
export function useCurrentUserPermissions(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'permissions', 'me'],
    queryFn: async (): Promise<UserPermission | null> => {
      const response = await api.get('/settings/permissions/me');
      return response.data.data ?? null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useUpdateUserPermissions(currentUserId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: Partial<UserPermission> }) => {
      const response = await api.put(`/settings/permissions/user/${userId}`, { permissions });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'permissions', variables.userId] });
      if (currentUserId !== undefined && variables.userId === currentUserId) {
        queryClient.invalidateQueries({ queryKey: ['settings', 'permissions', 'me'] });
      }
      toast.success('User permissions saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save permissions');
    },
  });
}
