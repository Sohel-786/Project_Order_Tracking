"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { User, Role } from "@/types";

export interface CreateUserData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  avatar?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
}

export type UpdateUserData = Partial<CreateUserData>;

export function useUsers(params?: { search?: string; activeOnly?: boolean; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async (): Promise<{ data: User[]; total: number }> => {
      const response = await api.get("/users", { params });
      return { data: response.data.data ?? [], total: response.data.totalCount ?? 0 };
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: async (): Promise<User> => {
      const response = await api.get(`/users/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<User> => {
      const response = await api.post("/users", data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to create user"),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserData }): Promise<User> => {
      const response = await api.put(`/users/${id}`, data);
      return response.data.data;
    },
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id === updatedUser.id) {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            window.dispatchEvent(new CustomEvent("currentUserUpdated", { detail: updatedUser }));
          }
        }
      } catch { /* ignore */ }
      toast.success("User updated successfully");
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to update user"),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => toast.error(error.response?.data?.message || "Failed to delete user"),
  });
}
