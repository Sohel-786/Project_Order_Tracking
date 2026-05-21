import axios, { AxiosInstance } from "axios";
import { isLoginPathname } from "@/lib/route-utils";

const api: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const requestUrl: string | undefined = error.config?.url;
      const isLoginRequest =
        requestUrl?.includes("/auth/login") || requestUrl?.endsWith("/auth/login");
      const isValidateRequest =
        requestUrl?.includes("/auth/validate") || requestUrl?.endsWith("/auth/validate");

      if (
        !isLoginRequest &&
        !isValidateRequest &&
        typeof window !== "undefined" &&
        !isLoginPathname(window.location.pathname)
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
