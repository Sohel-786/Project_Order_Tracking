"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useLogin } from "@/hooks/use-auth-mutations";
import { useAppSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Eye, EyeOff, Building2 } from "lucide-react";
import { applyPrimaryColor } from "@/lib/theme";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const { data: appSettings } = useAppSettings();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { applyPrimaryColor(appSettings?.primaryColor || "#0d6efd"); }, [appSettings?.primaryColor]);

  const softwareName = appSettings?.softwareName?.trim() || "Project Order Tracking";
  const companyName = appSettings?.companyName?.trim() || "";
  const logoUrl = appSettings?.logoUrl
    ? (appSettings.logoUrl.startsWith("http") ? appSettings.logoUrl : appSettings.logoUrl)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginForm) => {
    if (loginMutation.isPending) return;
    loginMutation.mutate(data);
  };

  return (
    <div className="login-page min-h-screen h-dvh w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-50)] via-[var(--primary-100)] to-[var(--primary-200)]" />
        <div className="absolute -top-32 -left-32 w-[60vmin] h-[60vmin] rounded-full bg-[var(--primary-300)] opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[70vmin] h-[70vmin] rounded-full bg-[var(--primary-400)] opacity-25 blur-3xl" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] mx-4"
      >
        <div className="rounded-2xl shadow-xl shadow-black/10 bg-white/95 backdrop-blur-md border border-white/60 p-8 sm:p-10">
          <div className="flex flex-col items-center justify-center gap-4 mb-8 text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={softwareName} className="h-20 w-auto shrink-0 object-contain" />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-xl flex items-center justify-center bg-primary shadow-lg shadow-primary/25">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="w-full">
              {companyName && <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{companyName}</p>}
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{softwareName}</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-text">Username</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                  className="pl-12 h-12 rounded-xl border-secondary-200 bg-secondary-50/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>
              {errors.username && (<p className="text-sm text-red-600 mt-1">{errors.username.message}</p>)}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-text">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className="pl-12 pr-12 h-12 rounded-xl border-secondary-200 bg-secondary-50/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (<EyeOff className="w-5 h-5" />) : (<Eye className="w-5 h-5" />)}
                </button>
              </div>
              {errors.password && (<p className="text-sm text-red-600 mt-1">{errors.password.message}</p>)}
            </div>

            <motion.div
              className="pt-1"
              whileHover={loginMutation.isPending ? {} : { scale: 1.01 }}
              whileTap={loginMutation.isPending ? {} : { scale: 0.99 }}
            >
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </motion.div>

            {loginMutation.isError && (
              <p className="text-sm text-red-600 text-center pt-1">
                {(loginMutation.error as { response?: { status?: number; data?: { message?: string } } })?.response?.status === 401
                  ? "Invalid username or password. Please verify your credentials and try again."
                  : (loginMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                  ?? "Unable to sign you in at the moment. Please try again."}
              </p>
            )}
          </form>
        </div>
      </motion.section>
    </div>
  );
}
