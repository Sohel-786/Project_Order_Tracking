"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { applyPrimaryColor } from "@/lib/theme";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * Theme provider:
 *  - Dark / light via next-themes
 *  - Reads PrimaryColor from /settings/software and applies as CSS variables
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    const updatePrimaryColor = () => {
      api.get('/settings/software').then(res => {
        const color = res.data?.data?.primaryColor;
        applyPrimaryColor(color || "#0d6efd");
      }).catch(() => applyPrimaryColor("#0d6efd"));
    };
    updatePrimaryColor();
    window.addEventListener("appSettingsUpdated", updatePrimaryColor);
    return () => window.removeEventListener("appSettingsUpdated", updatePrimaryColor);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      storageKey="pot-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
